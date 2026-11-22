// app/clinic-dashboard/(dashboard)/settings/appointments/spaces/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  SpacesKanbanClient,
  type ClinicSpaceItem,
  type ClinicServiceSummary,
} from "@/components/clinic-dashboard/appointments/spaces-client";

export const metadata = {
  title: "مدیریت مکان‌ها (کانبان نوبت‌دهی) | پنل کلینیک",
};

export default async function ClinicSpacesPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const canManage =
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "appointments.settings") ||
    hasPermission(ctx.clinicUser, "management.settings");

  if (!canManage) {
    redirect("/clinic-dashboard");
  }

  const [spacesRows, servicesRows] = await Promise.all([
    prisma.clinicSpace.findMany({
      where: { clinicId: ctx.clinicId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        allowedServices: {
          select: {
            id: true,
            title: true,
          },
          orderBy: { title: "asc" },
        },
      },
    }),
    prisma.service.findMany({
      where: { clinicId: ctx.clinicId },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        _count: {
          select: { subServices: true },
        },
      },
    }),
  ]);

  const initialSpaces: ClinicSpaceItem[] = spacesRows.map((sp) => ({
    id: sp.id,
    name: sp.name,
    spaceType: sp.spaceType,
    capacity: sp.capacity,
    allowOverlap: sp.allowOverlap,
    requiresPrivacy: sp.requiresPrivacy,
    equipmentNotes: sp.equipmentNotes,
    description: sp.description,
    isActive: sp.isActive,
    sortOrder: sp.sortOrder,
    allowedServices: sp.allowedServices,
  }));

  const services: ClinicServiceSummary[] = servicesRows.map((srv) => ({
    id: srv.id,
    title: srv.title,
    subServicesCount: srv._count.subServices,
  }));

  return (
    <SpacesKanbanClient
      clinicName={ctx.clinic.name}
      initialSpaces={initialSpaces}
      services={services}
    />
  );
}