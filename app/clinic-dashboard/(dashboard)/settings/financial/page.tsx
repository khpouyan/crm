// app/clinic-dashboard/(dashboard)/settings/financial/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { FinancialSettingsClient } from "@/components/clinic-dashboard/financial-settings-client";

export const metadata = {
  title: "تنظیمات مالی و سرویس‌های اعتباری | پنل کلینیک",
};

export default async function FinancialSettingsPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const canAccess =
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "management.settings") ||
    hasPermission(ctx.clinicUser, "finance.accounting");

  if (!canAccess) {
    redirect("/clinic-dashboard");
  }

  const [bankAccounts, terminals, creditProviders] = await Promise.all([
    prisma.clinicBankAccount.findMany({
      where: { clinicId: ctx.clinicId },
      orderBy: { bankName: "asc" },
    }),
    prisma.paymentTerminal.findMany({
      where: { clinicId: ctx.clinicId },
      include: { bankAccount: { select: { bankName: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.clinicCreditProvider.findMany({
      where: { clinicId: ctx.clinicId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <FinancialSettingsClient
      bankAccounts={bankAccounts}
      terminals={terminals.map((t) => ({
        id: t.id,
        bankAccountId: t.bankAccountId,
        bankName: t.bankAccount.bankName,
        name: t.name,
        type: t.type,
        terminalCode: t.terminalCode,
        isActive: t.isActive,
      }))}
      creditProviders={creditProviders.map((cp) => ({
        id: cp.id,
        title: cp.title,
        commissionPercent: cp.commissionPercent,
        clientFeePercent: cp.clientFeePercent,
        isActive: cp.isActive,
      }))}
    />
  );
}