// app/clinic-dashboard/(dashboard)/services/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ServicesClientView } from "@/components/clinic-dashboard/services-client-view";

export default async function ServicesPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) {
    redirect("/clinic-dashboard/login");
  }

  const { clinicUser } = ctx;

  // بررسی اینکه آیا کاربر حداقل مجوز مشاهده یا مدیریت سرویس را دارد
  const canView =
    hasPermission(clinicUser, "services.view") ||
    hasPermission(clinicUser, "services.create") ||
    hasPermission(clinicUser, "services.edit");

  if (!canView) {
    redirect("/clinic-dashboard");
  }

  const canCreate = hasPermission(clinicUser, "services.create");
  const canEdit = hasPermission(clinicUser, "services.edit");
  const canDelete = hasPermission(clinicUser, "services.delete");

  const restrictToAssigned =
    !clinicUser.isOwner && !clinicUser.hasAllServicesAccess;

  const [services, activeStaff, clinicProducts] = await Promise.all([
    prisma.service.findMany({
      where: {
        clinicId: ctx.clinicId,
        ...(restrictToAssigned
          ? {
              assignedStaff: {
                some: { id: ctx.clinicUserId },
              },
            }
          : {}),
      },
      include: {
        assignedStaff: {
          where: { isActive: true, deletedAt: null },
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
            role: { select: { name: true } },
          },
        },
        subServices: {
          include: {
            defaultProducts: {
              include: {
                clinicProduct: { select: { id: true, name: true, unit: true } },
              },
            },
          },
          orderBy: { title: "asc" },
        },
      },
      orderBy: { title: "asc" },
    }),
    prisma.clinicUser.findMany({
      where: {
        clinicId: ctx.clinicId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        role: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.clinicProduct.findMany({
      where: { clinicId: ctx.clinicId },
      select: { id: true, name: true, unit: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const formattedStaff = activeStaff.map((staff) => ({
    id: staff.id,
    hasAllServicesAccess: staff.isOwner || staff.hasAllServicesAccess,
    user: staff.user,
    role: {
      name: staff.isOwner
        ? "مدیر کلینیک"
        : staff.role?.name || staff.jobTitle || "پرسنل",
    },
  }));

  const formattedServices = services.map((service) => ({
    ...service,
    assignedStaff: service.assignedStaff.map((staff) => ({
      id: staff.id,
      user: staff.user,
      role: {
        name: staff.role?.name || staff.jobTitle || "پرسنل",
      },
    })),
  }));

  return (
    <div className="space-y-6">
      <ServicesClientView
        initialServices={formattedServices}
        activeStaff={formattedStaff}
        clinicProducts={clinicProducts}
        permissions={{ canCreate, canEdit, canDelete }}
      />
    </div>
  );
}