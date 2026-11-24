// app/clinic-dashboard/(dashboard)/accounting/debts/page.tsx
import { AccountingEntryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { PayoutsDebtsClient } from "@/components/clinic-dashboard/accounting/payouts-debts-client";

export const metadata = {
  title: "صندوق و حسابداری — بدهی‌ها | پنل کلینیک",
};

export default async function DebtsPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return null;

  const [entries, beneficiaries, services, therapists, clients, descriptions] =
    await Promise.all([
      prisma.accountingLedgerEntry.findMany({
        where: {
          clinicId: ctx.clinicId,
          entryType: AccountingEntryType.DEBT,
        },
        include: {
          beneficiary: true,
          service: { select: { id: true, title: true } },
          therapist: { include: { user: { select: { fullName: true } } } },
          client: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { entryDate: "desc" },
        take: 1000,
      }),
      prisma.accountingBeneficiary.findMany({
        where: { clinicId: ctx.clinicId },
        orderBy: { fullName: "asc" },
      }),
      prisma.service.findMany({
        where: { clinicId: ctx.clinicId },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
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
      prisma.accountingDescriptionItem.findMany({
        where: { clinicId: ctx.clinicId, scope: "DEBT" },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const creatorMap = new Map(
    therapists.map((t) => [t.id, t.user.fullName || t.jobTitle])
  );

  return (
    <PayoutsDebtsClient
      mode="DEBT"
      title="بدهی‌ها"
      subtitle="ثبت و گزارش بدهی‌های کلینیک به ذی‌نفعان فارغ از سرویس‌ها"
      rows={entries.map((e) => ({
        id: e.id,
        entryDateIso: e.entryDate.toISOString(),
        operatorName: e.createdById
          ? creatorMap.get(e.createdById) || "اپراتور"
          : "اپراتور",
        beneficiaryId: e.beneficiaryId || "NONE",
        beneficiaryName: e.beneficiary?.fullName || "—",
        serviceId: e.serviceId || "NONE",
        serviceTitle: e.service?.title || "—",
        therapistId: e.therapistId || "NONE",
        therapistName: e.therapist?.user.fullName || "—",
        clientId: e.clientId,
        clientName: e.client?.user.fullName || "—",
        paymentMethod: e.paymentMethod || "—",
        descriptionText: e.descriptionText || "—",
        amount: e.amount,
        notes: e.notes || "—",
        createdById: e.createdById || "NONE",
      }))}
      beneficiaries={beneficiaries.map((b) => ({
        value: b.id,
        label: b.phone ? `${b.fullName} (${b.phone})` : b.fullName,
      }))}
      services={services.map((s) => ({ value: s.id, label: s.title }))}
      therapists={therapists
        .filter((t) => t.canBeTherapist)
        .map((t) => ({ value: t.id, label: t.user.fullName || t.jobTitle }))}
      operators={therapists.map((t) => ({
        value: t.id,
        label: t.user.fullName || t.jobTitle,
      }))}
      clients={clients.map((c) => ({
        value: c.id,
        label: c.user.fullName || "بدون نام",
      }))}
      descriptions={descriptions.map((d) => ({ id: d.id, title: d.title }))}
    />
  );
}
