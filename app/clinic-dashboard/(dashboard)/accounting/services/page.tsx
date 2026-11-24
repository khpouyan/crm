// app/clinic-dashboard/(dashboard)/accounting/services/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { buildProvidedServiceScopeFilter, buildServiceScopeFilter } from "@/lib/permissions";
import { AccountingServicesClient } from "@/components/clinic-dashboard/accounting/services-report-client";

export const metadata = {
  title: "صندوق و حسابداری — خدمات | پنل کلینیک",
};

export default async function AccountingServicesPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return null;

  const providedScope = buildProvidedServiceScopeFilter(ctx.clinicUser);
  const serviceScope = buildServiceScopeFilter(ctx.clinicUser);

  const [providedServices, services, therapists, staffUsers, clients] =
    await Promise.all([
      prisma.providedService.findMany({
        where: {
          client: { clinicId: ctx.clinicId },
          ...providedScope,
        },
        include: {
          client: {
            include: {
              user: { select: { fullName: true, phone: true, nationalId: true } },
            },
          },
          subService: {
            include: { service: { select: { id: true, title: true } } },
          },
          therapist: { include: { user: { select: { fullName: true } } } },
          assistants: { include: { user: { select: { fullName: true } } } },
          invoice: {
            include: {
              payments: { select: { amount: true, paymentMethod: true, trackingCode: true } },
            },
          },
        },
        orderBy: { performedAt: "desc" },
        take: 1000,
      }),
      prisma.service.findMany({
        where: { clinicId: ctx.clinicId, ...serviceScope },
        include: { subServices: { select: { id: true, title: true } } },
        orderBy: { title: "asc" },
      }),
      prisma.clinicUser.findMany({
        where: { clinicId: ctx.clinicId, deletedAt: null, canBeTherapist: true },
        include: { user: { select: { fullName: true } } },
      }),
      prisma.clinicUser.findMany({
        where: { clinicId: ctx.clinicId, deletedAt: null },
        include: { user: { select: { fullName: true } } },
      }),
      prisma.client.findMany({
        where: { clinicId: ctx.clinicId },
        include: { user: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

  const creatorMap = new Map(
    staffUsers.map((u) => [u.id, u.user.fullName || u.jobTitle])
  );

  const rows = providedServices.map((ps) => {
    const inv = ps.invoice;
    const totalInvoice = inv?.totalAmount ?? ps.finalPrice;
    const paidInvoice = inv?.paidAmount ?? ps.finalPrice;
    const creditAmount = inv
      ? inv.payments
          .filter((p) => p.paymentMethod === "CREDIT")
          .reduce((sum, p) => sum + p.amount, 0)
      : 0;
    const remaining = Math.max(0, totalInvoice - paidInvoice);
    const isNoPhone = ps.client.user.phone.startsWith("NO_PHONE_");
    const paymentMethods = inv
      ? Array.from(new Set(inv.payments.map((p) => p.paymentMethod)))
      : [];
    const trackingCodes = inv
      ? inv.payments.map((p) => p.trackingCode).filter(Boolean).join("، ")
      : "";

    return {
      id: ps.id,
      clientId: ps.clientId,
      performedAtIso: ps.performedAt.toISOString(),
      operatorName: ps.createdById
        ? creatorMap.get(ps.createdById) || "اپراتور"
        : "اپراتور",
      clientName: ps.client.user.fullName || "بدون نام",
      clientPhone: isNoPhone ? "—" : ps.client.user.phone,
      fileNumber: ps.client.fileNumber,
      nationalId: ps.client.user.nationalId || "—",
      serviceId: ps.subService.service.id,
      serviceTitle: ps.subService.service.title,
      subServiceId: ps.subServiceId,
      subServiceTitle: ps.subService.title,
      therapistId: ps.therapistId || "NONE",
      therapistName:
        ps.therapist?.user.fullName || ps.therapistNameSnapshot || "—",
      assistantNames:
        ps.assistants.map((a) => a.user.fullName || "دستیار").join("، ") || "—",
      serviceAmount: ps.finalPrice,
      discountAmount: inv?.discountAmount ?? 0,
      extraChargeAmount: inv?.extraChargeAmount ?? 0,
      taxAmount: inv?.taxAmount ?? 0,
      creditAmount,
      invoiceTotal: totalInvoice,
      invoiceCreatedAtIso: (inv?.createdAt ?? ps.createdAt).toISOString(),
      paidAmount: paidInvoice,
      paymentMethods,
      paymentRef: trackingCodes || "—",
      remainingAmount: remaining,
      description: ps.description || "—",
      createdById: ps.createdById || "NONE",
    };
  });

  return (
    <AccountingServicesClient
      rows={rows}
      services={services.map((s) => ({
        id: s.id,
        title: s.title,
        subServices: s.subServices,
      }))}
      therapists={therapists.map((t) => ({
        value: t.id,
        label: t.user.fullName || t.jobTitle,
      }))}
      operators={staffUsers.map((u) => ({
        value: u.id,
        label: u.user.fullName || u.jobTitle,
      }))}
      clients={clients.map((c) => ({
        value: c.id,
        label: `${c.user.fullName || "بدون نام"}${c.fileNumber ? ` (#${c.fileNumber})` : ""}`,
      }))}
    />
  );
}
