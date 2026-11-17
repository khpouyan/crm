// app/clinic-dashboard/(dashboard)/clients/[id]/wallet/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { ClientWalletClient } from "@/components/clinic-dashboard/client-wallet-client";

export const metadata = {
  title: "کیف پول مراجع | پنل کلینیک",
};

export default async function ClientWalletPage({
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

  const [client, transactions, terminals] = await Promise.all([
    prisma.client.findFirst({
      where: { id, clinicId: ctx.clinicId },
      include: { user: { select: { fullName: true } } },
    }),
    prisma.walletTransaction.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentTerminal.findMany({
      where: { clinicId: ctx.clinicId },
      include: { bankAccount: { select: { bankName: true } } },
    }),
  ]);

  if (!client) notFound();

  const totalDeposits = transactions
    .filter((t) => t.type === "DEPOSIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflows = transactions
    .filter((t) => t.type === "WITHDRAW" || t.type === "REFUND")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <ClientWalletClient
      client={{
        id: client.id,
        fullName: client.user.fullName || "مراجعه‌کننده",
        walletBalance: client.walletBalance,
      }}
      stats={{
        totalDeposits,
        totalOutflows,
        count: transactions.length,
      }}
      transactions={transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      }))}
      terminals={terminals.map((t) => ({
        value: t.id,
        label: `${t.name} (${t.bankAccount.bankName})`,
      }))}
      canManageFinance={hasPermission(ctx.clinicUser, "finance.accounting")}
    />
  );
}