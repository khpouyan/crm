// app/clinic-dashboard/(dashboard)/clients/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import {
  hasPermission,
  buildServiceScopeFilter,
  buildProvidedServiceScopeFilter,
} from "@/lib/permissions";
import { ClientServicesClient } from "@/components/clinic-dashboard/client-services-client";

export const metadata = {
  title: "سرویس‌های پرونده | پنل کلینیک",
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
    include: {
      user: { select: { fullName: true } },
    },
  });

  if (!client) notFound();

  const providedScopeFilter = buildProvidedServiceScopeFilter(ctx.clinicUser);
  const serviceScopeFilter = buildServiceScopeFilter(ctx.clinicUser);

  const [
    providedServices,
    catalogServices,
    products,
    staffMembers,
    clientReferrers,
    terminals,
  ] = await Promise.all([
    prisma.providedService.findMany({
      where: {
        clientId: client.id,
        ...providedScopeFilter,
      },
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
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
        },
        usedConsumables: {
          include: {
            clinicProduct: { select: { name: true, unit: true } },
          },
        },
      },
      orderBy: { performedAt: "desc" },
    }),

    // خدمات مجاز برای ویزارد ثبت سرویس
    prisma.service.findMany({
      where: {
        clinicId: ctx.clinicId,
        ...serviceScopeFilter,
      },
      include: {
        subServices: {
          include: {
            defaultProducts: {
              include: {
                clinicProduct: {
                  select: { id: true, name: true, unit: true },
                },
              },
            },
          },
          orderBy: { title: "asc" },
        },
      },
      orderBy: { title: "asc" },
    }),

    // کالاهای انبار به همراه بچ‌های دارای موجودی
    prisma.clinicProduct.findMany({
      where: { clinicId: ctx.clinicId },
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: [{ expirationDate: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    }),

    // پرسنل کلینیک برای نقش‌های درمانگر، دستیار و معرف
    prisma.clinicUser.findMany({
      where: {
        clinicId: ctx.clinicId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),

    // سایر مراجعین کلینیک برای انتخاب به عنوان معرف
    prisma.client.findMany({
      where: {
        clinicId: ctx.clinicId,
        id: { not: client.id },
      },
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),

    // دستگاه‌های کارتخوان
    prisma.paymentTerminal.findMany({
      where: { clinicId: ctx.clinicId },
      include: {
        bankAccount: { select: { bankName: true } },
      },
    }),
  ]);

  return (
    <ClientServicesClient
      client={{
        id: client.id,
        fullName: client.user.fullName || "مراجعه‌کننده",
        walletBalance: client.walletBalance,
      }}
      providedServices={providedServices.map((ps) => ({
        id: ps.id,
        serviceId: ps.subService.service.id,
        subServiceId: ps.subServiceId,
        serviceTitle: ps.subService.service.title,
        subServiceTitle: ps.subService.title,
        performedAt: ps.performedAt.toISOString(),
        finalPrice: ps.finalPrice,
        description: ps.description,
        therapistId: ps.therapistId,
        therapistName:
          ps.therapist?.user.fullName || ps.therapistNameSnapshot || "—",
        assistantIds: ps.assistants.map((a) => a.id),
        assistantNames: ps.assistants.map((a) => a.user.fullName || "پرسنل"),
        referrerStaffId: ps.referrerId,
        referrerClientId: ps.referrerClientId,
        referrerName:
          ps.referrer?.user.fullName ||
          ps.referrerClient?.user.fullName ||
          null,
        invoice: ps.invoice
          ? {
              id: ps.invoice.id,
              invoiceNumber: ps.invoice.invoiceNumber,
              totalAmount: ps.invoice.totalAmount,
              paidAmount: ps.invoice.paidAmount,
              status: ps.invoice.status,
            }
          : null,
        usedConsumables: ps.usedConsumables.map((uc) => ({
          id: uc.id,
          clinicProductId: uc.clinicProductId,
          productBatchId: uc.productBatchId,
          productName: uc.clinicProduct.name,
          unit: uc.clinicProduct.unit,
          quantity: uc.quantity,
          sellingPrice: uc.sellingPrice,
        })),
      }))}
      catalogServices={catalogServices.map((s) => ({
        id: s.id,
        title: s.title,
        subServices: s.subServices.map((sub) => ({
          id: sub.id,
          title: sub.title,
          price: sub.price,
          defaultProducts: sub.defaultProducts.map((dp) => ({
            clinicProductId: dp.clinicProductId,
            productName: dp.clinicProduct.name,
            unit: dp.clinicProduct.unit,
            quantity: dp.quantity,
          })),
        })),
      }))}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        totalStock: p.batches.reduce((sum, b) => sum + b.quantity, 0),
        batches: p.batches.map((b) => ({
          id: b.id,
          quantity: b.quantity,
          purchasePrice: b.purchasePrice,
          sellingPrice: b.sellingPrice,
          expirationDate: b.expirationDate ? b.expirationDate.toISOString() : null,
          exclusiveSubServiceId: b.exclusiveSubServiceId,
          exclusiveTherapistId: b.exclusiveTherapistId,
        })),
      }))}
      therapists={staffMembers
        .filter((s) => s.canBeTherapist)
        .map((s) => ({
          value: s.id,
          label: s.user.fullName || s.jobTitle,
        }))}
      assistants={staffMembers
        .filter((s) => s.canBeAssistant)
        .map((s) => ({
          value: s.id,
          label: s.user.fullName || s.jobTitle,
        }))}
      staffReferrers={staffMembers
        .filter((s) => s.canBeReferrer)
        .map((s) => ({
          value: s.id,
          label: s.user.fullName || s.jobTitle,
        }))}
      clientReferrers={clientReferrers.map((c) => ({
        value: c.id,
        label: `${c.user.fullName || "بدون نام"}${
          c.fileNumber ? ` (پرونده ${c.fileNumber})` : ""
        }`,
      }))}
      terminals={terminals.map((t) => ({
        value: t.id,
        label: `${t.name} (${t.bankAccount.bankName})`,
      }))}
      canCreateService={hasPermission(ctx.clinicUser, "services.create")}
      canApplyDiscount={
        ctx.clinicUser.isOwner ||
        hasPermission(ctx.clinicUser, "other.discounts")
      }
      canEditService={hasPermission(ctx.clinicUser, "services.edit")}
      canDeleteService={hasPermission(ctx.clinicUser, "services.delete")}
    />
  );
}