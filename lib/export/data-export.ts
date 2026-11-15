// lib/export/data-export.ts
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { formatJalaliNumeric } from "@/lib/jalali";

export type ExportEntityType =
  | "INVENTORY_PRODUCTS"
  | "INVENTORY_BATCHES"
  | "INVENTORY_SALES_REPORT"
  | "CLIENTS"
  | "PROVIDED_SERVICES"
  | "SERVICES"
  | "STAFFS";

export type ExportFormat = "XLSX" | "JSON";

export interface ExportFilters {
  from?: string;
  to?: string;
  serviceId?: string;
  staffId?: string;
}

/**
 * بررسی اینکه آیا پلن کلینیک یا ماژول خریداری‌شده DATA_EXPORT برای این کلینیک فعال است یا خیر
 */
export async function checkClinicExportCapability(clinicId: string) {
  const now = new Date();
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: {
      currentPlan: true,
      subscriptions: {
        where: { status: "ACTIVE", endDate: { gt: now } },
        include: { plan: { select: { canExportData: true } } },
        orderBy: { startDate: "desc" },
        take: 1,
      },
      purchasedAddons: {
        where: {
          isActive: true,
          addon: { code: "DATA_EXPORT" },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        take: 1,
      },
    },
  });

  if (!clinic) return false;

  if (clinic.subscriptions[0]?.plan.canExportData) {
    return true;
  }

  const basePlan = await prisma.subscriptionPlan.findUnique({
    where: { tier: clinic.currentPlan },
    select: { canExportData: true },
  });

  if (basePlan?.canExportData) {
    return true;
  }

  return clinic.purchasedAddons.length > 0;
}

/**
 * واکشی و آماده‌سازی ردیف‌های استاندارد فارسی برای اکسل یا JSON
 */
