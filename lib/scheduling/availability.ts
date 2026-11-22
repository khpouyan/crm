// lib/scheduling/availability.ts
import {
  AppointmentBookingSource,
  AppointmentStatus,
  ClinicSpaceType,
  ServiceTimingMode,
  StaffScheduleStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { toGregorian, toJalali } from "@/lib/jalali";

export interface TimeWindow {
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  label?: string;
}

export interface EffectiveServiceTiming {
  timingMode: ServiceTimingMode;
  prepBeforeMinutes: number;
  durationMinutes: number;
  stage1Minutes: number;
  freeGapMinutes: number;
  stage2Minutes: number;
  restAfterMinutes: number;
  requiresPrivacy: boolean;
  source: "STAFF_OVERRIDE" | "SUB_SERVICE" | "SERVICE_DEFAULT";
}

export interface ComputedAppointmentSchedule {
  arrivalTime: string;
  startTime: string;
  endTime: string;
  blockEndTime: string;
  arrivalMinutes: number;
  startMinutes: number;
  endMinutes: number;
  blockEndMinutes: number;
  /** بازه‌های زمانی که پرسنل و فضا عملاً درگیر انجام کار هستند (در SPLIT_STAGE تایم آزاد میانی اشغال نیست) */
  activeOccupiedWindows: TimeWindow[];
  /** بازه‌های اشغال فضای فیزیکی (شامل رعایت پرایوسی در صورت نیاز) */
  spaceOccupiedWindows: TimeWindow[];
}

export interface ValidationIssue {
  code:
    | "INVALID_INPUT"
    | "CLINIC_NO_WORKING_HOURS"
    | "CLINIC_HOLIDAY"
    | "OUTSIDE_CLINIC_SHIFTS"
    | "STAFF_NOT_FOUND"
    | "SERVICE_NOT_ASSIGNED_TO_STAFF"
    | "STAFF_NO_SHIFT_IN_WINDOW"
    | "STAFF_BOOKING_BLOCKED"
    | "SPACE_NOT_FOUND"
    | "SPACE_INACTIVE"
    | "SPACE_SERVICE_NOT_ALLOWED"
    | "SPACE_PRIVACY_CONFLICT"
    | "SPACE_CAPACITY_FULL"
    | "STAFF_TIME_CONFLICT"
    | "CLIENT_TIME_CONFLICT";
  blocking: boolean;
  message: string;
}

export interface EvaluateSlotInput {
  clinicId: string;
  clientId?: string;
  serviceId: string;
  subServiceId?: string | null;
  therapistId?: string | null;
  spaceId?: string | null;
  /** تاریخ به صورت YYYY-MM-DD (UTC midnight) یا تاریخ شمسی YYYY/MM/DD */
  dateInput: string | Date;
  /** ساعت شروع سرویس (HH:mm) — اگر arrivalIncluded = true باشد، ساعت حضور محسوب می‌شود */
  startTime: string;
  bookingSource: AppointmentBookingSource;
  allowManualOverride?: boolean;
  excludeAppointmentId?: string;
}

export interface EvaluateSlotResult {
  valid: boolean;
  canOverrideManually: boolean;
  issues: ValidationIssue[];
  reasons: string[];
  timing: EffectiveServiceTiming | null;
  computed: ComputedAppointmentSchedule | null;
  resolvedSpaceId: string | null;
  staffStatus: StaffScheduleStatus | null;
}

export interface AvailableSlotSuggestion {
  arrivalTime: string;
  startTime: string;
  endTime: string;
  blockEndTime: string;
  therapistId: string | null;
  therapistName: string | null;
  spaceId: string | null;
  spaceName: string | null;
  staffStatus: StaffScheduleStatus;
  isConditionalOnCall: boolean;
  timingMode: ServiceTimingMode;
  freeGapMinutes: number;
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const BLOCKING_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
];

export function normalizeTimeString(raw: string): string | null {
  const normalized = normalizePersianDigits(String(raw || "")).trim();
  const parts = normalized.split(":");
  if (parts.length !== 2) return null;
  const hh = parts[0].padStart(2, "0");
  const mm = parts[1].padStart(2, "0");
  const candidate = `${hh}:${mm}`;
  if (!TIME_REGEX.test(candidate)) return null;
  return candidate;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.floor(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * تبدیل ورودی تاریخ به تاریخ UTC midnight روز تقویمی + برچسب شمسی خوانا
 */
export function resolveCalendarDate(input: string | Date): {
  utcMidnight: Date;
  jalaliDisplay: string;
  weekday: number; // 0=شنبه .. 6=جمعه
} | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    const utcMidnight = new Date(
      Date.UTC(
        input.getUTCFullYear(),
        input.getUTCMonth(),
        input.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    const localRef = new Date(
      utcMidnight.getUTCFullYear(),
      utcMidnight.getUTCMonth(),
      utcMidnight.getUTCDate()
    );
    const j = toJalali(localRef);
    const weekday = (utcMidnight.getUTCDay() + 1) % 7;
    return {
      utcMidnight,
      jalaliDisplay: `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(
        j.jd
      ).padStart(2, "0")}`,
      weekday,
    };
  }

  const norm = normalizePersianDigits(String(input || "")).trim();

  // فرمت YYYY-MM-DD (میلادی)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(norm);
  if (isoMatch) {
    const gy = Number(isoMatch[1]);
    const gm = Number(isoMatch[2]);
    const gd = Number(isoMatch[3]);
    const utcMidnight = new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0, 0));
    if (
      utcMidnight.getUTCFullYear() !== gy ||
      utcMidnight.getUTCMonth() !== gm - 1 ||
      utcMidnight.getUTCDate() !== gd
    ) {
      return null;
    }
    const j = toJalali(new Date(gy, gm - 1, gd));
    return {
      utcMidnight,
      jalaliDisplay: `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(
        j.jd
      ).padStart(2, "0")}`,
      weekday: (utcMidnight.getUTCDay() + 1) % 7,
    };
  }

  // فرمت YYYY/MM/DD یا YYYY-MM-DD شمسی
  const jMatch = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(norm);
  if (jMatch) {
    const jy = Number(jMatch[1]);
    const jm = Number(jMatch[2]);
    const jd = Number(jMatch[3]);
    if (jy >= 1300 && jy <= 1500 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      const gDate = toGregorian(jy, jm, jd);
      const checkJ = toJalali(gDate);
      if (checkJ.jy !== jy || checkJ.jm !== jm || checkJ.jd !== jd) {
        return null;
      }
      const utcMidnight = new Date(
        Date.UTC(
          gDate.getFullYear(),
          gDate.getMonth(),
          gDate.getDate(),
          0,
          0,
          0,
          0
        )
      );
      return {
        utcMidnight,
        jalaliDisplay: `${jy}/${String(jm).padStart(2, "0")}/${String(
          jd
        ).padStart(2, "0")}`,
        weekday: (utcMidnight.getUTCDay() + 1) % 7,
      };
    }
  }

  return null;
}

/**
 * محاسبه زمان‌بندی مؤثر سرویس بر اساس اولویت:
 * ۱. شخصی‌سازی پرسنل (ClinicStaffServiceTiming)
 * ۲. زیرسرویس (SubService)
 * ۳. پیش‌فرض خدمت اصلی (Service)
 */
export function resolveEffectiveTiming(params: {
  service: {
    timingMode: ServiceTimingMode;
    prepBeforeMinutes: number;
    durationMinutes: number;
    stage1Minutes: number;
    freeGapMinutes: number;
    stage2Minutes: number;
    restAfterMinutes: number;
    requiresPrivacy: boolean;
  };
  subService?: {
    timingMode: ServiceTimingMode | null;
    prepBeforeMinutes: number | null;
    durationMinutes: number | null;
    stage1Minutes: number | null;
    freeGapMinutes: number | null;
    stage2Minutes: number | null;
    restAfterMinutes: number | null;
    requiresPrivacy: boolean | null;
  } | null;
  staffTiming?: {
    timingMode: ServiceTimingMode;
    prepBeforeMinutes: number;
    durationMinutes: number;
    stage1Minutes: number;
    freeGapMinutes: number;
    stage2Minutes: number;
    restAfterMinutes: number;
    requiresPrivacy: boolean;
  } | null;
}): EffectiveServiceTiming {
  const { service, subService, staffTiming } = params;

  if (staffTiming) {
    return {
      timingMode: staffTiming.timingMode,
      prepBeforeMinutes: Math.max(0, staffTiming.prepBeforeMinutes),
      durationMinutes: Math.max(5, staffTiming.durationMinutes),
      stage1Minutes: Math.max(5, staffTiming.stage1Minutes),
      freeGapMinutes: Math.max(0, staffTiming.freeGapMinutes),
      stage2Minutes: Math.max(5, staffTiming.stage2Minutes),
      restAfterMinutes: Math.max(0, staffTiming.restAfterMinutes),
      requiresPrivacy: Boolean(staffTiming.requiresPrivacy),
      source: "STAFF_OVERRIDE",
    };
  }

  const hasSubOverride =
    subService &&
    (subService.timingMode !== null ||
      subService.durationMinutes !== null ||
      subService.stage1Minutes !== null ||
      subService.prepBeforeMinutes !== null ||
      subService.restAfterMinutes !== null ||
      subService.requiresPrivacy !== null);

  if (hasSubOverride && subService) {
    return {
      timingMode: subService.timingMode ?? service.timingMode,
      prepBeforeMinutes: Math.max(
        0,
        subService.prepBeforeMinutes ?? service.prepBeforeMinutes
      ),
      durationMinutes: Math.max(
        5,
        subService.durationMinutes ?? service.durationMinutes
      ),
      stage1Minutes: Math.max(
        5,
        subService.stage1Minutes ?? service.stage1Minutes
      ),
      freeGapMinutes: Math.max(
        0,
        subService.freeGapMinutes ?? service.freeGapMinutes
      ),
      stage2Minutes: Math.max(
        5,
        subService.stage2Minutes ?? service.stage2Minutes
      ),
      restAfterMinutes: Math.max(
        0,
        subService.restAfterMinutes ?? service.restAfterMinutes
      ),
      requiresPrivacy: Boolean(
        subService.requiresPrivacy ?? service.requiresPrivacy
      ),
      source: "SUB_SERVICE",
    };
  }

  return {
    timingMode: service.timingMode,
    prepBeforeMinutes: Math.max(0, service.prepBeforeMinutes),
    durationMinutes: Math.max(5, service.durationMinutes),
    stage1Minutes: Math.max(5, service.stage1Minutes),
    freeGapMinutes: Math.max(0, service.freeGapMinutes),
    stage2Minutes: Math.max(5, service.stage2Minutes),
    restAfterMinutes: Math.max(0, service.restAfterMinutes),
    requiresPrivacy: Boolean(service.requiresPrivacy),
    source: "SERVICE_DEFAULT",
  };
}

/**
 * محاسبه دقیق ساعات شروع، پایان و بازه‌های اشغال (شامل تایم آزاد میانی در SPLIT_STAGE)
 */
export function computeAppointmentSchedule(
  serviceStartTime: string,
  timing: EffectiveServiceTiming
): ComputedAppointmentSchedule {
  const startMinutes = timeToMinutes(serviceStartTime);
  const arrivalMinutes = Math.max(0, startMinutes - timing.prepBeforeMinutes);

  if (timing.timingMode === ServiceTimingMode.SPLIT_STAGE) {
    const stage1End = startMinutes + timing.stage1Minutes;
    const stage2Start = stage1End + timing.freeGapMinutes;
    const stage2End = stage2Start + timing.stage2Minutes;
    const blockEndMinutes = stage2End + timing.restAfterMinutes;

    const activeOccupiedWindows: TimeWindow[] = [
      {
        startMinutes,
        endMinutes: stage1End,
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(stage1End),
        label: "مرحله اول (آماده‌سازی / خون‌گیری)",
      },
      {
        startMinutes: stage2Start,
        endMinutes: stage2End + timing.restAfterMinutes,
        startTime: minutesToTime(stage2Start),
        endTime: minutesToTime(stage2End + timing.restAfterMinutes),
        label: "مرحله دوم و پاکسازی",
      },
    ];

    const spaceOccupiedWindows: TimeWindow[] = timing.requiresPrivacy
      ? [
          {
            startMinutes: arrivalMinutes,
            endMinutes: blockEndMinutes,
            startTime: minutesToTime(arrivalMinutes),
            endTime: minutesToTime(blockEndMinutes),
            label: "اشغال فضای خصوصی",
          },
        ]
      : [
          {
            startMinutes,
            endMinutes: stage1End,
            startTime: minutesToTime(startMinutes),
            endTime: minutesToTime(stage1End),
            label: "مرحله اول",
          },
          {
            startMinutes: stage2Start,
            endMinutes: blockEndMinutes,
            startTime: minutesToTime(stage2Start),
            endTime: minutesToTime(blockEndMinutes),
            label: "مرحله دوم و پاکسازی",
          },
        ];

    return {
      arrivalTime: minutesToTime(arrivalMinutes),
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(stage2End),
      blockEndTime: minutesToTime(blockEndMinutes),
      arrivalMinutes,
      startMinutes,
      endMinutes: stage2End,
      blockEndMinutes,
      activeOccupiedWindows,
      spaceOccupiedWindows,
    };
  }

  const endMinutes = startMinutes + timing.durationMinutes;
  const blockEndMinutes = endMinutes + timing.restAfterMinutes;

  const singleWindow: TimeWindow = {
    startMinutes: timing.requiresPrivacy ? arrivalMinutes : startMinutes,
    endMinutes: blockEndMinutes,
    startTime: minutesToTime(
      timing.requiresPrivacy ? arrivalMinutes : startMinutes
    ),
    endTime: minutesToTime(blockEndMinutes),
    label: "انجام سرویس",
  };

  return {
    arrivalTime: minutesToTime(arrivalMinutes),
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes),
    blockEndTime: minutesToTime(blockEndMinutes),
    arrivalMinutes,
    startMinutes,
    endMinutes,
    blockEndMinutes,
    activeOccupiedWindows: [singleWindow],
    spaceOccupiedWindows: [singleWindow],
  };
}

function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

function getAppointmentOccupiedWindows(appt: {
  startTime: string;
  endTime: string;
  blockEndTime: string;
  timingMode: ServiceTimingMode;
  prepBeforeMinutes: number;
  stage1Minutes: number;
  freeGapMinutes: number;
  stage2Minutes: number;
  restAfterMinutes: number;
  requiresPrivacy: boolean;
}): TimeWindow[] {
  const startMin = timeToMinutes(appt.startTime);
  const blockEndMin = timeToMinutes(appt.blockEndTime);
  const arrivalMin = Math.max(0, startMin - appt.prepBeforeMinutes);

  if (appt.timingMode === ServiceTimingMode.SPLIT_STAGE && !appt.requiresPrivacy) {
    const s1End = startMin + appt.stage1Minutes;
    const s2Start = s1End + appt.freeGapMinutes;
    const s2End = Math.max(s2Start + appt.stage2Minutes, blockEndMin);
    return [
      {
        startMinutes: startMin,
        endMinutes: s1End,
        startTime: minutesToTime(startMin),
        endTime: minutesToTime(s1End),
      },
      {
        startMinutes: s2Start,
        endMinutes: s2End,
        startTime: minutesToTime(s2Start),
        endTime: minutesToTime(s2End),
      },
    ];
  }

  return [
    {
      startMinutes: appt.requiresPrivacy ? arrivalMin : startMin,
      endMinutes: Math.max(blockEndMin, timeToMinutes(appt.endTime)),
      startTime: minutesToTime(appt.requiresPrivacy ? arrivalMin : startMin),
      endTime: minutesToTime(Math.max(blockEndMin, timeToMinutes(appt.endTime))),
    },
  ];
}

