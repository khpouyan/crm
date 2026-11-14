// prisma/seed.ts
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, PlanTier, AddonModuleType, TicketStatus, TicketPriority } from '@prisma/client'

// راه‌اندازی اتصال دیتابیس مطابق استاندارد Prisma 7
const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })


// prisma/seed.ts

import bcrypt from "bcryptjs";
import crypto from "crypto";


async function main() {
  console.log("🌱 شروع عملیات سید کردن دیتابیس...");

  // 1. هش کردن رمزهای عبور با bcrypt
  const adminPasswordHash = await bcrypt.hash("@$Po2224332", 10);
  const clinicOwnerPasswordHash = await bcrypt.hash("@$Nn1373", 10);
  const defaultStaffPasswordHash = await bcrypt.hash("123456", 10);

  // ==========================================
  // 2. ساخت پلن‌های اشتراک و ماژول‌های پلتفرم
  // ==========================================
  const clinicPlan = await prisma.subscriptionPlan.upsert({
    where: { tier: PlanTier.CLINIC },
    update: {},
    create: {
      tier: PlanTier.CLINIC,
      title: "پلن کلینیک حرفه‌ای",
      monthlyPrice: 1500000,
      yearlyPrice: 15000000,
      maxStaff: 20,
      features: ["مدیریت نامحدود خدمات", "انبارداری پیشرفته", "پنل پیامک اختصاصی", "گزارش‌گیری مالی"],
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { tier: PlanTier.FREE },
    update: {},
    create: {
      tier: PlanTier.FREE,
      title: "پلن رایگان",
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxStaff: 2,
      features: ["نوبت‌دهی پایه", "تا ۵۰ پرونده کلاینت"],
    },
  });

  const smsAddon = await prisma.platformAddon.create({
    data: {
      code: AddonModuleType.SMS_PACKAGE,
      title: "بسته ۱۰۰۰ پیامک خدماتی",
      price: 250000,
      smsCount: 1000,
      description: "شارژ پیامک برای ارسال یادآور نوبت و مراقبت‌های پس از درمان",
    },
  });

  // ==========================================
  // 3. ساخت سوپر ادمین (پویان خیراندیش)
  // ==========================================
  const superAdminUser = await prisma.user.create({
    data: {
      fullName: "پویان خیراندیش",
      phone: "09120085105",
      password: adminPasswordHash,
      systemAdmins: {
        create: {
          level: "SUPER_ADMIN",
        },
      },
    },
  });
  console.log("✅ سوپرادمین ساخته شد:", superAdminUser.fullName);

  // ==========================================
  // 4. ساخت کلینیک آراما و مدیر کلینیک (نرگس کوششی)
  // ==========================================
  const nargesUser = await prisma.user.create({
    data: {
      fullName: "نرگس کوششی",
      phone: "09185005195",
      password: clinicOwnerPasswordHash,
    },
  });

  const aramaClinic = await prisma.clinic.create({
    data: {
      name: "آراما کلینیک",
      subdomain: "arama",
      currentPlan: PlanTier.CLINIC,
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      smsBalance: 1050,
      smsSetting: {
        create: {
          appointmentBooked: true,
          appointmentReminder: true,
          serviceRegistered: true,
          paymentReceived: true,
        },
      },
      subscriptions: {
        create: {
          planId: clinicPlan.id,
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          paidAmount: 15000000,
          paymentRef: `REF-${crypto.randomInt(100000, 999999)}`,
          status: "ACTIVE",
        },
      },
      purchasedAddons: {
        create: {
          addonId: smsAddon.id,
          paidAmount: 250000,
          isActive: true,
        },
      },
    },
  });

  // نقش‌های کلینیک
  const ownerRole = await prisma.clinicRole.create({
    data: {
      clinicId: aramaClinic.id,
      name: "مدیر کلینیک",
      permissions: ["ALL"],
    },
  });

  const operatorRole = await prisma.clinicRole.create({
    data: {
      clinicId: aramaClinic.id,
      name: "اپراتور لیزر",
      permissions: ["SERVICES_VIEW", "CLIENTS_VIEW", "APPOINTMENTS_MANAGE"],
    },
  });

  const nargesClinicUser = await prisma.clinicUser.create({
    data: {
      userId: nargesUser.id,
      clinicId: aramaClinic.id,
      roleId: ownerRole.id,
      isActive: true,
    },
  });

  // ==========================================
  // 5. ساخت پرسنل کلینیک (هدی کوششی)
  // ==========================================
  const hodaUser = await prisma.user.create({
    data: {
      fullName: "هدی کوششی",
      phone: "09185005196",
      nationalId: "0123456789",
      password: defaultStaffPasswordHash,
    },
  });

  const hodaClinicUser = await prisma.clinicUser.create({
    data: {
      userId: hodaUser.id,
      clinicId: aramaClinic.id,
      roleId: operatorRole.id,
      isActive: true,
    },
  });
  console.log("✅ کلینیک آراما و پرسنل ساخته شدند.");

  // ==========================================
  // 6. ساخت ۳ کلاینت رندوم
  // ==========================================
  const clientsData = [
    { fullName: "مریم رضایی", phone: "09121112233", wallet: 500000 },
    { fullName: "سارا محمدی", phone: "09124445566", wallet: 0 },
    { fullName: "نگین کریمی", phone: "09127778899", wallet: 1200000 },
  ];

  const createdClients = [];
  for (const c of clientsData) {
    const u = await prisma.user.create({
      data: {
        fullName: c.fullName,
        phone: c.phone,
      },
    });
    const client = await prisma.client.create({
      data: {
        userId: u.id,
        clinicId: aramaClinic.id,
        walletBalance: c.wallet,
      },
    });
    createdClients.push({ user: u, client });
  }
  console.log("✅ ۳ کلاینت نمونه ساخته شدند.");

  // ==========================================
  // 7. انبارداری و اقلام مصرفی کلینیک
  // ==========================================
  const bedSheetProduct = await prisma.clinicProduct.create({
    data: {
      clinicId: aramaClinic.id,
      name: "روتختی یکبار مصرف رولی",
      code: "PRD-101",
      unit: "عدد",
      alertThreshold: 20,
      batches: {
        create: {
          quantity: 150,
          purchasePrice: 12000,
          sellingPrice: 15000,
        },
      },
    },
  });

  const laserGelProduct = await prisma.clinicProduct.create({
    data: {
      clinicId: aramaClinic.id,
      name: "ژل اولتراسوند لیزر",
      code: "PRD-102",
      unit: "گرم",
      alertThreshold: 500,
      batches: {
        create: {
          quantity: 5000,
          purchasePrice: 50,
          sellingPrice: 80,
        },
      },
    },
  });

  // ==========================================
  // 8. خدمات و زیرسرویس‌ها (متصل به هدی و نرگس)
  // ==========================================
  const laserService = await prisma.service.create({
    data: {
      clinicId: aramaClinic.id,
      title: "لیزر موهای زائد",
      assignedStaff: {
        connect: [{ id: nargesClinicUser.id }, { id: hodaClinicUser.id }],
      },
      subServices: {
        create: [
          {
            title: "توتال بادی",
            price: 1200000,
            attributes: [
              { key: "دستگاه", value: "الکساندرایت کندلا" },
              { key: "مدت زمان", value: "۶۰ دقیقه" },
            ],
            defaultProducts: {
              create: [
                { clinicProductId: bedSheetProduct.id, quantity: 1 },
                { clinicProductId: laserGelProduct.id, quantity: 50 },
              ],
            },
          },
          {
            title: "فول بادی کاربردی",
            price: 850000,
            attributes: [
              { key: "دستگاه", value: "الکساندرایت کندلا" },
              { key: "نواحی", value: "دست کامل، پا کامل، بیکینی، زیربغل" },
            ],
            defaultProducts: {
              create: [{ clinicProductId: bedSheetProduct.id, quantity: 1 }],
            },
          },
        ],
      },
    },
    include: { subServices: true },
  });

  const facialService = await prisma.service.create({
    data: {
      clinicId: aramaClinic.id,
      title: "فیشال و پاکسازی پوست",
      assignedStaff: {
        connect: [{ id: nargesClinicUser.id }],
      },
      subServices: {
        create: [
          {
            title: "فیشال کلاسیک و آبرسانی",
            price: 950000,
            attributes: [{ key: "برند مواد", value: "تگودر اسپانیا" }],
            defaultProducts: {
              create: [{ clinicProductId: bedSheetProduct.id, quantity: 1 }],
            },
          },
        ],
      },
    },
    include: { subServices: true },
  });

  // ==========================================
  // 9. حساب بانکی، کارتخوان، پرونده و فاکتور
  // ==========================================
  const bankAccount = await prisma.clinicBankAccount.create({
    data: {
      clinicId: aramaClinic.id,
      bankName: "بانک ملت",
      accountNumber: "6104337812345678",
      ownerName: "نرگس کوششی",
    },
  });

  const posTerminal = await prisma.paymentTerminal.create({
    data: {
      clinicId: aramaClinic.id,
      bankAccountId: bankAccount.id,
      name: "کارتخوان پذیرش طبقه اول",
      type: "POS",
    },
  });

  // ثبت فاکتور و خدمت انجام‌شده برای کلاینت اول (مریم رضایی)
  const totalBodySub = laserService.subServices[0];
  const invoice1 = await prisma.invoice.create({
    data: {
      clinicId: aramaClinic.id,
      clientId: createdClients[0].client.id,
      subTotalAmount: 1200000,
      discountAmount: 100000,
      discountReason: "تخفیف جلسه اول",
      totalAmount: 1100000,
      paidAmount: 1100000,
      status: "PAID",
      providedServices: {
        create: {
          clientId: createdClients[0].client.id,
          subServiceId: totalBodySub.id,
          therapistId: hodaClinicUser.id,
          therapistNameSnapshot: "هدی کوششی",
          finalPrice: 1200000,
          description: "جلسه اول لیزر توتال بادی با درجه انرژی ۱۲",
          therapistAmount: 360000,
          clinicNetProfit: 840000,
          assistants: {
            connect: [{ id: nargesClinicUser.id }],
          },
          usedConsumables: {
            create: [
              {
                clinicProductId: bedSheetProduct.id,
                quantity: 1,
                unitCost: 12000,
              },
            ],
          },
        },
      },
      payments: {
        create: {
          amount: 1100000,
          paymentMethod: "POS",
          terminalId: posTerminal.id,
          trackingCode: "984512",
          status: "CLEARED",
        },
      },
    },
  });

  // ==========================================
  // 10. تیکت پشتیبانی و لاگ پیامک
  // ==========================================
  await prisma.supportTicket.create({
    data: {
      clinicId: aramaClinic.id,
      creatorClinicUserId: nargesClinicUser.id,
      creatorNameSnapshot: "نرگس کوششی",
      subject: "راهنمایی اتصال دستگاه کارتخوان",
      department: "فنی",
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.ANSWERED,
      messages: {
        create: [
          {
            senderUserId: nargesUser.id,
            isFromAdmin: false,
            body: "سلام، چطور می‌تونم شماره ترمینال پوز رو در سیستم ثبت کنم؟",
          },
          {
            senderUserId: superAdminUser.id,
            isFromAdmin: true,
            body: "سلام خانم کوششی، از بخش تنظیمات مالی > حساب‌های بانکی و کارتخوان‌ها می‌تونید اضافه کنید.",
          },
        ],
      },
    },
  });

  await prisma.smsLog.create({
    data: {
      clinicId: aramaClinic.id,
      clientId: createdClients[0].client.id,
      mobileNumber: createdClients[0].user.phone,
      title: "ثبت خدمت و فاکتور",
      messageBody: "مریم رضایی عزیز، خدمت لیزر توتال بادی در آراما کلینیک با موفقیت ثبت شد.",
      partsCount: 1,
      type: "SYSTEM",
      status: "DELIVERED",
    },
  });

  console.log("🎉 تمام اطلاعات با موفقیت در دیتابیس ثبت شدند!");
}

main()
  .catch((e) => {
    console.error("❌ خطا در اجرای seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });