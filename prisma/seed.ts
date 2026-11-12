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

async function main() {
  console.log('🧹 در حال پاکسازی کامل دیتابیس...')

  // پاکسازی به ترتیب وابستگی‌ها (از جدول فرزند به والد)
  await prisma.ticketMessage.deleteMany()
  await prisma.supportTicket.deleteMany()
  await prisma.b2BOrderItem.deleteMany()
  await prisma.b2BOrder.deleteMany()
  await prisma.platformProduct.deleteMany()
  await prisma.platformProductCategory.deleteMany()
  await prisma.clinicPurchasedAddon.deleteMany()
  await prisma.platformAddon.deleteMany()
  await prisma.clinicSubscription.deleteMany()
  await prisma.subscriptionPlan.deleteMany()

  await prisma.smsLog.deleteMany()
  await prisma.bulkSmsCampaign.deleteMany()
  await prisma.careSmsTemplate.deleteMany()
  await prisma.clinicSmsSetting.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.paymentTerminal.deleteMany()
  await prisma.clinicBankAccount.deleteMany()
  await prisma.usedConsumable.deleteMany()
  await prisma.providedService.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.serviceDefaultProduct.deleteMany()
  await prisma.productBatch.deleteMany()
  await prisma.clinicProduct.deleteMany()
  await prisma.subService.deleteMany()
  await prisma.service.deleteMany()
  await prisma.client.deleteMany()
  await prisma.clinicUser.deleteMany()
  await prisma.clinicRole.deleteMany()
  await prisma.systemAdmin.deleteMany()
  await prisma.clinic.deleteMany()
  await prisma.user.deleteMany()

  console.log('🌱 شروع ساخت داده‌های جامع SaaS، فروشگاه B2B، تیکتینگ و کلینیک...')

  // ==========================================
  // ۱. تعریف پلن‌های پلتفرم (رایگان، مطب، کلینیک) و ماژول‌ها
  // ==========================================
  const freePlan = await prisma.subscriptionPlan.create({
    data: {
      tier: PlanTier.FREE,
      title: 'پلن رایگان (آزمایشی)',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxStaff: 2,
      features: ['ثبت تا ۵۰ پرونده بیمار', 'صدور فاکتور پایه', 'بدون پنل پیامک خودکار'],
    },
  })

  const officePlan = await prisma.subscriptionPlan.create({
    data: {
      tier: PlanTier.OFFICE,
      title: 'پلن مطب (پزشکان مستقل)',
      monthlyPrice: 1200000,
      yearlyPrice: 11500000,
      maxStaff: 5,
      features: ['پرونده نامحدود', 'انبارداری پایه', 'پیامک‌های سیستمی و مراقبتی', 'گزارشات مالی'],
    },
  })

  const clinicPlan = await prisma.subscriptionPlan.create({
    data: {
      tier: PlanTier.CLINIC,
      title: 'پلن جامع کلینیک (VIP)',
      monthlyPrice: 2900000,
      yearlyPrice: 28000000,
      maxStaff: 50,
      features: ['چند درمانگر همزمان', 'انبارداری پیشرفته Batch و FIFO', 'دسترسی به فروشگاه عمده B2B', 'پشتیبانی اختصاصی'],
    },
  })

  const addons = await Promise.all([
    prisma.platformAddon.create({
      data: {
        code: AddonModuleType.COMMISSION_PERCASE,
        title: 'ماژول محاسبه کمیسیون و پرکیس پزشکان',
        price: 4500000,
        durationDays: 365,
        description: 'محاسبه خودکار سهم پزشک، اپراتور و معرف با کسر هزینه مواد مصرفی.',
      },
    }),
    prisma.platformAddon.create({
      data: {
        code: AddonModuleType.AI_ASSISTANT,
        title: 'ماژول دستیار هوش مصنوعی کلینیک',
        price: 6800000,
        durationDays: 365,
        description: 'تحلیل هوشمند پرونده بیماران، پیشنهاد خدمات مکمل و پیش‌بینی مصرف انبار.',
      },
    }),
    prisma.platformAddon.create({
      data: {
        code: AddonModuleType.VOICE_DATA_ENTRY,
        title: 'ماژول ورود صوتی اطلاعات پرونده (تبدیل گفتار به متن پزشکی)',
        price: 3900000,
        durationDays: 365,
        description: 'ثبت توضیحات پرونده و شرح حال بیمار توسط پزشک فقط با صحبت کردن.',
      },
    }),
    prisma.platformAddon.create({
      data: {
        code: AddonModuleType.SMS_PACKAGE,
        title: 'بسته شارژ ۱,۰۰۰ پیامک خدماتی',
        price: 350000,
        smsCount: 1000,
        description: 'افزایش اعتبار پنل پیامک کلینیک برای ارسال پیام‌های مراقبتی و سیستمی.',
      },
    }),
    prisma.platformAddon.create({
      data: {
        code: AddonModuleType.SMS_PACKAGE,
        title: 'بسته شارژ ۵,۰۰۰ پیامک خدماتی (اقتصادی)',
        price: 1550000,
        smsCount: 5000,
        description: 'مناسب برای کمپین‌های پیامک انبوه و کلینیک‌های پرمراجعه.',
      },
    }),
  ])

  // ==========================================
  // ۲. ساخت کلینیک و ثبت اشتراک و ماژول‌های خریداری‌شده
  // ==========================================
  const clinic = await prisma.clinic.create({
    data: {
      name: 'کلینیک تخصصی پوست و زیبایی آراما',
      subdomain: 'arama',
      currentPlan: PlanTier.CLINIC,
      planExpiresAt: new Date(Date.now() + 86400000 * 240), // ۲۴۰ روز اعتبار باقی‌مانده
      smsBalance: 4320,
    },
  })

  await prisma.clinicSubscription.create({
    data: {
      clinicId: clinic.id,
      planId: clinicPlan.id,
      startDate: new Date(Date.now() - 86400000 * 125),
      endDate: new Date(Date.now() + 86400000 * 240),
      paidAmount: 28000000,
      paymentRef: 'SUB-998123',
      status: 'ACTIVE',
    },
  })

  for (const addon of addons) {
    await prisma.clinicPurchasedAddon.create({
      data: {
        clinicId: clinic.id,
        addonId: addon.id,
        paidAmount: addon.price,
        expiresAt: addon.durationDays ? new Date(Date.now() + 86400000 * addon.durationDays) : null,
        isActive: true,
      },
    })
  }

  // ==========================================
  // ۳. فروشگاه مرکزی سایت به عنوان تامین‌کننده کالا (B2B Store)
  // ==========================================
  const b2bCategoriesData = [
    { title: 'انواع ژل و فیلر اورجینال', slug: 'fillers' },
    { title: 'ویال‌های بوتاکس و سموم بوتولینوم', slug: 'botox' },
    { title: 'مزوژل و کوکتل‌های مزوتراپی', slug: 'mesotherapy' },
    { title: 'سرسوزن، کانولا و ملزومات تزریق', slug: 'injection-supplies' },
    { title: 'ملزومات بهداشتی و مصرفی دستگاه‌ها', slug: 'clinic-consumables' },
  ]

  const b2bCategories = []
  for (const cat of b2bCategoriesData) {
    const createdCat = await prisma.platformProductCategory.create({ data: cat })
    b2bCategories.push(createdCat)
  }

  const b2bProductsData = [
    { catIdx: 0, name: 'پک ۱۰ عددی ژل رووفیل اولترا (عمده)', sku: 'B2B-101', brand: 'Caregen', unit: 'پک ۱۰ عددی', price: 19500000 },
    { catIdx: 0, name: 'ژل نورامیس دیپ با لیدوکائین', sku: 'B2B-102', brand: 'Medytox', unit: 'جعبه تک‌عددی', price: 1320000 },
    { catIdx: 0, name: 'فیلر زیر چشم تئوسیال Redensity II', sku: 'B2B-103', brand: 'Teoxane', unit: 'جعبه', price: 4600000 },
    { catIdx: 0, name: 'فیلر بادی دنبی اچ (Deneb H - 10cc)', sku: 'B2B-104', brand: 'BioPlus', unit: 'ویال ۱۰ سی‌سی', price: 2150000 },
    { catIdx: 1, name: 'ویال بوتاکس مصپورت ۵۰۰ واحدی (پک ۵ عددی)', sku: 'B2B-105', brand: 'Masoon Darou', unit: 'پک ۵ عددی', price: 3650000 },
    { catIdx: 1, name: 'بوتاکس دیسپورت انگلیسی ۵۰۰ واحد', sku: 'B2B-106', brand: 'Ipsen', unit: 'ویال', price: 2300000 },
    { catIdx: 1, name: 'بوتاکس نورونوکس کره‌ای ۱۰۰ واحد', sku: 'B2B-107', brand: 'Medytox', unit: 'ویال', price: 1450000 },
    { catIdx: 1, name: 'بوتاکس سیاکس (Siax) کره‌ای', sku: 'B2B-108', brand: 'Medytox', unit: 'ویال', price: 1600000 },
    { catIdx: 2, name: 'مزوژل جالپرو کلاسیک (Jalupro Classic)', sku: 'B2B-109', brand: 'Professional Derma', unit: 'پک', price: 3750000 },
    { catIdx: 2, name: 'مزوژل پروفایلو اچ پلاس ال (Profhilo)', sku: 'B2B-110', brand: 'IBSA', unit: 'سرنگ ۲ سی‌سی', price: 5600000 },
    { catIdx: 2, name: 'پک ۱۰ عددی کوکتل رویتاکر هیرکر فرانسه', sku: 'B2B-111', brand: 'Revitacare', unit: 'جعبه ۱۰ ویال', price: 8200000 },
    { catIdx: 2, name: 'کوکتل مزوتراپی فیوژن F-HAIR', sku: 'B2B-112', brand: 'Fusion Meso', unit: 'ویال ۱۰ سی‌سی', price: 1150000 },
    { catIdx: 3, name: 'باکس ۱۰۰ عددی سرنگ انسولین BD میکروفاین', sku: 'B2B-113', brand: 'BD', unit: 'جعبه ۱۰۰ عددی', price: 1100000 },
    { catIdx: 3, name: 'باکس ۱۰۰ عددی سرسوزن مزوتراپی 32G آوا', sku: 'B2B-114', brand: 'AVA', unit: 'جعبه ۱۰۰ عددی', price: 780000 },
    { catIdx: 3, name: 'بسته ۲۰ عددی میکروکانولا 25G کره', sku: 'B2B-115', brand: 'JBP', unit: 'بسته ۲۰ عددی', price: 820000 },
    { catIdx: 3, name: 'کارتریج سوزن طلایی آر اف فرکشنال ۲۵ پین', sku: 'B2B-116', brand: 'Scarlet', unit: 'پک ۱۰ عددی', price: 3500000 },
    { catIdx: 4, name: 'گالن ۵ لیتری ژل اولتراسوند و لیزر شفاف', sku: 'B2B-117', brand: 'PolyGel', unit: 'گالن ۵ لیتری', price: 240000 },
    { catIdx: 4, name: 'پک ۱۰۰ عددی سری بهداشتی لیزر کندلا', sku: 'B2B-118', brand: 'MedPack', unit: 'بسته ۱۰۰ عددی', price: 1650000 },
    { catIdx: 4, name: 'کرم بی‌حسی موضعی زایلاپی (کارتن ۲۴ عددی)', sku: 'B2B-119', brand: 'Tehran Chemie', unit: 'کارتن ۲۴ عددی', price: 1850000 },
    { catIdx: 4, name: 'دستکش نیتریل مشکی بدون پودر (۱۰ جعبه)', sku: 'B2B-120', brand: 'Op-Perfect', unit: 'کارتن ۱۰ جعبه‌ای', price: 2100000 },
  ]

  const platformProducts = []
  for (const item of b2bProductsData) {
    const prod = await prisma.platformProduct.create({
      data: {
        categoryId: b2bCategories[item.catIdx].id,
        name: item.name,
        sku: item.sku,
        brand: item.brand,
        unit: item.unit,
        price: item.price,
        stock: 50,
      },
    })
    platformProducts.push(prod)
  }

  for (let i = 0; i < 5; i++) {
    const p1 = platformProducts[i * 2]
    const p2 = platformProducts[i * 2 + 1]
    const total = p1.price * 2 + p2.price * 3

    await prisma.b2BOrder.create({
      data: {
        clinicId: clinic.id,
        totalAmount: total,
        status: i === 0 ? 'PENDING' : i === 1 ? 'SHIPPED' : 'DELIVERED',
        trackingCode: `B2B-ORD-70${i}`,
        items: {
          create: [
            { platformProductId: p1.id, quantity: 2, unitPrice: p1.price },
            { platformProductId: p2.id, quantity: 3, unitPrice: p2.price },
          ],
        },
      },
    })
  }

  // ==========================================
  // ۴. حساب‌های بانکی، سوپرادمین و پرسنل کلینیک
  // ==========================================
  const samanBank = await prisma.clinicBankAccount.create({
    data: {
      clinicId: clinic.id,
      bankName: 'بانک سامان',
      accountNumber: '845-210-9988771-1',
      ownerName: 'دکتر نرگس کوششی',
    },
  })

  const mellatBank = await prisma.clinicBankAccount.create({
    data: {
      clinicId: clinic.id,
      bankName: 'بانک ملت',
      accountNumber: '120-900-4455662-2',
      ownerName: 'کلینیک زیبایی آراما',
    },
  })

  const posSaman = await prisma.paymentTerminal.create({
    data: { clinicId: clinic.id, bankAccountId: samanBank.id, name: 'پوز سامان - پذیرش ۱', type: 'POS' },
  })
  const posMellat = await prisma.paymentTerminal.create({
    data: { clinicId: clinic.id, bankAccountId: mellatBank.id, name: 'پوز ملت - پذیرش ۲', type: 'POS' },
  })
  const onlineGateway = await prisma.paymentTerminal.create({
    data: { clinicId: clinic.id, bankAccountId: samanBank.id, name: 'درگاه اینترنتی زرین‌پال', type: 'ONLINE_GATEWAY' },
  })
  const terminals = [posSaman, posMellat, onlineGateway]

  const superAdminUser = await prisma.user.create({
    data: {
      phone: '09120000000',
      fullName: 'پشتیبانی ارشد پلتفرم (سوپرادمین)',
      nationalId: '0011223344',
      password: 'hashed_password',
    },
  })
  await prisma.systemAdmin.create({
    data: { userId: superAdminUser.id, level: 'SUPER_ADMIN' },
  })

  const managerRole = await prisma.clinicRole.create({
    data: { clinicId: clinic.id, name: 'مدیر کلینیک', permissions: ['ALL'] },
  })
  const doctorRole = await prisma.clinicRole.create({
    data: { clinicId: clinic.id, name: 'پزشک و درمانگر', permissions: ['VIEW_SERVICES', 'VIEW_CLIENTS'] },
  })
  const operatorRole = await prisma.clinicRole.create({
    data: { clinicId: clinic.id, name: 'اپراتور لیزر و فیشیال', permissions: ['VIEW_SERVICES'] },
  })
  const receptionRole = await prisma.clinicRole.create({
    data: { clinicId: clinic.id, name: 'مسئول پذیرش', permissions: ['INVOICE_CREATE', 'CLIENT_MANAGE'] },
  })

  const staffData = [
    { name: 'نرگس کوششی (مدیر کلینیک)', phone: '09121110001', nId: '0010000001', roleId: managerRole.id },
    { name: 'دکتر سهراب احمدی', phone: '09121110002', nId: '0010000002', roleId: doctorRole.id },
    { name: 'دکتر مریم کاظمی', phone: '09121110003', nId: '0010000003', roleId: doctorRole.id },
    { name: 'دکتر پارسا علوی', phone: '09121110004', nId: '0010000004', roleId: doctorRole.id },
    { name: 'نگار رضوی (اپراتور لیزر)', phone: '09121110005', nId: '0010000005', roleId: operatorRole.id },
    { name: 'شیما محمدی (پذیرش)', phone: '09121110006', nId: '0010000006', roleId: receptionRole.id },
  ]

  const clinicStaff = []
  const staffUsers = []
  for (const s of staffData) {
    const u = await prisma.user.create({
      data: { fullName: s.name, phone: s.phone, nationalId: s.nId, password: 'hashed_password' },
    })
    staffUsers.push(u)
    const cu = await prisma.clinicUser.create({
      data: { userId: u.id, clinicId: clinic.id, roleId: s.roleId },
    })
    clinicStaff.push(cu)
  }

  const clinicManagerClinicUser = clinicStaff[0]
  const clinicManagerUser = staffUsers[0]
  const therapists = clinicStaff.slice(1, 5)

  // ==========================================
  // ۵. ساخت ۲۰ تیکت پشتیبانی بین کلینیک و سوپرادمین
  // ==========================================
  const ticketSubjects = [
    { subj: 'درخواست فعال‌سازی خط خدماتی پیامک', dept: 'فنی', prio: TicketPriority.HIGH },
    { subj: 'سوال در مورد نحوه محاسبه کمیسیون پزشک در ماژول پرکیس', dept: 'مالی و اشتراک', prio: TicketPriority.MEDIUM },
    { subj: 'پیگیری ارسال سفارش عمده ژل رووفیل (B2B-ORD-701)', dept: 'تامین کالا (B2B)', prio: TicketPriority.URGENT },
    { subj: 'تنظیمات میکروفون در ماژول ورود صوتی پرونده', dept: 'فنی', prio: TicketPriority.LOW },
    { subj: 'درخواست فاکتور رسمی برای خرید پلن سالانه کلینیک', dept: 'مالی و اشتراک', prio: TicketPriority.MEDIUM },
    { subj: 'عدم دریافت پیامک یادآوری نوبت برای برخی شماره‌های همراه اول', dept: 'فنی', prio: TicketPriority.HIGH },
    { subj: 'پیشنهادات هوش مصنوعی برای موجودی انبار چطور آپدیت می‌شود؟', dept: 'فنی', prio: TicketPriority.LOW },
    { subj: 'موجودی بوتاکس دیسپورت در فروشگاه مرکزی سایت', dept: 'تامین کالا (B2B)', prio: TicketPriority.MEDIUM },
    { subj: 'افزودن درگاه پرداخت اسنپ‌پی به فاکتورها', dept: 'مالی و اشتراک', prio: TicketPriority.HIGH },
    { subj: 'خطا در ثبت تاریخ انقضای بچ جدید انبار', dept: 'فنی', prio: TicketPriority.MEDIUM },
    { subj: 'تغییر رمز عبور اپراتور پذیرش', dept: 'فنی', prio: TicketPriority.LOW },
    { subj: 'شرایط خرید اقساطی محصولات مصرفی از فروشگاه سایت', dept: 'تامین کالا (B2B)', prio: TicketPriority.MEDIUM },
    { subj: 'درخواست ارتقای سقف پرسنل در پلن کلینیک', dept: 'مالی و اشتراک', prio: TicketPriority.LOW },
    { subj: 'بررسی اصالت کد رهگیری ویال‌های جالپرو ارسالی', dept: 'تامین کالا (B2B)', prio: TicketPriority.HIGH },
    { subj: 'آموزش کار با بخش پیامک‌های مراقبتی اتوماتیک', dept: 'فنی', prio: TicketPriority.LOW },
    { subj: 'تداخل ساعت نوبت‌دهی دو پزشک در یک اتاق', dept: 'فنی', prio: TicketPriority.MEDIUM },
    { subj: 'استرداد وجه سفارش لغو شده سرنگ انسولین', dept: 'مالی و اشتراک', prio: TicketPriority.HIGH },
    { subj: 'خروجی اکسل از گزارشات مالی ماهانه', dept: 'مالی و اشتراک', prio: TicketPriority.LOW },
    { subj: 'تنظیم سطح دسترسی محدود برای منشی شیفت عصر', dept: 'فنی', prio: TicketPriority.MEDIUM },
    { subj: 'تشکر از سرعت بالای ارسال پک‌های استریل لیزر', dept: 'تامین کالا (B2B)', prio: TicketPriority.LOW },
  ]

  const statuses = [TicketStatus.ANSWERED, TicketStatus.OPEN, TicketStatus.PENDING_ADMIN, TicketStatus.CLOSED]

  for (let i = 0; i < 20; i++) {
    const tInfo = ticketSubjects[i]
    const status = statuses[i % statuses.length]

    const ticket = await prisma.supportTicket.create({
      data: {
        clinicId: clinic.id,
        creatorClinicUserId: clinicManagerClinicUser.id,
        subject: tInfo.subj,
        department: tInfo.dept,
        priority: tInfo.prio,
        status: status,
        createdAt: new Date(Date.now() - (20 - i) * 3600 * 1000 * 8),
      },
    })

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: clinicManagerUser.id,
        isFromAdmin: false,
        body: `سلام وقت بخیر. در خصوص «${tInfo.subj}» نیاز به راهنمایی و بررسی توسط تیم پشتیبانی پلتفرم دارم. ممنون می‌شوم پیگیری بفرمایید.`,
        createdAt: new Date(Date.now() - (20 - i) * 3600 * 1000 * 8 + 1000),
      },
    })

    if (status !== TicketStatus.OPEN) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderUserId: superAdminUser.id,
          isFromAdmin: true,
          body: `با سلام خدمت مدیریت محترم کلینیک آراما. مورد اعلامی شما در بخش «${tInfo.dept}» بررسی و اعمال گردید. در صورت نیاز به راهنمایی بیشتر در خدمتیم.`,
          createdAt: new Date(Date.now() - (20 - i) * 3600 * 1000 * 7),
        },
      })
    }
  }

  // ==========================================
  // ۶. ساخت ۲۰ بیمار (Client)
  // ==========================================
  const clientNames = [
    { name: 'نیایش ترکمن', phone: '09372764596' },
    { name: 'نگین ملکی', phone: '09019046434' },
    { name: 'فاطمه صالحی', phone: '09388056329' },
    { name: 'فاطمه روستایی', phone: '09195692352' },
    { name: 'مهناز نجفی', phone: '09188523910' },
    { name: 'فاطمه ملکی', phone: '09052169432' },
    { name: 'نجمه ملکی', phone: '09039986143' },
    { name: 'حدیث ترکاشوند', phone: '09905853474' },
    { name: 'سعیده مرادی', phone: '09059279676' },
    { name: 'مهدیه پیرحیاتی', phone: '09054952279' },
    { name: 'مهتاب قربانی', phone: '09338504078' },
    { name: 'فاطمه زنگنه', phone: '09308119043' },
    { name: 'زهرا غلامی', phone: '09045654929' },
    { name: 'آیدا ترک', phone: '09043996947' },
    { name: 'فاطمه نوری', phone: '09927863087' },
    { name: 'سارا رضایی', phone: '09123456781' },
    { name: 'الناز شاکردوست', phone: '09123456782' },
    { name: 'کیانا وحدتی', phone: '09123456783' },
    { name: 'پریناز ایزدیار', phone: '09123456784' },
    { name: 'ترانه علیدوستی', phone: '09123456785' },
  ]

  const clients = []
  for (let i = 0; i < clientNames.length; i++) {
    const u = await prisma.user.create({
      data: {
        fullName: clientNames[i].name,
        phone: clientNames[i].phone,
        nationalId: `00234567${(i + 10).toString()}`,
      },
    })
    const c = await prisma.client.create({
      data: {
        userId: u.id,
        clinicId: clinic.id,
        walletBalance: i % 4 === 0 ? (i + 1) * 250000 : 0,
      },
    })
    clients.push({ ...c, fullName: u.fullName, phone: u.phone })
  }

  // ==========================================
  // ۷. ساخت کاتالوگ خدمات و ۲۰ زیرخدمت
  // ==========================================
  const catalogData = [
    {
      serviceTitle: 'تزریق ژل و فیلر',
      subServices: [
        { title: 'ژل لب رووفیل اولترا (۱ سی‌سی)', price: 3800000, attributes: { برند: 'Revofil', کشور: 'کره جنوبی', ماندگاری: '۱۰ تا ۱۲ ماه' } },
        { title: 'ژل لب نورامیس (۱ سی‌سی)', price: 2900000, attributes: { برند: 'Neuramis', کشور: 'کره جنوبی', ماندگاری: '۶ تا ۸ ماه' } },
        { title: 'فیلر زیر چشم تئوسیال', price: 7500000, attributes: { برند: 'Teosyal', کشور: 'سوئیس', حجم: '۱ سی‌سی' } },
        { title: 'فیلر زاویه‌سازی فک دنبی', price: 2200000, attributes: { برند: 'Deneb', کشور: 'کره جنوبی', حجم: 'هر سی‌سی' } },
      ],
    },
    {
      serviceTitle: 'تزریق بوتاکس',
      subServices: [
        { title: 'بوتاکس پیشانی و دور چشم مصپورت', price: 1450000, attributes: { برند: 'Masport', کشور: 'ایران', ترمیم_رایگان: 'دارد (تا ۲ هفته)' } },
        { title: 'بوتاکس کامل دیسپورت انگلیسی', price: 3900000, attributes: { برند: 'Dysport', کشور: 'انگلیس', واحد: '۵۰۰ واحد' } },
        { title: 'بوتاکس زیر بغل (درمان تعریق)', price: 2800000, attributes: { برند: 'Masport', ماندگاری: '۶ ماه', ناحیه: 'هر دو زیربغل' } },
        { title: 'بوتاکس چشم گربه‌ای (لیفت ابرو)', price: 1100000, attributes: { برند: 'Masport', تکنیک: 'لیفت دم ابرو' } },
      ],
    },
    {
      serviceTitle: 'لیزر موهای زائد',
      subServices: [
        { title: 'لیزر فول‌بادی بانوان - کندلا', price: 1350000, attributes: { دستگاه: 'Candela GentleMax Pro', طول_موج: 'الکساندرایت', تعداد_جلسات: 6 } },
        { title: 'لیزر کاربردی بانوان - تیتانیوم', price: 780000, attributes: { دستگاه: 'Soprano Titanium 2024', کولینگ: 'Ice Plus', تعداد_جلسات: 6 } },
        { title: 'لیزر بیکینی و زیربغل - کندلا', price: 490000, attributes: { دستگاه: 'Candela GentleMax Pro', شات_نامحدود: 'بله' } },
        { title: 'لیزر فول‌بادی آقایان - تیتانیوم', price: 1650000, attributes: { دستگاه: 'Soprano Titanium', تعداد_جلسات: 8 } },
      ],
    },
    {
      serviceTitle: 'جوانسازی و هایفوتراپی',
      subServices: [
        { title: 'هایفوتراپی کامل صورت و غبغب', price: 4800000, attributes: { دستگاه: 'Ulthera 7D', تعداد_شات: '۸۰۰ شات', کارتریج: '3mm & 4.5mm' } },
        { title: 'مزوژل جالپرو کلاسیک', price: 5900000, attributes: { برند: 'Jalupro', کشور: 'ایتالیا', حجم: '۳ سی‌سی' } },
        { title: 'مزوژل پروفایلو', price: 8200000, attributes: { برند: 'Profhilo', کشور: 'ایتالیا', نقاط_تزریق: '۱۰ نقطه BAP' } },
        { title: 'آر اف فرکشنال میکرونیدلینگ', price: 2400000, attributes: { دستگاه: 'Scarlet RF', سوزن: 'طلایی ۲۵ پین اختصاصی' } },
      ],
    },
    {
      serviceTitle: 'مزوتراپی و فیشیال تخصصی',
      subServices: [
        { title: 'مزوتراپی مو رویتاکر فرانسه', price: 2100000, attributes: { برند: 'Revitacare Haircare', کشور: 'فرانسه', حجم: '۵ سی‌سی' } },
        { title: 'مزوتراپی ابرو فیوژن', price: 1300000, attributes: { برند: 'Fusion F-HAIR', کشور: 'اسپانیا', حجم: '۲ سی‌سی' } },
        { title: 'فیشیال تخصصی VIP هیدرافیشیال', price: 1850000, attributes: { دستگاه: 'HydraFacial MD', مراحل: '۷ مرحله کامل + ال‌ای‌دی تراپی' } },
        { title: 'پاکسازی کلاسیک و اسیدتراپی', price: 980000, attributes: { برند_مواد: 'Janssen آلمان', مدت_زمان: '۶۰ دقیقه' } },
      ],
    },
  ]

  const allServices = []
  const allSubServices = []

  for (const group of catalogData) {
    const srv = await prisma.service.create({
      data: { clinicId: clinic.id, title: group.serviceTitle },
    })
    allServices.push(srv)

    for (const sub of group.subServices) {
      const createdSub = await prisma.subService.create({
        data: {
          serviceId: srv.id,
          title: sub.title,
          price: sub.price,
          attributes: sub.attributes,
        },
      })
      allSubServices.push(createdSub)
    }
  }

  // ==========================================
  // ۸. ساخت ۲۰ کالای انبار کلینیک و رسیدها
  // ==========================================
  const productsData = [
    { name: 'ژل رووفیل اولترا', code: 'PRD-101', unit: 'سی‌سی', alert: 5, buy: 2100000, sell: 2500000, qty: 25 },
    { name: 'ژل نورامیس دیپ', code: 'PRD-102', unit: 'سی‌سی', alert: 10, buy: 1400000, sell: null, qty: 40 },
    { name: 'فیلر تئوسیال ردденسیتی ۲', code: 'PRD-103', unit: 'سی‌سی', alert: 3, buy: 4800000, sell: 5200000, qty: 12 },
    { name: 'ژل دنبی اچ (۱۰ سی‌سی)', code: 'PRD-104', unit: 'سی‌سی', alert: 15, buy: 950000, sell: null, qty: 60 },
    { name: 'ویال بوتاکس مصپورت ۵۰۰', code: 'PRD-105', unit: 'سی‌سی', alert: 5, buy: 780000, sell: null, qty: 30 },
    { name: 'ویال بوتاکس دیسپورت', code: 'PRD-106', unit: 'سی‌سی', alert: 2, buy: 2400000, sell: null, qty: 10 },
    { name: 'مزوژل جالپرو کلاسیک', code: 'PRD-107', unit: 'پک', alert: 3, buy: 3900000, sell: 4200000, qty: 8 },
    { name: 'مزوژل پروفایلو ۲ سی‌سی', code: 'PRD-108', unit: 'پک', alert: 2, buy: 5800000, sell: null, qty: 6 },
    { name: 'کوکتل مزوتراپی رویتاکر', code: 'PRD-109', unit: 'سی‌سی', alert: 10, buy: 900000, sell: null, qty: 35 },
    { name: 'کوکتل مزوتراپی فیوژن', code: 'PRD-110', unit: 'سی‌سی', alert: 10, buy: 650000, sell: null, qty: 30 },
    { name: 'سرنگ انسولین BD میکروفاین', code: 'PRD-111', unit: 'عدد', alert: 100, buy: 12000, sell: 20000, qty: 500 },
    { name: 'سرسوزن مزوتراپی 32G', code: 'PRD-112', unit: 'عدد', alert: 100, buy: 8500, sell: 15000, qty: 450 },
    { name: 'کانولا تزریق فیلر 25G', code: 'PRD-113', unit: 'عدد', alert: 30, buy: 45000, sell: 85000, qty: 120 },
    { name: 'پک بهداشتی سری لیزر', code: 'PRD-114', unit: 'پک', alert: 50, buy: 18000, sell: 45000, qty: 200 },
    { name: 'ژل اولتراسوند ۵ لیتری', code: 'PRD-115', unit: 'سی‌سی', alert: 1000, buy: 150, sell: null, qty: 15000 },
    { name: 'کرم بی‌حسی زایلاپی ۳۰ گرمی', code: 'PRD-116', unit: 'عدد', alert: 15, buy: 85000, sell: 130000, qty: 50 },
    { name: 'کارتریج سوزن آر اف فرکشنال', code: 'PRD-117', unit: 'عدد', alert: 10, buy: 380000, sell: 550000, qty: 35 },
    { name: 'پد الکلی استریل', code: 'PRD-118', unit: 'عدد', alert: 200, buy: 1500, sell: null, qty: 1000 },
    { name: 'دستکش نیتریل بدون پودر', code: 'PRD-119', unit: 'جفت', alert: 50, buy: 6000, sell: null, qty: 300 },
    { name: 'ماسک ورقه‌ای هیدروژلی صورت', code: 'PRD-120', unit: 'عدد', alert: 20, buy: 95000, sell: 160000, qty: 65 },
  ]

  const allProducts = []
  for (let i = 0; i < productsData.length; i++) {
    const p = productsData[i]
    const createdProd = await prisma.clinicProduct.create({
      data: {
        clinicId: clinic.id,
        name: p.name,
        code: p.code,
        unit: p.unit,
        alertThreshold: p.alert,
      },
    })
    allProducts.push({ ...createdProd, buyPrice: p.buy, sellPrice: p.sell })

    await prisma.productBatch.create({
      data: {
        clinicProductId: createdProd.id,
        quantity: p.qty,
        purchasePrice: p.buy,
        sellingPrice: p.sell,
        expirationDate: new Date(new Date().setMonth(new Date().getMonth() + 8 + (i % 10))),
        exclusiveSubServiceId: i < 4 ? allSubServices[i].id : null,
        exclusiveTherapistId: i % 5 === 0 ? therapists[0].id : null,
      },
    })
  }

  await prisma.serviceDefaultProduct.createMany({
    data: [
      { subServiceId: allSubServices[0].id, clinicProductId: allProducts[0].id, quantity: 1 },
      { subServiceId: allSubServices[0].id, clinicProductId: allProducts[12].id, quantity: 1 },
      { subServiceId: allSubServices[1].id, clinicProductId: allProducts[1].id, quantity: 1 },
      { subServiceId: allSubServices[4].id, clinicProductId: allProducts[4].id, quantity: 0.3 },
      { subServiceId: allSubServices[4].id, clinicProductId: allProducts[10].id, quantity: 2 },
      { subServiceId: allSubServices[8].id, clinicProductId: allProducts[13].id, quantity: 1 },
      { subServiceId: allSubServices[15].id, clinicProductId: allProducts[16].id, quantity: 1 },
      { subServiceId: allSubServices[18].id, clinicProductId: allProducts[19].id, quantity: 1 },
    ],
  })

  // ==========================================
  // ۹. ساخت ۲۰ فاکتور، خدمات ارائه‌شده و پرداخت‌ها
  // ==========================================
  const discountReasons = ['تخفیف جشنواره بهاره', 'مراجعه‌کننده VIP کلینیک', 'تخفیف معرفی بیمار جدید', 'تخفیف وفاداری']
  const extraReasons = ['هزینه پک استریل اختصاصی', 'کانولا و سوزن اضافه', 'کرم بی‌حسی اختصاصی']

  for (let i = 0; i < 20; i++) {
    const client = clients[i]
    const sub1 = allSubServices[i % allSubServices.length]
    const sub2 = allSubServices[(i + 5) % allSubServices.length]
    const therapist = therapists[i % therapists.length]

    const hasTwoServices = i % 3 === 0
    const price1 = sub1.price
    const price2 = hasTwoServices ? sub2.price : 0

    const subTotal = price1 + price2
    const discount = i % 4 === 0 ? 200000 : 0
    const extraCharge = i % 5 === 0 ? 85000 : 0
    const totalAmount = subTotal - discount + extraCharge

    let status = 'PAID'
    let paidAmount = totalAmount
    if (i === 16 || i === 17) {
      status = 'PARTIAL_PAID'
      paidAmount = Math.floor(totalAmount / 2)
    } else if (i === 18 || i === 19) {
      status = 'PENDING'
      paidAmount = 0
    }

    const invoice = await prisma.invoice.create({
      data: {
        clinicId: clinic.id,
        clientId: client.id,
        subTotalAmount: subTotal,
        discountAmount: discount,
        discountReason: discount > 0 ? discountReasons[i % discountReasons.length] : null,
        extraChargeAmount: extraCharge,
        extraChargeReason: extraCharge > 0 ? extraReasons[i % extraReasons.length] : null,
        totalAmount: totalAmount,
        status: status,
        paidAmount: paidAmount,
        createdAt: new Date(Date.now() - (20 - i) * 3600 * 1000 * 12),
      },
    })

    const prod1 = allProducts[i % 10]
    const unitCost1 = prod1.buyPrice
    const therapistShare1 = Math.floor((price1 - unitCost1) * 0.4)

    const ps1 = await prisma.providedService.create({
      data: {
        invoiceId: invoice.id,
        subServiceId: sub1.id,
        therapistId: therapist.id,
        finalPrice: price1,
        description: i % 2 === 0 ? 'تزریق با کانولا انجام شد. بیمار رضایت کامل داشت.' : 'طبق پرونده قبلی دوز استاندارد تزریق شد.',
        therapistAmount: therapistShare1,
        clinicNetProfit: price1 - unitCost1 - therapistShare1,
      },
    })

    await prisma.usedConsumable.create({
      data: {
        providedServiceId: ps1.id,
        clinicProductId: prod1.id,
        quantity: 1,
        sellingPrice: prod1.sellPrice,
        unitCost: unitCost1,
      },
    })

    if (hasTwoServices) {
      const prod2 = allProducts[(i + 3) % 10]
      const unitCost2 = prod2.buyPrice
      const therapistShare2 = Math.floor((price2 - unitCost2) * 0.4)

      const ps2 = await prisma.providedService.create({
        data: {
          invoiceId: invoice.id,
          subServiceId: sub2.id,
          therapistId: therapist.id,
          finalPrice: price2,
          description: 'خدمت مکمل در همان جلسه انجام شد.',
          therapistAmount: therapistShare2,
          clinicNetProfit: price2 - unitCost2 - therapistShare2,
        },
      })

      await prisma.usedConsumable.create({
        data: {
          providedServiceId: ps2.id,
          clinicProductId: prod2.id,
          quantity: 1,
          sellingPrice: null,
          unitCost: unitCost2,
        },
      })
    }

    if (paidAmount > 0) {
      if (i % 4 === 0) {
        const posPart = 1500000
        const snapPart = paidAmount - posPart
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: posPart,
            paymentMethod: 'POS',
            terminalId: posSaman.id,
            trackingCode: `POS-8841${i}`,
            status: 'CLEARED',
          },
        })
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: snapPart,
            paymentMethod: 'CREDIT_SERVICE',
            creditProvider: 'SNAPPAY',
            trackingCode: `SNP-9920${i}`,
            status: 'CLEARED',
          },
        })
      } else {
        const term = terminals[i % terminals.length]
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: paidAmount,
            paymentMethod: term.type === 'POS' ? 'POS' : 'CARD_TRANSFER',
            terminalId: term.id,
            trackingCode: `TRK-5501${i}`,
            status: 'CLEARED',
          },
        })
      }
    }
  }

  // ==========================================
  // ۱۰. سیستم پیامک و ۲۰ لاگ گزارش
  // ==========================================
  await prisma.clinicSmsSetting.create({
    data: {
      clinicId: clinic.id,
      appointmentBooked: true,
      appointmentReminder: true,
      appointmentCanceled: true,
      appointmentEdited: false,
      serviceRegistered: true,
      paymentReceived: true,
      surveySent: true,
      birthdayGreeting: false,
      fileRegistered: true,
      discountCodeCreated: false,
      walletIncreased: true,
      walletDecreased: true,
    },
  })

  await prisma.careSmsTemplate.createMany({
    data: [
      {
        clinicId: clinic.id,
        serviceId: allServices[1].id,
        title: 'مراقبت قبل از بوتاکس',
        triggerType: 'BEFORE_VISIT',
        offsetHours: 3,
        messageBody: 'مراجع گرامی، لطفاً از ورزش سنگین و مصرف داروهای رقیق‌کننده خون قبل از تزریق بوتاکس خودداری نمایید.',
      },
      {
        clinicId: clinic.id,
        serviceId: allServices[1].id,
        title: 'مراقبت بعد از بوتاکس',
        triggerType: 'AFTER_VISIT',
        offsetHours: 4,
        messageBody: 'سر خود را تا ۵ ساعت بعد از بوتاکس پایین نیاورید و تا ۲۴ ساعت از استحمام با آب داغ خودداری کنید.',
      },
    ],
  })

  await prisma.bulkSmsCampaign.create({
    data: {
      clinicId: clinic.id,
      title: 'جشنواره تخفیف بوتاکس بهاره',
      messageBody: '۲۰٪ تخفیف ویژه تزریق بوتاکس مصپورت و دیسپورت فقط تا پایان این هفته در کلینیک زیبایی آراما!',
      scheduledFor: new Date(Date.now() + 86400000 * 2),
      targetFilters: { sendToAll: true },
      status: 'PENDING',
    },
  })

  for (let i = 0; i < 20; i++) {
    const client = clients[i]
    const isAppointmentSms = i === 4 || i === 11
    const msgTitle = isAppointmentSms ? 'ثبت نوبت' : i % 3 === 0 ? 'مراقبت بعد از بوتاکس' : 'ثبت پرونده'
    const msgBody = isAppointmentSms
      ? `${client.fullName} عزیز؛ نوبت هایفوتراپی شما در کلینیک آراما برای فردا ساعت ۱۷:۰۰ ثبت گردید.`
      : `${client.fullName} عزیز؛ پیوستن شما به خانواده‌ی کلینیک زیبایی آراما را صمیمانه تبریک می‌گوییم.`

    await prisma.smsLog.create({
      data: {
        clinicId: clinic.id,
        clientId: client.id,
        mobileNumber: client.phone,
        title: msgTitle,
        messageBody: msgBody,
        partsCount: isAppointmentSms ? 3 : 2,
        type: isAppointmentSms ? 'SYSTEM' : i % 3 === 0 ? 'CARE' : 'SYSTEM',
        status: i === 14 ? 'FAILED' : 'DELIVERED',
        sentAt: new Date(Date.now() - i * 1800 * 1000),
      },
    })
  }

  console.log('✅ دیتابیس جامع (پلن‌ها، ماژول‌ها، فروشگاه B2B، تیکتینگ، کلینیک و پیامک) با موفقیت ساخته شد!')
}

main()
  .catch((e) => {
    console.error('❌ خطا در اجرای Seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })