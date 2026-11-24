// app/clinic-dashboard/(dashboard)/calendar/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { toGregorian, toJalali } from "@/lib/jalali";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import {
  CalendarClient,
  type AppointmentRecord,
  type CalendarClientOption,
  type CalendarServiceOption,
  type CalendarStaffOption,
  type CalendarSpaceOption,
} from "@/components/clinic-dashboard/appointments/calendar-client";

export const metadata = {
  title: "تقویم نوبت‌دهی | پنل کلینیک",
};

function parseJalaliDateParam(raw?: string): {
  jy: number;
  jm: number;
  jd: number;
  utcMidnight: Date;
  jalaliStr: string;
} {
  const nowJ = toJalali(new Date());
  const norm = normalizePersianDigits(String(raw || "")).trim();
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(norm);

  if (match) {
    const jy = Number(match[1]);
    const jm = Number(match[2]);
    const jd = Number(match[3]);
    if (jy >= 1300 && jy <= 1500 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      const g = toGregorian(jy, jm, jd);
      const check = toJalali(g);
      if (check.jy === jy && check.jm === jm && check.jd === jd) {
        return {
          jy,
          jm,
          jd,
          utcMidnight: new Date(
            Date.UTC(g.getFullYear(), g.getMonth(), g.getDate(), 0, 0, 0, 0)
          ),
          jalaliStr: `${jy}/${String(jm).padStart(2, "0")}/${String(
            jd
          ).padStart(2, "0")}`,
        };
      }
    }
  }

  const gNow = toGregorian(nowJ.jy, nowJ.jm, nowJ.jd);
  return {
    jy: nowJ.jy,
    jm: nowJ.jm,
    jd: nowJ.jd,
    utcMidnight: new Date(
      Date.UTC(gNow.getFullYear(), gNow.getMonth(), gNow.getDate(), 0, 0, 0, 0)
    ),
    jalaliStr: `${nowJ.jy}/${String(nowJ.jm).padStart(2, "0")}/${String(
      nowJ.jd
    ).padStart(2, "0")}`,
  };
}

function getJalaliMonthDaysCount(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const g30 = toGregorian(jy, 12, 30);
  const j30 = toJalali(g30);
  return j30.jy === jy && j30.jm === 12 && j30.jd === 30 ? 30 : 29;
}

function utcDateToJalaliStr(dt: Date): string {
  const localRef = new Date(
    dt.getUTCFullYear(),
    dt.getUTCMonth(),
    dt.getUTCDate()
  );
  const j = toJalali(localRef);
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(
    2,
    "0"
  )}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) {
    redirect("/clinic-dashboard/login");
  }

  const canView =
    hasPermission(ctx.clinicUser, "appointments.view") ||
    hasPermission(ctx.clinicUser, "appointments.create") ||
    hasPermission(ctx.clinicUser, "appointments.edit");

  if (!canView) {
    redirect("/clinic-dashboard");
  }

  const params = await searchParams;
  const selected = parseJalaliDateParam(params.date);

  const monthDays = getJalaliMonthDaysCount(selected.jy, selected.jm);
  const firstG = toGregorian(selected.jy, selected.jm, 1);
  const lastG = toGregorian(selected.jy, selected.jm, monthDays);

  const rangeStart = new Date(
    Date.UTC(firstG.getFullYear(), firstG.getMonth(), firstG.getDate(), 0, 0, 0, 0)
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

  const [appointmentsRows, servicesRows, staffRows, spacesRows, clientsRows] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          clinicId: ctx.clinicId,
          date: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: {
          client: {
            include: {
              user: {
                select: {
                  fullName: true,
                  phone: true,
                },
              },
            },
          },
          service: {
            select: {
              id: true,
              title: true,
            },
          },
          subService: {
            select: {
              id: true,
              title: true,
            },
          },
          therapist: {
            include: {
              user: {
                select: {
                  fullName: true,
                  phone: true,
                },
              },
            },
          },
          space: {
            select: {
              id: true,
              name: true,
              spaceType: true,
            },
          },
          createdBy: {
            include: {
              user: {
                select: {
                  fullName: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      prisma.service.findMany({
        where: { clinicId: ctx.clinicId },
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          subServices: {
            orderBy: { title: "asc" },
            select: {
              id: true,
              title: true,
              price: true,
            },
          },
        },
      }),
      prisma.clinicUser.findMany({
        where: {
          clinicId: ctx.clinicId,
          deletedAt: null,
          isActive: true,
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
            select: { id: true },
          },
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
          allowedServices: {
            select: { id: true },
          },
        },
      }),
      prisma.client.findMany({
        where: { clinicId: ctx.clinicId },
        orderBy: [{ fileNumber: { sort: "desc", nulls: "last" } }],
        take: 1000,
        include: {
          user: {
            select: {
              fullName: true,
              phone: true,
              nationalId: true,
            },
          },
        },
      }),
    ]);

  const appointments: AppointmentRecord[] = appointmentsRows.map((a) => ({
    id: a.id,
    clientId: a.clientId,
    clientName: a.client.user.fullName || "مراجع بدون نام",
    clientPhone: a.client.user.phone.startsWith("NO_PHONE_")
      ? "بدون شماره"
      : a.client.user.phone,
    fileNumber: a.client.fileNumber,
    serviceId: a.serviceId,
    serviceTitle: a.service.title,
    subServiceId: a.subServiceId,
    subServiceTitle: a.subService?.title ?? null,
    therapistId: a.therapistId,
    therapistName:
      a.therapist?.user.fullName ||
      a.therapist?.user.phone ||
      a.therapist?.jobTitle ||
      "تعیین‌نشده",
    spaceId: a.spaceId,
    spaceName: a.space?.name ?? null,
    createdByName:
      a.createdBy?.user.fullName || a.createdBy?.user.phone || "سیستم",
    bookingSource: a.bookingSource,
    status: a.status,
    jalaliDate: utcDateToJalaliStr(a.date),
    arrivalTime: a.arrivalTime,
    startTime: a.startTime,
    endTime: a.endTime,
    blockEndTime: a.blockEndTime,
    timingMode: a.timingMode,
    freeGapMinutes: a.freeGapMinutes,
    isManualOverride: a.isManualOverride,
    overrideReason: a.overrideReason,
    notes: a.notes,
    cancellationReason: a.cancellationReason,
    createdAtIso: a.createdAt.toISOString(),
  }));

  const services: CalendarServiceOption[] = servicesRows.map((s) => ({
    id: s.id,
    title: s.title,
    subServices: s.subServices,
  }));

  const staff: CalendarStaffOption[] = staffRows.map((st) => ({
    id: st.id,
    fullName: st.user.fullName || st.user.phone,
    jobTitle: st.jobTitle,
    hasAllServicesAccess: st.isOwner || st.hasAllServicesAccess,
    assignedServiceIds: st.assignedServices.map((as) => as.id),
  }));

  const spaces: CalendarSpaceOption[] = spacesRows.map((sp) => ({
    id: sp.id,
    name: sp.name,
    spaceType: sp.spaceType,
    allowedServiceIds: sp.allowedServices.map((s) => s.id),
  }));

  const clients: CalendarClientOption[] = clientsRows.map((c) => ({
    id: c.id,
    fullName: c.user.fullName || "مراجع بدون نام",
    phone: c.user.phone.startsWith("NO_PHONE_") ? "" : c.user.phone,
    nationalId: c.user.nationalId,
    nickname: c.nickname,
    fileNumber: c.fileNumber,
  }));

  return (
    <CalendarClient
      clinicName={ctx.clinic.name}
      initialJalaliDate={selected.jalaliStr}
      initialView={
        params.view === "monthly" ||
        params.view === "table" ||
        params.view === "logs"
          ? params.view
          : "daily"
      }
      appointments={appointments}
      services={services}
      staff={staff}
      spaces={spaces}
      clients={clients}
      permissions={{
        canCreate: hasPermission(ctx.clinicUser, "appointments.create"),
        canEdit: hasPermission(ctx.clinicUser, "appointments.edit"),
        canDelete: hasPermission(ctx.clinicUser, "appointments.delete"),
      }}
    />
  );
}