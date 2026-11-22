// app/clinic-dashboard/(dashboard)/settings/appointments/working-hours/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { toGregorian, toJalali } from "@/lib/jalali";

export type ShiftCategory =
  | "MORNING"
  | "AFTERNOON"
  | "FULL_DAY"
  | "ALL_DAY"
  | "CUSTOM";

export interface WorkingShiftInput {
  id: string;
  category: ShiftCategory;
  label?: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface UpsertWorkingDayInput {
  dateIso: string; // YYYY-MM-DD (UTC midnight)
  isClinicHoliday: boolean;
  holidayNote?: string | null;
  shifts: WorkingShiftInput[];
}

export interface BulkApplyMonthWorkingHoursInput {
  jy: number;
  jm: number;
  activeWeekdays: number[]; // 0 = شنبه ... 6 = جمعه
  clinicHolidayWeekdays: number[]; // روزهای هفته‌ای که به عنوان تعطیل کلینیک در ماه علامت بخورند
  holidayNote?: string | null;
  shifts: WorkingShiftInput[];
  overwriteExisting?: boolean;
}

const WORKING_HOURS_PATH =
  "/clinic-dashboard/settings/appointments/working-hours";

function canManageWorkingHours(
  ctx: NonNullable<Awaited<ReturnType<typeof getCurrentClinicContext>>>
) {
  return (
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "appointments.settings")
  );
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function sanitizeShifts(
  rawShifts: WorkingShiftInput[],
  isClinicHoliday: boolean
): { ok: true; shifts: WorkingShiftInput[] } | { ok: false; error: string } {
  if (isClinicHoliday) {
    return { ok: true, shifts: [] };
  }

  if (!Array.isArray(rawShifts) || rawShifts.length === 0) {
    return {
      ok: false,
      error:
        "حداقل یک بازه زمانی کاری برای روز فعال تعیین کنید یا روز را تعطیل کلینیک بزنید.",
    };
  }

  const cleaned: WorkingShiftInput[] = [];

  for (let i = 0; i < rawShifts.length; i++) {
    const s = rawShifts[i];
    if (s.category === "ALL_DAY") {
      cleaned.push({
        id: s.id || `shift-${i + 1}`,
        category: "ALL_DAY",
        label: s.label?.trim() || "شبانه روزی",
        startTime: "00:00",
        endTime: "23:59",
      });
      continue;
    }

    const start = (s.startTime || "").trim();
    const end = (s.endTime || "").trim();

    if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end)) {
      return {
        ok: false,
        error: `ساعت شروع یا پایان در بازه شماره ${i + 1} نامعتبر است (فرمت معتبر: HH:mm).`,
      };
    }

    if (start >= end) {
      return {
        ok: false,
        error: `در بازه شماره ${i + 1}، ساعت پایان باید بزرگ‌تر از ساعت شروع باشد.`,
      };
    }

    cleaned.push({
      id: s.id || `shift-${i + 1}`,
      category: s.category || "CUSTOM",
      label: s.label?.trim() || undefined,
      startTime: start,
      endTime: end,
    });
  }

  return { ok: true, shifts: cleaned };
}

function parseUtcDayDate(dateIso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt;
}

function jalaliDayToUtcMidnight(jy: number, jm: number, jd: number): Date {
  const g = toGregorian(jy, jm, jd);
  return new Date(
    Date.UTC(g.getFullYear(), g.getMonth(), g.getDate(), 0, 0, 0, 0)
  );
}

function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const g30 = toGregorian(jy, 12, 30);
  const j30 = toJalali(g30);
  return j30.jy === jy && j30.jm === 12 && j30.jd === 30 ? 30 : 29;
}

/**
 * ذخیره یا ویرایش وضعیت و ساعات کاری یک روز مشخص در تقویم کلینیک
 */
export async function upsertClinicWorkingDayAction(
  input: UpsertWorkingDayInput
) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canManageWorkingHours(ctx)) {
      return {
        success: false,
        error:
          "فقط مدیر کلینیک یا کاربر دارای دسترسی تنظیمات نوبت‌دهی کلینیک می‌تواند ساعات کاری را تغییر دهد.",
      };
    }

    const targetDate = parseUtcDayDate(input.dateIso);
    if (!targetDate) {
      return { success: false, error: "تاریخ انتخاب‌شده معتبر نیست." };
    }

    const sanitized = sanitizeShifts(input.shifts, input.isClinicHoliday);
    if (!sanitized.ok) {
      return { success: false, error: sanitized.error };
    }

    await prisma.clinicWorkingDay.upsert({
      where: {
        clinicId_date: {
          clinicId: ctx.clinicId,
          date: targetDate,
        },
      },
      create: {
        clinicId: ctx.clinicId,
        date: targetDate,
        isClinicHoliday: input.isClinicHoliday,
        holidayNote: input.isClinicHoliday
          ? input.holidayNote?.trim() || "تعطیل کلینیک"
          : null,
        shifts: JSON.parse(JSON.stringify(sanitized.shifts)),
      },
      update: {
        isClinicHoliday: input.isClinicHoliday,
        holidayNote: input.isClinicHoliday
          ? input.holidayNote?.trim() || "تعطیل کلینیک"
          : null,
        shifts: JSON.parse(JSON.stringify(sanitized.shifts)),
      },
    });

    revalidatePath(WORKING_HOURS_PATH);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطا در ذخیره ساعات کاری روز مورد نظر.",
    };
  }
}

