// app/clinic-dashboard/(dashboard)/accounting/settings/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { AccountingSettingsClient } from "@/components/clinic-dashboard/accounting/accounting-settings-client";

export const metadata = {
  title: "صندوق و حسابداری — تنظیمات حسابداری | پنل کلینیک",
};

export default async function AccountingSettingsPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return null;

  const [clinic, beneficiaries, descriptions, services] = await Promise.all([
    prisma.clinic.findUnique({
      where: { id: ctx.clinicId },
      select: { vatPercent: true },
    }),
    prisma.accountingBeneficiary.findMany({
      where: { clinicId: ctx.clinicId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.accountingDescriptionItem.findMany({
      where: { clinicId: ctx.clinicId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.service.findMany({
      where: { clinicId: ctx.clinicId },
      select: { id: true, title: true, taxEnabled: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <AccountingSettingsClient
      initialVatPercent={clinic?.vatPercent ?? 0}
      beneficiaries={beneficiaries.map((b) => ({
        id: b.id,
        fullName: b.fullName,
        phone: b.phone,
        notes: b.notes,
      }))}
      descriptions={descriptions.map((d) => ({
        id: d.id,
        scope: d.scope as "PAYOUT" | "RECEIVE" | "DEBT",
        title: d.title,
      }))}
      services={services}
    />
  );
}
