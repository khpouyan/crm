// app/clinic-dashboard/(dashboard)/clients/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import {
  hasPermission,
  buildServiceScopeFilter,
  buildProvidedServiceScopeFilter,
} from "@/lib/permissions";
import { ClientInvoiceCards } from "@/components/clinic-dashboard/client-invoice-cards";

export const metadata = {
  title: "سرویس‌ها و صورت‌حساب‌های پرونده | پنل کلینیک",
};

export default async function ClientServicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  if (!hasPermission(ctx.clinicUser, "patients.view")) {
    redirect("/clinic-dashboard");
  }

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, clinicId: ctx.clinicId },
    select: { id: true },
  });

  if (!client) notFound();

  const providedScopeFilter = buildProvidedServiceScopeFilter(ctx.clinicUser);
  const serviceScopeFilter = buildServiceScopeFilter(ctx.clinicUser);

  const [invoices, catalogServices] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        clientId: client.id,
        clinicId: ctx.clinicId,
        providedServices: {
          some: providedScopeFilter,
        },
      },
      include: {
        providedServices: {
          where: providedScopeFilter,
          include: {
            subService: {
              include: {
                service: { select: { id: true, title: true } },
              },
            },
            therapist: {
              include: { user: { select: { fullName: true } } },
            },
            assistants: {
              include: { user: { select: { fullName: true } } },
            },
            referrer: {
              include: { user: { select: { fullName: true } } },
            },
            referrerClient: {
              include: { user: { select: { fullName: true } } },
            },
            usedConsumables: {
              include: {
                clinicProduct: { select: { name: true, unit: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.service.findMany({
      where: {
        clinicId: ctx.clinicId,
        ...serviceScopeFilter,
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  // واکشی نام اپراتورهای ثبت‌کننده
  const creatorIds = Array.from(
    new Set(
      invoices
        .flatMap((inv) => inv.providedServices.map((s) => s.createdById))
        .filter((x): x is string => Boolean(x))
    )
  );
  const creators =
    creatorIds.length > 0
      ? await prisma.clinicUser.findMany({
          where: { id: { in: creatorIds } },
          include: { user: { select: { fullName: true } } },
        })
      : [];
  const creatorMap = new Map(
    creators.map((c) => [c.id, c.user.fullName || c.jobTitle])
  );

  return (
    <ClientInvoiceCards
      clientId={client.id}
      serviceCategories={catalogServices.map((s) => ({
        value: s.id,
        label: s.title,
      }))}
      invoices={invoices.map((inv) => {
        const firstCreatorId = inv.providedServices[0]?.createdById;
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          depositAmount: inv.depositAmount,
          depositServiceTitle: inv.depositServiceTitle,
          status: inv.status,
          createdAt: inv.createdAt.toISOString(),
          operatorName: firstCreatorId
            ? creatorMap.get(firstCreatorId) || "پرسنل کلینیک"
            : "پرسنل کلینیک",
          services: inv.providedServices.map((ps) => ({
            id: ps.id,
            serviceId: ps.subService.service.id,
            serviceTitle: ps.subService.service.title,
            subServiceTitle: ps.subService.title,
            performedAt: ps.performedAt.toISOString(),
            finalPrice: ps.finalPrice,
            therapistName:
              ps.therapist?.user.fullName || ps.therapistNameSnapshot || "—",
            assistantNames: ps.assistants.map(
              (a) => a.user.fullName || "پرسنل"
            ),
            referrerName:
              ps.referrer?.user.fullName ||
              ps.referrerClient?.user.fullName ||
              null,
            description: ps.description,
            usedConsumables: ps.usedConsumables.map((uc) => ({
              id: uc.id,
              productName: uc.clinicProduct.name,
              unit: uc.clinicProduct.unit,
              quantity: uc.quantity,
            })),
          })),
        };
      })}
      canCreateService={hasPermission(ctx.clinicUser, "services.create")}
      canEditService={hasPermission(ctx.clinicUser, "services.edit")}
      canDeleteService={hasPermission(ctx.clinicUser, "services.delete")}
    />
  );
}