export async function generateExportPayload(
  entityType: ExportEntityType,
  format: ExportFormat,
  filters: ExportFilters = {}
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) {
    throw new Error("نشست کاربری معتبر نیست.");
  }

  const canExport = await checkClinicExportCapability(ctx.clinicId);
  if (!canExport) {
    throw new Error(
      "قابلیت خروجی گرفتن از اطلاعات در پلن فعلی شما فعال نیست. لطفاً پلن خود را ارتقا دهید یا ماژول «خروجی اکسل و JSON» را تهیه کنید."
    );
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (filters.from) {
    const d = new Date(filters.from);
    d.setHours(0, 0, 0, 0);
    if (!isNaN(d.getTime())) dateFilter.gte = d;
  }
  if (filters.to) {
    const d = new Date(filters.to);
    d.setHours(23, 59, 59, 999);
    if (!isNaN(d.getTime())) dateFilter.lte = d;
  }
  const hasDateFilter = Boolean(dateFilter.gte || dateFilter.lte);

  let rows: Record<string, any>[] = [];
  let fileNamePrefix = "export";

  switch (entityType) {
    case "INVENTORY_PRODUCTS": {
      if (
        !hasPermission(ctx.clinicUser, "finance.inventory") &&
        !hasPermission(ctx.clinicUser, "tools.inventory_view")
      ) {
        throw new Error("مجوز دسترسی به انبار کالا ندارید.");
      }

      const products = await prisma.clinicProduct.findMany({
        where: { clinicId: ctx.clinicId },
        include: {
          batches: { where: { quantity: { gt: 0 } } },
        },
        orderBy: { name: "asc" },
      });

      fileNamePrefix = "clinic-inventory-products";
      rows = products.map((p) => {
        const totalStock = p.batches.reduce((s, b) => s + b.quantity, 0);
        const packagesCount =
          p.packageUnit && p.unitsPerPackage > 1
            ? Math.floor(totalStock / p.unitsPerPackage)
            : null;
        return {
          "نام کالا": p.name,
          "کد کالا": p.code || "-",
          "واحد مصرف (جزء)": p.unit,
          "واحد بسته‌بندی": p.packageUnit || "-",
          "تعداد در هر بسته": p.unitsPerPackage,
          "موجودی کل (واحد مصرف)": totalStock,
          "معادل بسته‌بندی":
            packagesCount !== null ? `${packagesCount} ${p.packageUnit}` : "-",
          "نقطه هشدار اتمام": p.alertThreshold,
        };
      });
      break;
    }

    case "INVENTORY_BATCHES": {
      if (!hasPermission(ctx.clinicUser, "finance.inventory")) {
        throw new Error("مجوز دسترسی به ورود کالاهای انبار ندارید.");
      }

      const batches = await prisma.productBatch.findMany({
        where: {
          clinicProduct: { clinicId: ctx.clinicId },
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          ...(filters.serviceId && filters.serviceId !== "ALL"
            ? { exclusiveSubService: { serviceId: filters.serviceId } }
            : {}),
          ...(filters.staffId && filters.staffId !== "ALL"
            ? { exclusiveTherapistId: filters.staffId }
            : {}),
        },
        include: {
          clinicProduct: true,
          exclusiveSubService: { include: { service: true } },
          exclusiveTherapist: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      fileNamePrefix = "clinic-inventory-batches";
      rows = batches.map((b) => ({
        "نام کالا": b.clinicProduct.name,
        "کد کالا": b.clinicProduct.code || "-",
        "مقدار اولیه (واحد مصرف)": b.initialQuantity || b.quantity,
        "موجودی باقیمانده": b.quantity,
        "واحد مصرف": b.clinicProduct.unit,
        "قیمت خرید واحد (تومان)": b.purchasePrice,
        "قیمت فروش واحد (تومان)": b.sellingPrice ?? 0,
        "تاریخ ثبت (شمسی)": formatJalaliNumeric(new Date(b.createdAt)),
        "تاریخ انقضا (شمسی)": b.expirationDate
          ? formatJalaliNumeric(new Date(b.expirationDate))
          : "-",
        "خدمت اختصاصی": b.exclusiveSubService
          ? `${b.exclusiveSubService.service.title} - ${b.exclusiveSubService.title}`
          : "عمومی",
        "درمانگر اختصاصی":
          b.exclusiveTherapist?.user.fullName || "همه درمانگران",
      }));
      break;
    }

    case "INVENTORY_SALES_REPORT": {
      if (
        !hasPermission(ctx.clinicUser, "finance.inventory") &&
        !hasPermission(ctx.clinicUser, "finance.accounting")
      ) {
        throw new Error("مجوز دسترسی به گزارش مالی انبار ندارید.");
      }

      const [usages, stockOuts] = await Promise.all([
        prisma.usedConsumable.findMany({
          where: {
            clinicProduct: { clinicId: ctx.clinicId },
            providedService: {
              ...(hasDateFilter ? { createdAt: dateFilter } : {}),
              ...(filters.serviceId && filters.serviceId !== "ALL"
                ? { subService: { serviceId: filters.serviceId } }
                : {}),
              ...(filters.staffId && filters.staffId !== "ALL"
                ? { therapistId: filters.staffId }
                : {}),
            },
          },
          include: {
            clinicProduct: true,
            providedService: {
              include: {
                subService: { include: { service: true } },
                client: { include: { user: true } },
              },
            },
          },
          orderBy: { providedService: { createdAt: "desc" } },
        }),
        prisma.inventoryStockOut.findMany({
          where: {
            clinicId: ctx.clinicId,
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            ...(filters.staffId && filters.staffId !== "ALL"
              ? { createdById: filters.staffId }
              : {}),
          },
          include: {
            clinicProduct: true,
            createdBy: { include: { user: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      fileNamePrefix = "clinic-inventory-financial-report";
      const usageRows = usages.map((u) => {
        const isSale = Boolean(u.sellingPrice && u.sellingPrice > 0);
        const totalCost = u.unitCost * u.quantity;
        const totalRevenue = isSale ? (u.sellingPrice || 0) * u.quantity : 0;
        return {
          "منبع تراکنش": "مصرف در خدمت",
          "نام کالا": u.clinicProduct.name,
          "تعداد مصرفی": u.quantity,
          "واحد": u.clinicProduct.unit,
          "نوع محاسبه": isSale ? "فروش کالا" : "هزینه کالاهای مصرفی",
          "بهای تمام‌شده کل (تومان)": totalCost,
          "مبلغ فروش کل (تومان)": totalRevenue,
          "سود خالص (تومان)": isSale ? totalRevenue - totalCost : 0,
          "خدمت مرتبط": `${u.providedService.subService.service.title} - ${u.providedService.subService.title}`,
          "پرسنل / درمانگر": u.providedService.therapistNameSnapshot || "-",
          "تاریخ ثبت (شمسی)": formatJalaliNumeric(
            new Date(u.providedService.createdAt)
          ),
        };
      });

      const outRows =
        filters.serviceId && filters.serviceId !== "ALL"
          ? []
          : stockOuts.map((o) => {
              const isSale = Boolean(o.sellingPrice && o.sellingPrice > 0);
              const totalCost = o.unitCost * o.quantity;
              const totalRevenue = isSale
                ? (o.sellingPrice || 0) * o.quantity
                : 0;
              return {
                "منبع تراکنش": `خروج دستی (${o.reason || "عمومی"})`,
                "نام کالا": o.clinicProduct.name,
                "تعداد مصرفی": o.quantity,
                "واحد": o.clinicProduct.unit,
                "نوع محاسبه": isSale ? "فروش مستقیم" : "هزینه کالاهای مصرفی",
                "بهای تمام‌شده کل (تومان)": totalCost,
                "مبلغ فروش کل (تومان)": totalRevenue,
                "سود خالص (تومان)": isSale ? totalRevenue - totalCost : 0,
                "خدمت مرتبط": "-",
                "پرسنل / درمانگر": o.createdBy?.user.fullName || "-",
                "تاریخ ثبت (شمسی)": formatJalaliNumeric(new Date(o.createdAt)),
              };
            });

      rows = [...usageRows, ...outRows];
      break;
    }

    case "CLIENTS": {
      if (!hasPermission(ctx.clinicUser, "patients.view")) {
        throw new Error("مجوز دسترسی به لیست مراجعین ندارید.");
      }

      const clients = await prisma.client.findMany({
        where: { clinicId: ctx.clinicId },
        include: {
          user: true,
          _count: { select: { providedServices: true, invoices: true } },
        },
        orderBy: { user: { createdAt: "desc" } },
      });

      fileNamePrefix = "clinic-clients";
      rows = clients.map((c) => ({
        "نام و نام خانوادگی": c.user.fullName || "بدون نام",
        "شماره موبایل": c.user.phone,
        "کد ملی": c.user.nationalId || "-",
        "موجودی کیف پول (تومان)": c.walletBalance,
        "تعداد خدمات دریافتی": c._count.providedServices,
        "تعداد فاکتورها": c._count.invoices,
        "تاریخ عضویت (شمسی)": formatJalaliNumeric(new Date(c.user.createdAt)),
      }));
      break;
    }

    case "PROVIDED_SERVICES": {
      if (!hasPermission(ctx.clinicUser, "patients.visit_report")) {
        throw new Error("مجوز دسترسی به گزارش پرونده خدمات ندارید.");
      }

      const records = await prisma.providedService.findMany({
        where: {
          client: { clinicId: ctx.clinicId },
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        include: {
          client: { include: { user: true } },
          subService: { include: { service: true } },
          assistants: { include: { user: true } },
          referrer: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      fileNamePrefix = "clinic-provided-services";
      rows = records.map((r) => ({
        "نام مراجع": r.client.user.fullName || "بدون نام",
        "موبایل مراجع": r.client.user.phone,
        "خدمت اصلی": r.subService.service.title,
        "زیرسرویس": r.subService.title,
        "درمانگر": r.therapistNameSnapshot || "-",
        "دستیاران":
          r.assistants.map((a) => a.user.fullName).join("، ") || "-",
        "معرف": r.referrer?.user.fullName || "-",
        "مبلغ نهایی (تومان)": r.finalPrice,
        "سهم درمانگر (تومان)": r.therapistAmount,
        "سهم دستیار (تومان)": r.assistantAmount,
        "سود خالص کلینیک (تومان)": r.clinicNetProfit,
        "تاریخ انجام (شمسی)": formatJalaliNumeric(new Date(r.createdAt)),
      }));
      break;
    }

    case "SERVICES": {
      if (!hasPermission(ctx.clinicUser, "services.view")) {
        throw new Error("مجوز دسترسی به لیست خدمات ندارید.");
      }

      const services = await prisma.service.findMany({
        where: { clinicId: ctx.clinicId },
        include: {
          subServices: {
            include: {
              defaultProducts: { include: { clinicProduct: true } },
            },
          },
        },
        orderBy: { title: "asc" },
      });

      fileNamePrefix = "clinic-services";
      rows = services.flatMap((s) =>
        s.subServices.map((sub) => ({
          "خدمت اصلی": s.title,
          "زیرسرویس": sub.title,
          "تعرفه (تومان)": sub.price,
          "مصرفی‌های پیش‌فرض":
            sub.defaultProducts
              .map(
                (dp) =>
                  `${dp.clinicProduct.name} (${dp.quantity} ${dp.clinicProduct.unit})`
              )
              .join("، ") || "-",
        }))
      );
      break;
    }

    case "STAFFS": {
      if (!hasPermission(ctx.clinicUser, "management.settings")) {
        throw new Error("مجوز دسترسی به لیست پرسنل ندارید.");
      }

      const staffs = await prisma.clinicUser.findMany({
        where: { clinicId: ctx.clinicId, deletedAt: null },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      });

      fileNamePrefix = "clinic-staffs";
      rows = staffs.map((st) => ({
        "نام و نام خانوادگی": st.user.fullName || "بدون نام",
        "شماره موبایل": st.user.phone,
        "سمت شغلی": st.jobTitle,
        "کد پرسنلی": st.personnelCode || "-",
        "تخصص": st.specialty || "-",
        "درمانگر": st.canBeTherapist ? "بله" : "خیر",
        "دستیار": st.canBeAssistant ? "بله" : "خیر",
        "معرف": st.canBeReferrer ? "بله" : "خیر",
        "وضعیت": st.isActive ? "فعال" : "غیرفعال",
      }));
      break;
    }
  }

  await prisma.dataExportLog.create({
    data: {
      clinicId: ctx.clinicId,
      clinicUserId: ctx.clinicUserId,
      entityType,
      format,
      recordCount: rows.length,
    },
  });

  return {
    rows,
    fileNamePrefix,
  };
}