/**
 * پاک کردن تنظیمات سفارشی یک روز خاص
 */
export async function resetClinicWorkingDayAction(dateIso: string) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canManageWorkingHours(ctx)) {
      return {
        success: false,
        error: "شما مجوز تغییر ساعات کاری کلینیک را ندارید.",
      };
    }

    const targetDate = parseUtcDayDate(dateIso);
    if (!targetDate) {
      return { success: false, error: "تاریخ انتخاب‌شده معتبر نیست." };
    }

    await prisma.clinicWorkingDay.deleteMany({
      where: {
        clinicId: ctx.clinicId,
        date: targetDate,
      },
    });

    revalidatePath(WORKING_HOURS_PATH);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "خطا در بازنشانی تنظیمات روز.",
    };
  }
}

/**
 * اعمال گروهی روزهای کاری، تعطیلات کلینیک و بازه‌های ساعات کاری برای کل یک ماه شمسی
 */
export async function applyBulkMonthWorkingHoursAction(
  input: BulkApplyMonthWorkingHoursInput
) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canManageWorkingHours(ctx)) {
      return {
        success: false,
        error:
          "فقط مدیر کلینیک یا کاربر دارای دسترسی تنظیمات نوبت‌دهی کلینیک می‌تواند تنظیمات ماهانه را اعمال کند.",
      };
    }

    if (input.jm < 1 || input.jm > 12 || input.jy < 1300 || input.jy > 1500) {
      return { success: false, error: "سال یا ماه شمسی نامعتبر است." };
    }

    const activeSet = new Set(input.activeWeekdays || []);
    const holidaySet = new Set(input.clinicHolidayWeekdays || []);

    const hasAnyActiveDay = activeSet.size > 0;
    const sanitized = hasAnyActiveDay
      ? sanitizeShifts(input.shifts, false)
      : { ok: true as const, shifts: [] as WorkingShiftInput[] };

    if (!sanitized.ok) {
      return { success: false, error: sanitized.error };
    }

    const daysInMonth = getDaysInJalaliMonth(input.jy, input.jm);
    const rangeStart = jalaliDayToUtcMidnight(input.jy, input.jm, 1);
    const rangeEnd = jalaliDayToUtcMidnight(input.jy, input.jm, daysInMonth);

    const existingDays = await prisma.clinicWorkingDay.findMany({
      where: {
        clinicId: ctx.clinicId,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      select: { date: true },
    });

    const existingIsoSet = new Set(
      existingDays.map((row) => row.date.toISOString().slice(0, 10))
    );

    const operations = [];

    for (let jd = 1; jd <= daysInMonth; jd++) {
      const gDate = toGregorian(input.jy, input.jm, jd);
      const weekday = (gDate.getDay() + 1) % 7; // 0 = شنبه ... 6 = جمعه
      const utcDate = new Date(
        Date.UTC(gDate.getFullYear(), gDate.getMonth(), gDate.getDate())
      );
      const dateIso = utcDate.toISOString().slice(0, 10);

      if (!input.overwriteExisting && existingIsoSet.has(dateIso)) {
        continue;
      }

      const isHoliday = holidaySet.has(weekday);
      const isWorkday = !isHoliday && activeSet.has(weekday);

      if (!isHoliday && !isWorkday) {
        continue;
      }

      const dayShifts = isHoliday ? [] : sanitized.shifts;

      operations.push(
        prisma.clinicWorkingDay.upsert({
          where: {
            clinicId_date: {
              clinicId: ctx.clinicId,
              date: utcDate,
            },
          },
          create: {
            clinicId: ctx.clinicId,
            date: utcDate,
            isClinicHoliday: isHoliday,
            holidayNote: isHoliday
              ? input.holidayNote?.trim() || "تعطیل کلینیک"
              : null,
            shifts: JSON.parse(JSON.stringify(dayShifts)),
          },
          update: {
            isClinicHoliday: isHoliday,
            holidayNote: isHoliday
              ? input.holidayNote?.trim() || "تعطیل کلینیک"
              : null,
            shifts: JSON.parse(JSON.stringify(dayShifts)),
          },
        })
      );
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    revalidatePath(WORKING_HOURS_PATH);
    return {
      success: true,
      updatedCount: operations.length,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطا در اعمال گروهی ساعات کاری ماه.",
    };
  }
}