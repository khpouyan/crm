// app/clinic-dashboard/(dashboard)/settings/appointments/staff-schedule/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { toGregorian, toJalali } from "@/lib/jalali";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import {
  StaffScheduleClient,
  type StaffMemberScheduleProfile,
  type ClinicSpaceOption,
  type ClinicWorkingDaySummary,
} from "@/components/clinic-dashboard/appointments/staff-schedule-client";

export const metadata = {
  title: "زمان‌بندی حضور و سرویس پرسنل | پنل کلینیک",
};

function gregorianUtcToJalaliKey(date: Date): string {
  const localRef = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const j = toJalali(localRef);
  return normalizePersianDigits(
    `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`
  );
}

export default async function StaffScheduleSettingsPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const isAdmin =
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "appointments.settings") ||
    hasPermission(ctx.clinicUser, "management.settings");

  const canSelfManage = hasPermission(
    ctx.clinicUser,
    "appointments.self_schedule"
  );

  if (!isAdmin && !canSelfManage) {
    redirect("/clinic-dashboard");
  }

  const [allServices, spacesRows, workingDaysRows, staffRows] =
    await Promise.all([
      prisma.service.findMany({
        where: { clinicId: ctx.clinicId },
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          timingMode: true,
          prepBeforeMinutes: true,
          durationMinutes: true,
          stage1Minutes: true,
          freeGapMinutes: true,
          stage2Minutes: true,
          restAfterMinutes: true,
          requiresPrivacy: true,
        },
      }),
      prisma.clinicSpace.findMany({
        where: {
          clinicId: ctx.clinicId,
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          spaceType: true,
          capacity: true,
          allowOverlap: true,
          requiresPrivacy: true,
          allowedServices: {
            select: { id: true },
          },
        },
      }),
      prisma.clinicWorkingDay.findMany({
        where: { clinicId: ctx.clinicId },
        orderBy: { date: "asc" },
        select: {
          date: true,
          isClinicHoliday: true,
          holidayNote: true,
          shifts: true,
        },
      }),
      prisma.clinicUser.findMany({
        where: {
          clinicId: ctx.clinicId,
          deletedAt: null,
          isActive: true,
          ...(isAdmin ? {} : { id: ctx.clinicUser.id }),
        },
        orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }],
        include: {
          user: {
            select: {
              fullName: true,
              phone: true,
            },
          },
          assignedServices: {
            select: {
              id: true,
              title: true,
            },
            orderBy: { title: "asc" },
          },
          staffServiceTimings: {
            orderBy: { createdAt: "asc" },
          },
          staffSchedules: {
            orderBy: [{ specificDate: "asc" }, { startTime: "asc" }],
            include: {
              space: {
                select: {
                  id: true,
                  name: true,
                  spaceType: true,
                },
              },
              allowedServices: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
    ]);

  const workingDaysByJalali: Record<string, ClinicWorkingDaySummary> = {};
  for (const wd of workingDaysRows) {
    const key = gregorianUtcToJalaliKey(wd.date);
    const rawShifts = Array.isArray(wd.shifts) ? wd.shifts : [];
    const shifts = rawShifts
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const obj = s as { startTime?: unknown; endTime?: unknown };
        if (
          typeof obj.startTime === "string" &&
          typeof obj.endTime === "string"
        ) {
          return { startTime: obj.startTime, endTime: obj.endTime };
        }
        return null;
      })
      .filter((x): x is { startTime: string; endTime: string } => Boolean(x));

    workingDaysByJalali[key] = {
      isClinicHoliday: wd.isClinicHoliday,
      holidayNote: wd.holidayNote,
      shifts,
    };
  }

  const spaces: ClinicSpaceOption[] = spacesRows.map((sp) => ({
    id: sp.id,
    name: sp.name,
    spaceType: sp.spaceType,
    capacity: sp.capacity,
    allowOverlap: sp.allowOverlap,
    requiresPrivacy: sp.requiresPrivacy,
    allowedServiceIds: sp.allowedServices.map((s) => s.id),
  }));

  const staffProfiles: StaffMemberScheduleProfile[] = staffRows.map((member) => {
    const accessibleServices =
      member.isOwner || member.hasAllServicesAccess
        ? allServices
        : allServices.filter((srv) =>
            member.assignedServices.some((a) => a.id === srv.id)
          );

    const timingByServiceId = new Map(
      member.staffServiceTimings.map((t) => [t.serviceId, t])
    );

    const schedules = member.staffSchedules
      .filter((sch) => sch.specificDate !== null)
      .map((sch) => {
        const dt = sch.specificDate as Date;
        const gLocal = new Date(
          dt.getUTCFullYear(),
          dt.getUTCMonth(),
          dt.getUTCDate()
        );
        const weekday = sch.weekday ?? (gLocal.getDay() + 1) % 7;
        return {
          id: sch.id,
          jalaliDate: gregorianUtcToJalaliKey(dt),
          weekday,
          startTime: sch.startTime,
          endTime: sch.endTime,
          status: sch.status,
          blocksClinicBook: sch.blocksClinicBook,
          note: sch.note,
          isActive: sch.isActive,
          space: sch.space,
          allowedServices: sch.allowedServices,
        };
      });

    return {
      id: member.id,
      fullName: member.user.fullName || member.user.phone,
      jobTitle: member.jobTitle,
      specialty: member.specialty,
      isOwner: member.isOwner,
      hasAllServicesAccess: member.hasAllServicesAccess,
      services: accessibleServices.map((srv) => {
        const custom = timingByServiceId.get(srv.id);
        return {
          serviceId: srv.id,
          serviceTitle: srv.title,
          isCustomized: Boolean(custom),
          timingMode: custom?.timingMode ?? srv.timingMode,
          prepBeforeMinutes: custom?.prepBeforeMinutes ?? srv.prepBeforeMinutes,
          durationMinutes: custom?.durationMinutes ?? srv.durationMinutes,
          stage1Minutes: custom?.stage1Minutes ?? srv.stage1Minutes,
          freeGapMinutes: custom?.freeGapMinutes ?? srv.freeGapMinutes,
          stage2Minutes: custom?.stage2Minutes ?? srv.stage2Minutes,
          restAfterMinutes: custom?.restAfterMinutes ?? srv.restAfterMinutes,
          requiresPrivacy: custom?.requiresPrivacy ?? srv.requiresPrivacy,
        };
      }),
      schedules,
    };
  });

  return (
    <StaffScheduleClient
      clinicName={ctx.clinic.name}
      isAdmin={isAdmin}
      currentClinicUserId={ctx.clinicUser.id}
      staffProfiles={staffProfiles}
      spaces={spaces}
      workingDaysByJalali={workingDaysByJalali}
    />
  );
}