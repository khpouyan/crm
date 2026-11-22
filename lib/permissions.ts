export type PermissionKey =
  // پرونده
  | "patients.view"
  | "patients.create"
  | "patients.edit"
  | "patients.delete"
  | "patients.visit_report"
  // سرویس
  | "services.view"
  | "services.create"
  | "services.edit"
  | "services.delete"
  // نوبت
  | "appointments.view"
  | "appointments.create"
  | "appointments.edit"
  | "appointments.delete"
  | "appointments.settings"
  // مالی و انبار
  | "finance.accounting"
  | "finance.inventory"
  | "finance.visit_report"
  | "finance.commission"
  // ارتباط و ابزارها
  | "tools.consultation"
  | "tools.reviews"
  | "tools.inventory_view"
  // مدیریت
  | "management.settings"
  // سایر
  | "other.messages"
  | "other.discounts";

export interface PermissionItem {
  key: PermissionKey;
  label: string;
}

export interface PermissionGroup {
  id: string;
  title: string;
  items: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "patients",
    title: "پرونده",
    items: [
      { key: "patients.view", label: "نمایش پرونده" },
      { key: "patients.create", label: "ثبت پرونده" },
      { key: "patients.edit", label: "ویرایش پرونده" },
      { key: "patients.delete", label: "حذف پرونده" },
      { key: "patients.visit_report", label: "گزارش مراجعات" },
    ],
  },
  {
    id: "services",
    title: "سرویس",
    items: [
      { key: "services.view", label: "نمایش سرویس" },
      { key: "services.create", label: "ثبت سرویس" },
      { key: "services.edit", label: "ویرایش سرویس" },
      { key: "services.delete", label: "حذف سرویس" },
    ],
  },
  {
    id: "appointments",
    title: "نوبت",
    items: [
      { key: "appointments.view", label: "نمایش نوبت" },
      { key: "appointments.create", label: "ثبت نوبت" },
      { key: "appointments.edit", label: "ویرایش نوبت" },
      { key: "appointments.delete", label: "حذف نوبت" },
      {
        key: "appointments.settings",
        label: "تنظیمات نوبت‌دهی کل کلینیک",
      },
    ],
  },
  {
    id: "finance",
    title: "مالی و انبار",
    items: [
      { key: "finance.accounting", label: "صندوق و حسابداری" },
      { key: "finance.inventory", label: "انبار کالا و خدمات" },
      { key: "finance.visit_report", label: "گزارش مراجعات مالی" },
      { key: "finance.commission", label: "کمیسیون و پرکیس" },
    ],
  },
  {
    id: "tools",
    title: "ارتباط و ابزارها",
    items: [
      { key: "tools.consultation", label: "مشاوره" },
      { key: "tools.reviews", label: "نظرات و نظرسنجی" },
      { key: "tools.inventory_view", label: "مشاهده موجودی انبار" },
    ],
  },
  {
    id: "management",
    title: "مدیریت",
    items: [
      { key: "management.settings", label: "تنظیمات و پرسنل" },
    ],
  },
  {
    id: "other",
    title: "سایر",
    items: [
      { key: "other.messages", label: "پیام‌ها" },
      { key: "other.discounts", label: "تخفیف‌ها" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (group) => group.items.map((item) => item.key)
);

export interface StaffAccessProfile {
  isOwner: boolean;
  isActive: boolean;
  permissions: string[];
  hasAllServicesAccess: boolean;
  assignedServices: { id: string }[];
}

/**
 * ۱. بررسی اینکه آیا پرسنل مجوز انجام یک عملیات خاص را دارد یا خیر
 */
export function hasPermission(
  staff: Pick<StaffAccessProfile, "isOwner" | "isActive" | "permissions">,
  permission: PermissionKey
): boolean {
  if (!staff.isActive) return false;
  if (staff.isOwner) return true;
  return staff.permissions.includes(permission);
}

/**
 * ۲. بررسی ترکیبی: آیا پرسنل هم مجوز عملیات را دارد و هم به دسته خدمات مشخص‌شده دسترسی دارد؟
 * مثال: canAccessServiceCategory(staff, "appointments.view", laserServiceId)
 */
export function canAccessServiceCategory(
  staff: StaffAccessProfile,
  permission: PermissionKey,
  serviceId: string
): boolean {
  if (!hasPermission(staff, permission)) return false;
  if (staff.isOwner || staff.hasAllServicesAccess) return true;
  return staff.assignedServices.some((s) => s.id === serviceId);
}

/**
 * ۳. تولید فیلتر آماده برای کوئری‌های Prisma بر اساس دسته خدمات مجاز پرسنل
 * کاربرد: در صفحات سرویس، نوبت‌دهی، پرونده و گزارش مالی، فقط رکوردهای مرتبط با خدمات مجاز پرسنل برگردانده می‌شود.
 */
export function getAllowedServiceIds(staff: StaffAccessProfile): string[] | "ALL" {
  if (staff.isOwner || staff.hasAllServicesAccess) {
    return "ALL";
  }
  return staff.assignedServices.map((s) => s.id);
}

/**
 * ۴. شرط آماده Prisma برای مدل Service (فیلتر کردن دسته‌بندی خدمات)
 */
export function buildServiceScopeFilter(staff: StaffAccessProfile) {
  const allowed = getAllowedServiceIds(staff);
  if (allowed === "ALL") return {};
  return {
    id: { in: allowed },
  };
}

/**
 * ۵. شرط آماده Prisma برای مدل ProvidedService و گزارشات مالی/مراجعات
 * تضمین می‌کند اپراتور لیزر فقط سوابق و گزارش مالی زیرسرویس‌های دسته لیزر را ببیند.
 */
export function buildProvidedServiceScopeFilter(staff: StaffAccessProfile) {
  const allowed = getAllowedServiceIds(staff);
  if (allowed === "ALL") return {};
  return {
    subService: {
      serviceId: { in: allowed },
    },
  };
}