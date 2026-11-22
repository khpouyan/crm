// prisma/seed.ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, PlanTier } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ALL_PERMISSION_KEYS } from "../lib/permissions";

const poolConnectionString = process.env.DATABASE_URL;
if (!poolConnectionString) {
  throw new Error("متغیر محیطی DATABASE_URL تنظیم نشده است.");
}

const adapter = new PrismaPg({ connectionString: poolConnectionString });
const prisma = new PrismaClient({ adapter });

async function seedPlans() {
  const plans: Array<{
    tier: PlanTier;
    title: string;
    monthlyPrice: number;
    yearlyPrice: number;
    maxStaff: number;
    canExportData: boolean;
  }> = [
    {
      tier: PlanTier.FREE,
      title: "پلن رایگان",
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxStaff: 2,
      canExportData: false,
    },
    {
      tier: PlanTier.OFFICE,
      title: "پلن مطب",
      monthlyPrice: 1_500_000,
      yearlyPrice: 15_000_000,
      maxStaff: 5,
      canExportData: true,
    },
    {
      tier: PlanTier.CLINIC,
      title: "پلن کلینیک",
      monthlyPrice: 3_500_000,
      yearlyPrice: 35_000_000,
      maxStaff: 50,
      canExportData: true,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { tier: plan.tier },
      update: {
        title: plan.title,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        maxStaff: plan.maxStaff,
        canExportData: plan.canExportData,
      },
      create: {
        tier: plan.tier,
        title: plan.title,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        maxStaff: plan.maxStaff,
        canExportData: plan.canExportData,
      },
    });
  }
}

async function seedSuperAdmin() {
  const fullName = "پویان خیراندیش";
  const phone = "09120085105";
  const nationalId = "0520743563";
  const hashedPassword = await bcrypt.hash("Po2224332", 10);

  // اگر کاربری با همین کد ملی وجود داشت و شماره متفاوتی داشت، به‌روزرسانی امن انجام شود
  const existingByNationalId = await prisma.user.findUnique({
    where: { nationalId },
  });

  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      fullName,
      password: hashedPassword,
      nationalId:
        existingByNationalId && existingByNationalId.phone !== phone
          ? undefined
          : nationalId,
    },
    create: {
      phone,
      fullName,
      password: hashedPassword,
      nationalId: existingByNationalId ? null : nationalId,
    },
  });

  const existingAdmin = await prisma.systemAdmin.findFirst({
    where: { userId: user.id },
  });

  if (!existingAdmin) {
    await prisma.systemAdmin.create({
      data: {
        userId: user.id,
        level: "SUPER_ADMIN",
      },
    });
  }

  return user;
}

async function seedAramaClinic() {
  const clinicName = "آراما کلینیک";
  const subdomain = "arama-clinic";
  const ownerFullName = "نرگس کوششی";
  const ownerPhone = "09185005195";
  const ownerNationalId = "3920426770";
  const hashedPassword = await bcrypt.hash("@$Nn1373", 10);

  const clinicPlan = await prisma.subscriptionPlan.findUnique({
    where: { tier: PlanTier.CLINIC },
  });

  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  const clinic = await prisma.clinic.upsert({
    where: { subdomain },
    update: {
      name: clinicName,
      currentPlan: PlanTier.CLINIC,
      planExpiresAt: oneYearLater,
    },
    create: {
      name: clinicName,
      subdomain,
      currentPlan: PlanTier.CLINIC,
      planExpiresAt: oneYearLater,
      smsBalance: 500,
    },
  });

  // چون شماره 09120085105 در User یکتاست و قبلاً توسط سوپر ادمین استفاده شده،
  // برای کاربر نرگس کوششی در صورت وجود کاربر پیشین روی همان شماره، اطلاعات را همگام می‌کنیم
  const existingUserByPhone = await prisma.user.findUnique({
    where: { phone: ownerPhone },
  });

  const existingUserByNationalId = await prisma.user.findUnique({
    where: { nationalId: ownerNationalId },
  });

  const ownerUser = existingUserByPhone
    ? await prisma.user.update({
        where: { id: existingUserByPhone.id },
        data: {
          fullName: ownerFullName,
          password: hashedPassword,
          nationalId:
            existingUserByNationalId &&
            existingUserByNationalId.id !== existingUserByPhone.id
              ? existingUserByPhone.nationalId
              : ownerNationalId,
        },
      })
    : await prisma.user.create({
        data: {
          phone: ownerPhone,
          fullName: ownerFullName,
          password: hashedPassword,
          nationalId: existingUserByNationalId ? null : ownerNationalId,
        },
      });

  const existingOwnerRole = await prisma.clinicRole.findFirst({
    where: { clinicId: clinic.id, name: "مدیر کلینیک" },
  });

  const ownerRole = existingOwnerRole
    ? await prisma.clinicRole.update({
        where: { id: existingOwnerRole.id },
        data: {
          permissions: ALL_PERMISSION_KEYS,
        },
      })
    : await prisma.clinicRole.create({
        data: {
          clinicId: clinic.id,
          name: "مدیر کلینیک",
          permissions: ALL_PERMISSION_KEYS,
        },
      });

  await prisma.clinicUser.upsert({
    where: {
      userId_clinicId: {
        userId: ownerUser.id,
        clinicId: clinic.id,
      },
    },
    update: {
      roleId: ownerRole.id,
      jobTitle: "مدیر کلینیک",
      isOwner: true,
      isActive: true,
      canLogin: true,
      deletedAt: null,
      hasAllServicesAccess: true,
      permissions: ALL_PERMISSION_KEYS,
    },
    create: {
      userId: ownerUser.id,
      clinicId: clinic.id,
      roleId: ownerRole.id,
      jobTitle: "مدیر کلینیک",
      isOwner: true,
      isActive: true,
      canLogin: true,
      hasAllServicesAccess: true,
      permissions: ALL_PERMISSION_KEYS,
    },
  });

  await prisma.clinicSmsSetting.upsert({
    where: { clinicId: clinic.id },
    update: {},
    create: {
      clinicId: clinic.id,
    },
  });

  if (clinicPlan) {
    const existingSub = await prisma.clinicSubscription.findFirst({
      where: {
        clinicId: clinic.id,
        planId: clinicPlan.id,
        status: "ACTIVE",
      },
    });

    if (!existingSub) {
      await prisma.clinicSubscription.create({
        data: {
          clinicId: clinic.id,
          planId: clinicPlan.id,
          startDate: now,
          endDate: oneYearLater,
          paidAmount: clinicPlan.yearlyPrice,
          paymentRef: "SEED-INITIAL-CLINIC",
          status: "ACTIVE",
        },
      });
    }
  }
}

async function main() {
  await seedPlans();
  await seedSuperAdmin();
  await seedAramaClinic();
  console.log("Seed با موفقیت انجام شد (سوپر ادمین + آراما کلینیک).");
}

main()
  .catch((err) => {
    console.error("خطا در اجرای Seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });