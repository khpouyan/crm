// app/clinic-dashboard/(dashboard)/settings/appointments/staff-schedule/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { ServiceTimingMode, StaffScheduleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { toGregorian } from "@/lib/jalali";

const STAFF_SCHEDULE_PATH =
  "/clinic-dashboard/settings/appointments/staff-schedule";

interface ClinicShiftWindow {
  startTime: string;
  endTime: string;
}

interface ClinicWorkingDayPolicy {
  isClinicHoliday: boolean;
  holidayNote: string | null;
  shifts: ClinicShiftWindow[];
}

function isClinicScheduleAdmin(
  ctx: NonNullable<Awaited<ReturnType<typeof getCurrentClinicContext>>>
) {
  return (
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "appointments.settings") ||
    hasPermission(ctx.clinicUser, "management.settings")
  );
}

function canEditTargetStaff(
  ctx: NonNullable<Awaited<ReturnType<typeof getCurrentClinicContext>>>,
  targetClinicUserId: string
) {
  if (isClinicScheduleAdmin(ctx)) return true;
  return (
    ctx.clinicUser.id === targetClinicUserId &&
    hasPermission(ctx.clinicUser, "appointments.self_schedule")
  );
}

function toSafeMinutes(val: unknown, fallback: number, max = 600): number {
  const n = Number(normalizePersianDigits(String(val ?? fallback)).trim());
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(max, Math.floor(n));
}

function isValidTimeFormat(val: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isJalaliLeapYear(jy: number): boolean {
  const rem = (((jy - 474) % 2820) + 2820) % 2820;
  return (((rem + 38) * 682) % 2816) < 682;
}

function getJalaliMonthDaysCount(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

function jalaliToGregorianUtc(jy: number, jm: number, jd: number): Date {
  const g = toGregorian(jy, jm, jd);
  return new Date(
    Date.UTC(g.getFullYear(), g.getMonth(), g.getDate(), 0, 0, 0, 0)
  );
}

function parseJalaliDateString(raw: string): {
  jy: number;
  jm: number;
  jd: number;
  utcDate: Date;
  weekday: number;
} | null {
  const normalized = normalizePersianDigits(raw || "").trim();
  const parts = normalized.split(/[/-]/).map((p) => Number(p.trim()));
  if (parts.length !== 3) return null;
  const [jy, jm, jd] = parts;
  if (
    !Number.isInteger(jy) ||
    !Number.isInteger(jm) ||
    !Number.isInteger(jd) ||
    jy < 1300 ||
    jy > 1500 ||
    jm < 1 ||
    jm > 12 ||
    jd < 1 ||
    jd > 31
  ) {
    return null;
  }

  const maxDayInMonth = getJalaliMonthDaysCount(jy, jm);
  if (jd > maxDayInMonth) return null;

  const utcDate = jalaliToGregorianUtc(jy, jm, jd);
  const weekday = (utcDate.getUTCDay() + 1) % 7;

  return { jy, jm, jd, utcDate, weekday };
}

function parseWorkingDayRow(row: {
  isClinicHoliday: boolean;
  holidayNote: string | null;
  shifts: unknown;
}): ClinicWorkingDayPolicy {
  const rawList = Array.isArray(row.shifts) ? row.shifts : [];
  const shifts: ClinicShiftWindow[] = rawList
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as { startTime?: unknown; endTime?: unknown };
      const st = typeof obj.startTime === "string" ? obj.startTime.trim() : "";
      const en = typeof obj.endTime === "string" ? obj.endTime.trim() : "";
      if (!isValidTimeFormat(st) || !isValidTimeFormat(en) || st >= en) {
        return null;
      }
      return { startTime: st, endTime: en };
    })
    .filter((s): s is ClinicShiftWindow => Boolean(s));

  return {
    isClinicHoliday: row.isClinicHoliday,
    holidayNote: row.holidayNote,
    shifts,
  };
}

function validateStaffSlotAgainstClinicWorkingDay(
  policy: ClinicWorkingDayPolicy | undefined,
  jalaliLabel: string,
  startTime: string,
  endTime: string
): { ok: true } | { ok: false; error: string } {
  if (!policy) {
    return {
      ok: false,
      error: `برای تاریخ ${jalaliLabel} در بخش «ساعات کاری کلینیک» ساعات کاری ثبت نشده است. ابتدا ساعات کاری کلینیک را تعیین کنید.`,
    };
  }

  if (policy.isClinicHoliday) {
    const reason = policy.holidayNote ? ` (${policy.holidayNote})` : "";
    return {
      ok: false,
      error: `تاریخ ${jalaliLabel} تعطیل رسمی/کلینیک${reason} است و امکان ثبت زمان حضور پرسنل در روز تعطیل وجود ندارد.`,
    };
  }

  if (policy.shifts.length === 0) {
    return {
      ok: false,
      error: `در تاریخ ${jalaliLabel} هیچ بازه کاری فعالی برای کلینیک ثبت نشده است.`,
    };
  }

  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  const fitsInsideAnyClinicShift = policy.shifts.some((sh) => {
    const shStart = timeToMinutes(sh.startTime);
    const shEnd = timeToMinutes(sh.endTime);
    return reqStart >= shStart && reqEnd <= shEnd;
  });

  if (!fitsInsideAnyClinicShift) {
    const allowedText = policy.shifts
      .map((s) => `${s.startTime} تا ${s.endTime}`)
      .join(" و ");
    return {
      ok: false,
      error: `بازه انتخاب‌شده (${startTime} تا ${endTime}) خارج از ساعات کاری کلینیک در روز ${jalaliLabel} است. بازه‌های مجاز کلینیک: ${allowedText}.`,
    };
  }

  return { ok: true };
}

export interface UpsertStaffServiceTimingInput {
  clinicUserId: string;
  serviceId: string;
  timingMode: ServiceTimingMode;
  prepBeforeMinutes: number;
  durationMinutes: number;
  stage1Minutes: number;
  freeGapMinutes: number;
  stage2Minutes: number;
  restAfterMinutes: number;
  requiresPrivacy: boolean;
}

export async function upsertStaffServiceTimingAction(
  input: UpsertStaffServiceTimingInput
) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canEditTargetStaff(ctx, input.clinicUserId)) {
      return {
        success: false,
        error: "شما مجوز ویرایش زمان‌بندی سرویس‌های این پرسنل را ندارید.",
      };
    }

    const targetStaff = await prisma.clinicUser.findFirst({
      where: {
        id: input.clinicUserId,
        clinicId: ctx.clinicId,
        deletedAt: null,
      },
      select: {
        id: true,
        isOwner: true,
        hasAllServicesAccess: true,
        assignedServices: { select: { id: true } },
      },
    });

    if (!targetStaff) {
      return { success: false, error: "پرسنل مورد نظر یافت نشد." };
    }

    const service = await prisma.service.findFirst({
      where: {
        id: input.serviceId,
        clinicId: ctx.clinicId,
      },
      select: { id: true },
    });

    if (!service) {
      return { success: false, error: "سرویس مورد نظر یافت نشد." };
    }

    const hasServiceAccess =
      targetStaff.isOwner ||
      targetStaff.hasAllServicesAccess ||
      targetStaff.assignedServices.some((s) => s.id === service.id);

    if (!hasServiceAccess) {
      return {
        success: false,
        error: "این سرویس به پرسنل انتخاب‌شده اختصاص داده نشده است.",
      };
    }

    const timingMode =
      input.timingMode === ServiceTimingMode.SPLIT_STAGE
        ? ServiceTimingMode.SPLIT_STAGE
        : ServiceTimingMode.SINGLE_STAGE;

    const prepBeforeMinutes = toSafeMinutes(input.prepBeforeMinutes, 0, 240);
    const durationMinutes = Math.max(
      5,
      toSafeMinutes(input.durationMinutes, 30, 480)
    );
    const stage1Minutes = Math.max(
      5,
      toSafeMinutes(input.stage1Minutes, 15, 240)
    );
    const freeGapMinutes = toSafeMinutes(input.freeGapMinutes, 0, 360);
    const stage2Minutes = Math.max(
      5,
      toSafeMinutes(input.stage2Minutes, 15, 240)
    );
    const restAfterMinutes = toSafeMinutes(input.restAfterMinutes, 0, 180);
    const requiresPrivacy = Boolean(input.requiresPrivacy);

    await prisma.clinicStaffServiceTiming.upsert({
      where: {
        clinicUserId_serviceId: {
          clinicUserId: targetStaff.id,
          serviceId: service.id,
        },
      },
      create: {
        clinicId: ctx.clinicId,
        clinicUserId: targetStaff.id,
        serviceId: service.id,
        timingMode,
        prepBeforeMinutes,
        durationMinutes,
        stage1Minutes,
        freeGapMinutes,
        stage2Minutes,
        restAfterMinutes,
        requiresPrivacy,
      },
      update: {
        timingMode,
        prepBeforeMinutes,
        durationMinutes,
        stage1Minutes,
        freeGapMinutes,
        stage2Minutes,
        restAfterMinutes,
        requiresPrivacy,
      },
    });

    revalidatePath(STAFF_SCHEDULE_PATH);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطا در ذخیره زمان‌بندی سرویس پرسنل.",
    };
  }
}

export interface UpsertStaffScheduleInput {
  id?: string;
  clinicUserId: string;
  spaceId: string | null;
  jalaliDate: string;
  startTime: string;
  endTime: string;
  status: StaffScheduleStatus;
  blocksClinicBook: boolean;
  note?: string | null;
  isActive: boolean;
  allowedServiceIds: string[];
}

const VALID_SCHEDULE_STATUSES = new Set<StaffScheduleStatus>([
  StaffScheduleStatus.IN_CLINIC,
  StaffScheduleStatus.ON_CALL,
  StaffScheduleStatus.RESIDENT,
  StaffScheduleStatus.HOSPITAL_SHIFT,
  StaffScheduleStatus.DAY_OFF,
]);

export async function upsertStaffScheduleAction(
  input: UpsertStaffScheduleInput
) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canEditTargetStaff(ctx, input.clinicUserId)) {
      return {
        success: false,
        error: "شما مجوز ویرایش برنامه حضور این پرسنل را ندارید.",
      };
    }

    const parsedDate = parseJalaliDateString(input.jalaliDate);
    if (!parsedDate) {
      return {
        success: false,
        error: "تاریخ شمسی انتخاب‌شده معتبر نیست.",
      };
    }

    const startTime = normalizePersianDigits(input.startTime || "").trim();
    const endTime = normalizePersianDigits(input.endTime || "").trim();

    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return { success: false, error: "فرمت ساعت شروع یا پایان معتبر نیست." };
    }

    if (startTime >= endTime) {
      return {
        success: false,
        error: "ساعت پایان شیفت باید بعد از ساعت شروع باشد.",
      };
    }

    if (!VALID_SCHEDULE_STATUSES.has(input.status)) {
      return { success: false, error: "وضعیت حضور انتخاب‌شده معتبر نیست." };
    }

    const workingDayRow = await prisma.clinicWorkingDay.findUnique({
      where: {
        clinicId_date: {
          clinicId: ctx.clinicId,
          date: parsedDate.utcDate,
        },
      },
      select: {
        isClinicHoliday: true,
        holidayNote: true,
        shifts: true,
      },
    });

    const policy = workingDayRow ? parseWorkingDayRow(workingDayRow) : undefined;
    const jalaliLabel = `${parsedDate.jy}/${String(parsedDate.jm).padStart(
      2,
      "0"
    )}/${String(parsedDate.jd).padStart(2, "0")}`;

    const slotCheck = validateStaffSlotAgainstClinicWorkingDay(
      policy,
      jalaliLabel,
      startTime,
      endTime
    );
    if (!slotCheck.ok) {
      return { success: false, error: slotCheck.error };
    }

    const targetStaff = await prisma.clinicUser.findFirst({
      where: {
        id: input.clinicUserId,
        clinicId: ctx.clinicId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!targetStaff) {
      return { success: false, error: "پرسنل مورد نظر یافت نشد." };
    }

    let verifiedSpaceId: string | null = null;
    if (input.spaceId && input.spaceId !== "NONE") {
      const space = await prisma.clinicSpace.findFirst({
        where: {
          id: input.spaceId,
          clinicId: ctx.clinicId,
        },
        select: { id: true },
      });
      if (!space) {
        return { success: false, error: "مکان انتخاب‌شده یافت نشد." };
      }
      verifiedSpaceId = space.id;
    }

    const uniqueServiceIds = Array.from(
      new Set((input.allowedServiceIds || []).filter(Boolean))
    );
    const validServices =
      uniqueServiceIds.length > 0
        ? await prisma.service.findMany({
            where: {
              clinicId: ctx.clinicId,
              id: { in: uniqueServiceIds },
            },
            select: { id: true },
          })
        : [];
    const verifiedServiceIds = validServices.map((s) => s.id);

    const blocksClinicBook =
      input.status === StaffScheduleStatus.HOSPITAL_SHIFT ||
      input.status === StaffScheduleStatus.RESIDENT ||
      input.status === StaffScheduleStatus.DAY_OFF
        ? true
        : Boolean(input.blocksClinicBook);

    if (input.id) {
      const existing = await prisma.clinicStaffSchedule.findFirst({
        where: {
          id: input.id,
          clinicId: ctx.clinicId,
          clinicUserId: targetStaff.id,
        },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, error: "برنامه زمانی مورد نظر یافت نشد." };
      }

      await prisma.clinicStaffSchedule.update({
        where: { id: existing.id },
        data: {
          spaceId: verifiedSpaceId,
          weekday: parsedDate.weekday,
          specificDate: parsedDate.utcDate,
          startTime,
          endTime,
          status: input.status,
          blocksClinicBook,
          note: input.note?.trim() || null,
          isActive: Boolean(input.isActive),
          allowedServices: {
            set: verifiedServiceIds.map((id) => ({ id })),
          },
        },
      });
    } else {
      await prisma.clinicStaffSchedule.create({
        data: {
          clinicId: ctx.clinicId,
          clinicUserId: targetStaff.id,
          spaceId: verifiedSpaceId,
          weekday: parsedDate.weekday,
          specificDate: parsedDate.utcDate,
          startTime,
          endTime,
          status: input.status,
          blocksClinicBook,
          note: input.note?.trim() || null,
          isActive: Boolean(input.isActive),
          allowedServices: {
            connect: verifiedServiceIds.map((id) => ({ id })),
          },
        },
      });
    }

    revalidatePath(STAFF_SCHEDULE_PATH);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطا در ثبت برنامه حضور پرسنل.",
    };
  }
}

export interface GenerateBulkStaffScheduleInput {
  clinicUserId: string;
  fromJalaliDate: string;
  toJalaliDate: string;
  weekdays: number[];
  spaceId: string | null;
  startTime: string;
  endTime: string;
  status: StaffScheduleStatus;
  blocksClinicBook: boolean;
  note?: string | null;
  allowedServiceIds: string[];
  replaceOnTargetDays: boolean;
}

export async function generateBulkStaffSchedulesAction(
  input: GenerateBulkStaffScheduleInput
) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canEditTargetStaff(ctx, input.clinicUserId)) {
      return {
        success: false,
        error: "شما مجوز ایجاد برنامه بازه‌ای برای این پرسنل را ندارید.",
      };
    }

    const fromParsed = parseJalaliDateString(input.fromJalaliDate);
    const toParsed = parseJalaliDateString(input.toJalaliDate);

    if (!fromParsed || !toParsed) {
      return {
        success: false,
        error: "تاریخ شروع یا پایان بازه شمسی معتبر نیست.",
      };
    }

    if (fromParsed.utcDate.getTime() > toParsed.utcDate.getTime()) {
      return {
        success: false,
        error: "تاریخ پایان بازه باید مساوی یا بعد از تاریخ شروع باشد.",
      };
    }

    const startTime = normalizePersianDigits(input.startTime || "").trim();
    const endTime = normalizePersianDigits(input.endTime || "").trim();
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return { success: false, error: "فرمت ساعت شروع یا پایان معتبر نیست." };
    }
    if (startTime >= endTime) {
      return {
        success: false,
        error: "ساعت پایان شیفت باید بعد از ساعت شروع باشد.",
      };
    }

    if (!VALID_SCHEDULE_STATUSES.has(input.status)) {
      return { success: false, error: "وضعیت حضور انتخاب‌شده معتبر نیست." };
    }

    const targetWeekdays = new Set(
      (input.weekdays || [])
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    );

    if (targetWeekdays.size === 0) {
      return {
        success: false,
        error: "حداقل یک روز از هفته را انتخاب کنید.",
      };
    }

    const targetStaff = await prisma.clinicUser.findFirst({
      where: {
        id: input.clinicUserId,
        clinicId: ctx.clinicId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!targetStaff) {
      return { success: false, error: "پرسنل مورد نظر یافت نشد." };
    }

    let verifiedSpaceId: string | null = null;
    if (input.spaceId && input.spaceId !== "NONE") {
      const space = await prisma.clinicSpace.findFirst({
        where: { id: input.spaceId, clinicId: ctx.clinicId },
        select: { id: true },
      });
      if (!space) {
        return { success: false, error: "مکان انتخاب‌شده یافت نشد." };
      }
      verifiedSpaceId = space.id;
    }

    const uniqueServiceIds = Array.from(
      new Set((input.allowedServiceIds || []).filter(Boolean))
    );
    const validServices =
      uniqueServiceIds.length > 0
        ? await prisma.service.findMany({
            where: { clinicId: ctx.clinicId, id: { in: uniqueServiceIds } },
            select: { id: true },
          })
        : [];
    const verifiedServiceIds = validServices.map((s) => s.id);

    const blocksClinicBook =
      input.status === StaffScheduleStatus.HOSPITAL_SHIFT ||
      input.status === StaffScheduleStatus.RESIDENT ||
      input.status === StaffScheduleStatus.DAY_OFF
        ? true
        : Boolean(input.blocksClinicBook);

    const candidateDates: Array<{
      date: Date;
      weekday: number;
      jalaliLabel: string;
    }> = [];
    let curJy = fromParsed.jy;
    let curJm = fromParsed.jm;
    let curJd = fromParsed.jd;

    for (let guard = 0; guard < 370; guard++) {
      const curUtc = jalaliToGregorianUtc(curJy, curJm, curJd);
      if (curUtc.getTime() > toParsed.utcDate.getTime()) break;

      const weekday = (curUtc.getUTCDay() + 1) % 7;
      if (targetWeekdays.has(weekday)) {
        candidateDates.push({
          date: curUtc,
          weekday,
          jalaliLabel: `${curJy}/${String(curJm).padStart(2, "0")}/${String(
            curJd
          ).padStart(2, "0")}`,
        });
      }

      const daysInCurMonth = getJalaliMonthDaysCount(curJy, curJm);
      if (curJd < daysInCurMonth) {
        curJd += 1;
      } else {
        curJd = 1;
        if (curJm < 12) {
          curJm += 1;
        } else {
          curJm = 1;
          curJy += 1;
        }
      }
    }

    if (candidateDates.length === 0) {
      return {
        success: false,
        error: "هیچ روزی در بازه انتخاب‌شده با روزهای هفته مشخص‌شده منطبق نبود.",
      };
    }

    const workingDaysRows = await prisma.clinicWorkingDay.findMany({
      where: {
        clinicId: ctx.clinicId,
        date: {
          gte: fromParsed.utcDate,
          lte: toParsed.utcDate,
        },
      },
      select: {
        date: true,
        isClinicHoliday: true,
        holidayNote: true,
        shifts: true,
      },
    });

    const policyByIso = new Map<string, ClinicWorkingDayPolicy>();
    for (const row of workingDaysRows) {
      policyByIso.set(
        row.date.toISOString().slice(0, 10),
        parseWorkingDayRow(row)
      );
    }

    const validDates: Array<{ date: Date; weekday: number }> = [];
    let skippedHolidayOrOutOfHours = 0;

    for (const item of candidateDates) {
      const iso = item.date.toISOString().slice(0, 10);
      const pol = policyByIso.get(iso);
      const check = validateStaffSlotAgainstClinicWorkingDay(
        pol,
        item.jalaliLabel,
        startTime,
        endTime
      );
      if (check.ok) {
        validDates.push({ date: item.date, weekday: item.weekday });
      } else {
        skippedHolidayOrOutOfHours += 1;
      }
    }

    if (validDates.length === 0) {
      return {
        success: false,
        error:
          "هیچ روزی در بازه انتخاب‌شده با ساعات کاری فعال کلینیک یا بازه ساعتی انتخاب‌شده هم‌خوانی نداشت (روزهای تعطیل یا خارج از ساعت کاری کلینیک مجاز نیستند).",
      };
    }

    await prisma.$transaction(async (tx) => {
      const targetDateList = validDates.map((d) => d.date);

      if (input.replaceOnTargetDays) {
        await tx.clinicStaffSchedule.deleteMany({
          where: {
            clinicId: ctx.clinicId,
            clinicUserId: targetStaff.id,
            specificDate: { in: targetDateList },
          },
        });
      }

      for (const item of validDates) {
        await tx.clinicStaffSchedule.create({
          data: {
            clinicId: ctx.clinicId,
            clinicUserId: targetStaff.id,
            spaceId: verifiedSpaceId,
            weekday: item.weekday,
            specificDate: item.date,
            startTime,
            endTime,
            status: input.status,
            blocksClinicBook,
            note: input.note?.trim() || null,
            isActive: true,
            allowedServices: {
              connect: verifiedServiceIds.map((id) => ({ id })),
            },
          },
        });
      }
    });

    revalidatePath(STAFF_SCHEDULE_PATH);
    return {
      success: true,
      createdCount: validDates.length,
      skippedCount: skippedHolidayOrOutOfHours,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطا در تولید برنامه بازه‌ای پرسنل.",
    };
  }
}

export async function deleteStaffScheduleAction(scheduleId: string) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    const existing = await prisma.clinicStaffSchedule.findFirst({
      where: {
        id: scheduleId,
        clinicId: ctx.clinicId,
      },
      select: {
        id: true,
        clinicUserId: true,
      },
    });

    if (!existing) {
      return { success: false, error: "برنامه حضور مورد نظر یافت نشد." };
    }

    if (!canEditTargetStaff(ctx, existing.clinicUserId)) {
      return {
        success: false,
        error: "شما مجوز حذف این برنامه حضور را ندارید.",
      };
    }

    await prisma.clinicStaffSchedule.delete({
      where: { id: existing.id },
    });

    revalidatePath(STAFF_SCHEDULE_PATH);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "خطا در حذف برنامه حضور.",
    };
  }
}