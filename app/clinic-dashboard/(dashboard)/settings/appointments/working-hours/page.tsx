// app/clinic-dashboard/(dashboard)/settings/appointments/working-hours/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { toGregorian, toJalali } from "@/lib/jalali";
import { getHolidaysInRange } from "@/lib/persian-holidays";
import {
  WorkingHoursClient,
  type DayScheduleRecord,
  type OfficialHolidayInfo,
} from "@/components/clinic-dashboard/appointments/working-hours-client";
import type { WorkingShiftInput } from "./actions";

export const metadata = {
  title: "تنظیم ساعات کاری کلینیک | پنل کلینیک",
};

function getJalaliMonthDaysCount(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const g30 = toGregorian(jy, 12, 30);
  const j30 = toJalali(g30);
  return j30.jy === jy && j30.jm === 12 && j30.jd === 30 ? 30 : 29;
}

export default async function ClinicWorkingHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ jy?: string; jm?: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const canManage =
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "appointments.settings");

  if (!canManage) {
    redirect("/clinic-dashboard");
  }

  const params = await searchParams;
  const nowJalali = toJalali(new Date());

  const parsedJy = Number(params.jy);
  const parsedJm = Number(params.jm);

  const jy =
    Number.isInteger(parsedJy) && parsedJy >= 1350 && parsedJy <= 1490
      ? parsedJy
      : nowJalali.jy;
  const jm =
    Number.isInteger(parsedJm) && parsedJm >= 1 && parsedJm <= 12
      ? parsedJm
      : nowJalali.jm;

  const daysCount = getJalaliMonthDaysCount(jy, jm);
  const firstG = toGregorian(jy, jm, 1);
  const lastG = toGregorian(jy, jm, daysCount);

  const rangeStart = new Date(
    Date.UTC(firstG.getFullYear(), firstG.getMonth(), firstG.getDate(), 0, 0, 0)
  );
  const rangeEnd = new Date(
    Date.UTC(
      lastG.getFullYear(),
      lastG.getMonth(),
      lastG.getDate(),
      23,
      59,
      59,
      999
    )
  );

  const [savedDays, holidays] = await Promise.all([
    prisma.clinicWorkingDay.findMany({
      where: {
        clinicId: ctx.clinicId,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      orderBy: { date: "asc" },
    }),
    Promise.resolve(
      getHolidaysInRange(
        new Date(firstG.getFullYear(), firstG.getMonth(), firstG.getDate()),
        new Date(lastG.getFullYear(), lastG.getMonth(), lastG.getDate())
      )
    ),
  ]);

  const recordsByIso: Record<string, DayScheduleRecord> = {};
  for (const row of savedDays) {
    const iso = row.date.toISOString().slice(0, 10);
    const parsedShifts: WorkingShiftInput[] = Array.isArray(row.shifts)
      ? (row.shifts as unknown as WorkingShiftInput[])
      : [];

    recordsByIso[iso] = {
      dateIso: iso,
      isClinicHoliday: row.isClinicHoliday,
      holidayNote: row.holidayNote,
      shifts: parsedShifts,
    };
  }

  const holidaysByIso: Record<string, OfficialHolidayInfo[]> = {};
  for (const h of holidays) {
    const y = h.date.getFullYear();
    const m = String(h.date.getMonth() + 1).padStart(2, "0");
    const d = String(h.date.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${d}`;
    if (!holidaysByIso[iso]) holidaysByIso[iso] = [];
    holidaysByIso[iso].push({
      title: h.title,
      official: h.official,
      approximate: h.approximate,
    });
  }

  return (
    <WorkingHoursClient
      clinicName={ctx.clinic.name}
      initialJy={jy}
      initialJm={jm}
      initialRecordsByIso={recordsByIso}
      holidaysByIso={holidaysByIso}
    />
  );
}