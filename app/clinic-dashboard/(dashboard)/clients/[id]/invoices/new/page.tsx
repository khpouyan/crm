// app/clinic-dashboard/(dashboard)/clients/[id]/invoices/new/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission, buildServiceScopeFilter } from "@/lib/permissions";
import { InvoiceWizardContainer } from "@/components/clinic-dashboard/invoice-wizard/invoice-wizard-container";
import type { AttributeEntry } from "@/components/clinic-dashboard/invoice-wizard/types";

function parseAttributes(raw: unknown): AttributeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is { key?: unknown; value?: unknown } =>
        typeof item === "object" && item !== null
    )
    .map((item) => ({
      key: String(item.key ?? ""),
      value: String(item.value ?? ""),
    }))
    .filter((item) => item.key !== "");
}
export const metadata = {
  title: "ثبت سرویس و صدور فاکتور جدید | پنل کلینیک",
};

export default async function NewClientInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  if (!hasPermission(ctx.clinicUser, "services.create")) {
    redirect("/clinic-dashboard");
  }

  const { id } = await params;

  const [client, clinic, operator] = await Promise.all([
    prisma.client.findFirst({
      where: { id, clinicId: ctx.clinicId },
      include: {
        user: {
          select: { fullName: true, phone: true, nationalId: true },
        },
      },
    }),
    prisma.clinic.findUnique({
      where: { id: ctx.clinicId },
      select: { name: true },
    }),
    prisma.clinicUser.findUnique({
      where: { id: ctx.clinicUserId },
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  if (!client || !clinic) notFound();

  const serviceScopeFilter = buildServiceScopeFilter(ctx.clinicUser);

  const [
    catalogServices,
    products,
    staffMembers,
    clientReferrers,
    terminals,
    creditProviders,
  ] = await Promise.all([
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

    prisma.clinicUser.findMany({
      where: {
        clinicId: ctx.clinicId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        user: { select: { fullName: true } },
        assignedServices: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
    }),

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

    prisma.paymentTerminal.findMany({
      where: { clinicId: ctx.clinicId, isActive: true },
      include: {
        bankAccount: { select: { bankName: true } },
      },
    }),

    prisma.clinicCreditProvider.findMany({
      where: { clinicId: ctx.clinicId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const isNoPhone = client.user.phone.startsWith("NO_PHONE_");

  return (
    <InvoiceWizardContainer
      clinicName={clinic.name}
      operatorName={operator?.user?.fullName || operator?.jobTitle || "اپراتور"}
      client={{
        id: client.id,
        fullName: client.user.fullName || "مراجعه‌کننده",
        phone: isNoPhone ? null : client.user.phone,
        nationalId: client.user.nationalId,
        gender: client.gender,
        walletBalance: client.walletBalance,
      }}
      catalogServices={catalogServices.map((s) => ({
        id: s.id,
        title: s.title,
        subServices: s.subServices.map((sub) => ({
          id: sub.id,
          title: sub.title,
          price: sub.price,
          attributes: parseAttributes(sub.attributes),
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
          expirationDate: b.expirationDate
            ? b.expirationDate.toISOString()
            : null,
          exclusiveSubServiceId: b.exclusiveSubServiceId,
          exclusiveTherapistId: b.exclusiveTherapistId,
        })),
      }))}
      therapists={staffMembers
        .filter((s) => s.canBeTherapist)
        .map((s) => ({
          id: s.id,
          label: s.user.fullName || s.jobTitle,
          hasAllServicesAccess: s.isOwner || s.hasAllServicesAccess,
          assignedServiceIds: s.assignedServices.map((as) => as.id),
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
      creditProviders={creditProviders.map((cp) => ({
        id: cp.id,
        title: cp.title,
        commissionPercent: cp.commissionPercent,
        clientFeePercent: cp.clientFeePercent,
      }))}
      canApplyDiscount={
        ctx.clinicUser.isOwner ||
        hasPermission(ctx.clinicUser, "other.discounts")
      }
    />
  );
}