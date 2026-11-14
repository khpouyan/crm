// app/clinic-dashboard/(dashborad)/services/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ServicesClientView } from "@/components/clinic-dashboard/services-client-view";

export default async function ServicesPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) {
    redirect("/clinic-dashboard/login");
  }

  const [services, activeStaff, clinicProducts] = await Promise.all([
    prisma.service.findMany({
      where: { clinicId: ctx.clinicId },
      include: {
        assignedStaff: {
          where: { isActive: true },
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
      where: { clinicId: ctx.clinicId, isActive: true },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        role: { select: { name: true } },
      },
    }),
    prisma.clinicProduct.findMany({
      where: { clinicId: ctx.clinicId },
      select: { id: true, name: true, unit: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <ServicesClientView
          initialServices={services}
          activeStaff={activeStaff}
          clinicProducts={clinicProducts}
        />
      </main>
    </div>
  );
}