function addIssue(
  issues: ValidationIssue[],
  issue: ValidationIssue
) {
  issues.push(issue);
}

/**
 * اعتبارسنجی جامع یک نوبت پیشنهادی (برای رزرو دستی و اتوماتیک) با اعلام دقیق علت هر خطا
 */
export async function evaluateAppointmentSlot(
  input: EvaluateSlotInput
): Promise<EvaluateSlotResult> {
  const issues: ValidationIssue[] = [];
  const cleanStart = normalizeTimeString(input.startTime);
  const resolvedDate = resolveCalendarDate(input.dateInput);

  if (!resolvedDate) {
    addIssue(issues, {
      code: "INVALID_INPUT",
      blocking: true,
      message: "تاریخ انتخاب‌شده برای نوبت معتبر نیست.",
    });
  }

  if (!cleanStart) {
    addIssue(issues, {
      code: "INVALID_INPUT",
      blocking: true,
      message: "ساعت شروع نوبت معتبر نیست (فرمت صحیح HH:mm است).",
    });
  }

  if (!resolvedDate || !cleanStart) {
    return {
      valid: false,
      canOverrideManually: false,
      issues,
      reasons: issues.map((i) => i.message),
      timing: null,
      computed: null,
      resolvedSpaceId: input.spaceId || null,
      staffStatus: null,
    };
  }

  const [service, subService, therapist, workingDay, existingAppointments] =
    await Promise.all([
      prisma.service.findFirst({
        where: { id: input.serviceId, clinicId: input.clinicId },
      }),
      input.subServiceId
        ? prisma.subService.findFirst({
            where: { id: input.subServiceId, serviceId: input.serviceId },
          })
        : Promise.resolve(null),
      input.therapistId
        ? prisma.clinicUser.findFirst({
            where: {
              id: input.therapistId,
              clinicId: input.clinicId,
              deletedAt: null,
              isActive: true,
            },
            include: {
              user: { select: { fullName: true, phone: true } },
              assignedServices: { select: { id: true } },
              staffServiceTimings: {
                where: { serviceId: input.serviceId },
              },
              staffSchedules: {
                where: {
                  isActive: true,
                  OR: [
                    { specificDate: resolvedDate.utcMidnight },
                    { specificDate: null, weekday: resolvedDate.weekday },
                  ],
                },
                include: {
                  space: true,
                  allowedServices: { select: { id: true } },
                },
              },
            },
          })
        : Promise.resolve(null),
      prisma.clinicWorkingDay.findUnique({
        where: {
          clinicId_date: {
            clinicId: input.clinicId,
            date: resolvedDate.utcMidnight,
          },
        },
      }),
      prisma.appointment.findMany({
        where: {
          clinicId: input.clinicId,
          date: resolvedDate.utcMidnight,
          status: { in: BLOCKING_APPOINTMENT_STATUSES },
          ...(input.excludeAppointmentId
            ? { id: { not: input.excludeAppointmentId } }
            : {}),
        },
      }),
    ]);

  if (!service) {
    addIssue(issues, {
      code: "INVALID_INPUT",
      blocking: true,
      message: "سرویس انتخاب‌شده در این کلینیک یافت نشد.",
    });
    return {
      valid: false,
      canOverrideManually: false,
      issues,
      reasons: issues.map((i) => i.message),
      timing: null,
      computed: null,
      resolvedSpaceId: input.spaceId || null,
      staffStatus: null,
    };
  }

  const timing = resolveEffectiveTiming({
    service,
    subService,
    staffTiming: therapist?.staffServiceTimings[0] ?? null,
  });

  const computed = computeAppointmentSchedule(cleanStart, timing);

  // ۱. بررسی ساعات کاری و تعطیلی کلینیک
  if (!workingDay) {
    addIssue(issues, {
      code: "CLINIC_NO_WORKING_HOURS",
      blocking: true,
      message: `علت عدم امکان رزرو: برای تاریخ ${resolvedDate.jalaliDisplay} در «ساعات کاری کلینیک» هیچ شیفت کاری ثبت نشده است.`,
    });
  } else if (workingDay.isClinicHoliday) {
    const reasonText = workingDay.holidayNote
      ? ` (${workingDay.holidayNote})`
      : "";
    addIssue(issues, {
      code: "CLINIC_HOLIDAY",
      blocking: true,
      message: `علت عدم امکان رزرو: کلینیک در تاریخ ${resolvedDate.jalaliDisplay} تعطیل است${reasonText}.`,
    });
  } else {
    const rawShifts = Array.isArray(workingDay.shifts)
      ? (workingDay.shifts as Array<{ startTime?: string; endTime?: string }>)
      : [];

    const validClinicShifts = rawShifts
      .map((s) => {
        const st = s?.startTime ? normalizeTimeString(s.startTime) : null;
        const en = s?.endTime ? normalizeTimeString(s.endTime) : null;
        if (!st || !en || st >= en) return null;
        return { startMin: timeToMinutes(st), endMin: timeToMinutes(en), st, en };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const fitsClinicHours = validClinicShifts.some(
      (sh) =>
        computed.arrivalMinutes >= sh.startMin &&
        computed.blockEndMinutes <= sh.endMin
    );

    if (!fitsClinicHours) {
      const allowedRanges =
        validClinicShifts.length > 0
          ? validClinicShifts.map((x) => `${x.st} تا ${x.en}`).join(" و ")
          : "ثبت نشده";
      addIssue(issues, {
        code: "OUTSIDE_CLINIC_SHIFTS",
        blocking: true,
        message: `علت تداخل با ساعت کاری کلینیک: بازه کل نوبت (${computed.arrivalTime} تا ${computed.blockEndTime}) خارج از ساعات کاری فعال کلینیک در روز ${resolvedDate.jalaliDisplay} است. ساعات مجاز کلینیک: ${allowedRanges}.`,
      });
    }
  }

  // ۲. بررسی وضعیت پرسنل / پزشک در صورت انتخاب
  let matchedStaffStatus: StaffScheduleStatus | null = null;
  let resolvedSpaceId: string | null =
    input.spaceId && input.spaceId !== "NONE" ? input.spaceId : null;

  if (input.therapistId) {
    if (!therapist) {
      addIssue(issues, {
        code: "STAFF_NOT_FOUND",
        blocking: true,
        message: "علت خطا: پزشک یا پرسنل انتخاب‌شده یافت نشد یا غیرفعال است.",
      });
    } else {
      const hasServiceAccess =
        therapist.isOwner ||
        therapist.hasAllServicesAccess ||
        therapist.assignedServices.some((s) => s.id === service.id);

      if (!hasServiceAccess) {
        addIssue(issues, {
          code: "SERVICE_NOT_ASSIGNED_TO_STAFF",
          blocking: true,
          message: `علت خطا: سرویس «${service.title}» به ${
            therapist.user.fullName || therapist.jobTitle
          } اختصاص داده نشده است.`,
        });
      }

      // اولویت با شیفت‌های ثبت‌شده برای تاریخ مشخص (specificDate)؛ در صورت نبودن، شیفت هفتگی همان weekday
      const specificDaySchedules = therapist.staffSchedules.filter(
        (sch) => sch.specificDate !== null
      );
      const relevantSchedules =
        specificDaySchedules.length > 0
          ? specificDaySchedules
          : therapist.staffSchedules;

      const coveringSlot = relevantSchedules.find((sch) => {
        const schStart = timeToMinutes(sch.startTime);
        const schEnd = timeToMinutes(sch.endTime);
        return (
          computed.startMinutes >= schStart && computed.endMinutes <= schEnd
        );
      });

      if (!coveringSlot) {
        addIssue(issues, {
          code: "STAFF_NO_SHIFT_IN_WINDOW",
          blocking: true,
          message: `علت عدم امکان رزرو: ${
            therapist.user.fullName || therapist.jobTitle
          } در بازه ${computed.startTime} تا ${
            computed.endTime
          } در تاریخ ${resolvedDate.jalaliDisplay} شیفت حضور ثبت‌شده ندارد.`,
        });
      } else {
        matchedStaffStatus = coveringSlot.status;

        if (!resolvedSpaceId && coveringSlot.spaceId) {
          resolvedSpaceId = coveringSlot.spaceId;
        }

        if (
          coveringSlot.blocksClinicBook ||
          coveringSlot.status === StaffScheduleStatus.HOSPITAL_SHIFT ||
          coveringSlot.status === StaffScheduleStatus.RESIDENT ||
          coveringSlot.status === StaffScheduleStatus.DAY_OFF
        ) {
          const statusLabel =
            coveringSlot.status === StaffScheduleStatus.HOSPITAL_SHIFT
              ? "شیفت بیمارستان"
              : coveringSlot.status === StaffScheduleStatus.RESIDENT
              ? "مقیم بیمارستان"
              : coveringSlot.status === StaffScheduleStatus.DAY_OFF
              ? "مرخصی / عدم حضور"
              : "وضعیت مسدودکننده نوبت مطب";

          addIssue(issues, {
            code: "STAFF_BOOKING_BLOCKED",
            blocking: true,
            message: `علت بسته بودن نوبت مطب: ${
              therapist.user.fullName || therapist.jobTitle
            } در این بازه دارای وضعیت «${statusLabel}» است و نوبت‌دهی مطب بسته است.`,
          });
        } else if (
          coveringSlot.allowedServices.length > 0 &&
          !coveringSlot.allowedServices.some((s) => s.id === service.id)
        ) {
          addIssue(issues, {
            code: "SERVICE_NOT_ASSIGNED_TO_STAFF",
            blocking: true,
            message: `علت خطا: سرویس «${service.title}» در فهرست سرویس‌های مجازِ شیفت انتخاب‌شده برای این پرسنل قرار ندارد.`,
          });
        }

        if (coveringSlot.status === StaffScheduleStatus.ON_CALL) {
          addIssue(issues, {
            code: "STAFF_NO_SHIFT_IN_WINDOW",
            blocking: false,
            message: `هشدار وضعیت آنکال: ${
              therapist.user.fullName || therapist.jobTitle
            } در این بازه «آنکال بیمارستان» است و در صورت فراخوان بیمارستان ممکن است نیاز به هماهنگی یا جابه‌جایی نوبت باشد.`,
          });
        }
      }

      // بررسی تداخل زمانی با سایر نوبت‌های فعال همان پزشک/پرسنل (با در نظر گرفتن تایم آزاد میانی در SPLIT_STAGE)
      const therapistAppts = existingAppointments.filter(
        (a) => a.therapistId === therapist.id
      );

      for (const appt of therapistAppts) {
        const apptWindows = getAppointmentOccupiedWindows(appt);
        const hasConflict = computed.activeOccupiedWindows.some((reqWin) =>
          apptWindows.some((exWin) => windowsOverlap(reqWin, exWin))
        );

        if (hasConflict) {
          addIssue(issues, {
            code: "STAFF_TIME_CONFLICT",
            blocking: true,
            message: `علت تداخل زمانی پرسنل: ${
              therapist.user.fullName || therapist.jobTitle
            } در بازه ${appt.startTime} تا ${
              appt.blockEndTime
            } نوبت فعال دیگری دارد.`,
          });
          break;
        }
      }
    }
  }

  // ۳. بررسی مکان / اتاق / یونیت در صورت تعیین فضا
  if (resolvedSpaceId) {
    const space = await prisma.clinicSpace.findFirst({
      where: { id: resolvedSpaceId, clinicId: input.clinicId },
      include: { allowedServices: { select: { id: true } } },
    });

    if (!space) {
      addIssue(issues, {
        code: "SPACE_NOT_FOUND",
        blocking: true,
        message: "علت خطا: اتاق یا فضای انتخاب‌شده یافت نشد.",
      });
    } else if (!space.isActive) {
      addIssue(issues, {
        code: "SPACE_INACTIVE",
        blocking: true,
        message: `علت عدم امکان رزرو: فضای «${space.name}» غیرفعال است.`,
      });
    } else {
      if (
        space.allowedServices.length > 0 &&
        !space.allowedServices.some((s) => s.id === service.id)
      ) {
        addIssue(issues, {
          code: "SPACE_SERVICE_NOT_ALLOWED",
          blocking: true,
          message: `علت عدم امکان رزرو: انجام سرویس «${service.title}» در فضای «${space.name}» مجاز نیست.`,
        });
      }

      const spaceAppts = existingAppointments.filter(
        (a) => a.spaceId === space.id
      );

      const overlappingAppts = spaceAppts.filter((appt) => {
        const exSpaceWins = getAppointmentOccupiedWindows({
          ...appt,
          requiresPrivacy: appt.requiresPrivacy || space.requiresPrivacy,
        });
        return computed.spaceOccupiedWindows.some((reqWin) =>
          exSpaceWins.some((exWin) => windowsOverlap(reqWin, exWin))
        );
      });

      if (overlappingAppts.length > 0) {
        const needsPrivacy =
          timing.requiresPrivacy ||
          space.requiresPrivacy ||
          space.spaceType === ClinicSpaceType.ROOM ||
          !space.allowOverlap;

        if (needsPrivacy) {
          addIssue(issues, {
            code: "SPACE_PRIVACY_CONFLICT",
            blocking: true,
            message: `علت تداخل فضا/پرایوسی: فضای «${space.name}» در بازه درخواستی مشغول است و به دلیل نیاز به فضای خالی یا تنظیمات اتاق، امکان هم‌پوشانی وجود ندارد.`,
          });
        } else if (overlappingAppts.length >= Math.max(1, space.capacity)) {
          addIssue(issues, {
            code: "SPACE_CAPACITY_FULL",
            blocking: true,
            message: `علت تکمیل ظرفیت فضا: ظرفیت فضای «${
              space.name
            }» (${space.capacity} یونیت/مراجع هم‌زمان) در این بازه زمانی تکمیل شده است.`,
          });
        }
      }
    }
  }

  // ۴. بررسی تداخل زمانی برای همان مراجع در صورت ارسال clientId
  if (input.clientId) {
    const clientAppts = existingAppointments.filter(
      (a) => a.clientId === input.clientId
    );
    const clientConflict = clientAppts.find((appt) => {
      const exWins = getAppointmentOccupiedWindows(appt);
      return computed.activeOccupiedWindows.some((reqWin) =>
        exWins.some((exWin) => windowsOverlap(reqWin, exWin))
      );
    });

    if (clientConflict) {
      addIssue(issues, {
        code: "CLIENT_TIME_CONFLICT",
        blocking: true,
        message: `علت تداخل نوبت مراجع: این مراجع در بازه ${clientConflict.startTime} تا ${clientConflict.blockEndTime} در همین روز نوبت فعال دیگری دارد.`,
      });
    }
  }

  const blockingIssues = issues.filter((i) => i.blocking);

  // رزرو اتوماتیک (AUTO) هیچ خطای مسدودکننده‌ای را دور نمی‌زند
  // رزرو دستی (MANUAL) در صورت وجود خطای مسدودکننده و فعال بودن allowManualOverride می‌تواند با ثبت دلیل ادامه یابد
  const isValid =
    blockingIssues.length === 0 ||
    (input.bookingSource === AppointmentBookingSource.MANUAL &&
      Boolean(input.allowManualOverride));

  return {
    valid: isValid,
    canOverrideManually:
      input.bookingSource === AppointmentBookingSource.MANUAL &&
      blockingIssues.length > 0,
    issues,
    reasons: issues.map((i) => i.message),
    timing,
    computed,
    resolvedSpaceId,
    staffStatus: matchedStaffStatus,
  };
}

/**
 * یافتن اسلات‌های معتبر و آزاد در یک روز مشخص برای نوبت‌دهی اتوماتیک یا پیشنهاد سریع
 */
export async function findAvailableSlotsForDate(params: {
  clinicId: string;
  serviceId: string;
  subServiceId?: string | null;
  therapistId?: string | null;
  spaceId?: string | null;
  dateInput: string | Date;
  stepMinutes?: number;
  includeConditionalOnCall?: boolean;
}): Promise<{
  slots: AvailableSlotSuggestion[];
  blockingReasons: string[];
}> {
  const step = Math.max(5, Math.min(120, params.stepMinutes ?? 15));
  const resolvedDate = resolveCalendarDate(params.dateInput);

  if (!resolvedDate) {
    return {
      slots: [],
      blockingReasons: ["تاریخ واردشده برای جستجوی نوبت معتبر نیست."],
    };
  }

  const workingDay = await prisma.clinicWorkingDay.findUnique({
    where: {
      clinicId_date: {
        clinicId: params.clinicId,
        date: resolvedDate.utcMidnight,
      },
    },
  });

  if (!workingDay) {
    return {
      slots: [],
      blockingReasons: [
        `در تاریخ ${resolvedDate.jalaliDisplay} هیچ ساعت کاری برای کلینیک تعریف نشده است.`,
      ],
    };
  }

  if (workingDay.isClinicHoliday) {
    return {
      slots: [],
      blockingReasons: [
        `کلینیک در تاریخ ${resolvedDate.jalaliDisplay} تعطیل است${
          workingDay.holidayNote ? ` (${workingDay.holidayNote})` : ""
        }.`,
      ],
    };
  }

  const rawShifts = Array.isArray(workingDay.shifts)
    ? (workingDay.shifts as Array<{ startTime?: string; endTime?: string }>)
    : [];

  const slots: AvailableSlotSuggestion[] = [];
  const collectedReasons = new Set<string>();

  for (const sh of rawShifts) {
    const st = sh?.startTime ? normalizeTimeString(sh.startTime) : null;
    const en = sh?.endTime ? normalizeTimeString(sh.endTime) : null;
    if (!st || !en || st >= en) continue;

    const startMin = timeToMinutes(st);
    const endMin = timeToMinutes(en);

    for (let cursor = startMin; cursor < endMin; cursor += step) {
      const candidateTime = minutesToTime(cursor);
      const evalRes = await evaluateAppointmentSlot({
        clinicId: params.clinicId,
        serviceId: params.serviceId,
        subServiceId: params.subServiceId,
        therapistId: params.therapistId,
        spaceId: params.spaceId,
        dateInput: resolvedDate.utcMidnight,
        startTime: candidateTime,
        bookingSource: AppointmentBookingSource.AUTO,
      });

      if (!evalRes.computed || !evalRes.timing) continue;
      if (evalRes.computed.blockEndMinutes > endMin) continue;

      if (evalRes.valid) {
        const isOnCall = evalRes.staffStatus === StaffScheduleStatus.ON_CALL;
        if (isOnCall && params.includeConditionalOnCall === false) {
          continue;
        }

        slots.push({
          arrivalTime: evalRes.computed.arrivalTime,
          startTime: evalRes.computed.startTime,
          endTime: evalRes.computed.endTime,
          blockEndTime: evalRes.computed.blockEndTime,
          therapistId: params.therapistId ?? null,
          therapistName: null,
          spaceId: evalRes.resolvedSpaceId,
          spaceName: null,
          staffStatus: evalRes.staffStatus ?? StaffScheduleStatus.IN_CLINIC,
          isConditionalOnCall: isOnCall,
          timingMode: evalRes.timing.timingMode,
          freeGapMinutes: evalRes.timing.freeGapMinutes,
        });
      } else {
        for (const r of evalRes.reasons) {
          collectedReasons.add(r);
        }
      }
    }
  }

  return {
    slots,
    blockingReasons: slots.length === 0 ? Array.from(collectedReasons) : [],
  };
}