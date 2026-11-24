// app/clinic-dashboard/(dashboard)/accounting/wallet/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { AccountingWalletClient } from "@/components/clinic-dashboard/accounting/wallet-report-client";

export const metadata = {
  title: "صندوق و حسابداری — کیف پول | پنل کلینیک",
};

export default async function AccountingWalletPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return null;

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      client: { clinicId: ctx.clinicId },
    },
    include: {
      client: {
        include: { user: { select: { fullName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const rows = transactions.map((tx) => ({
    id: tx.id,
    clientId: tx.clientId,
    createdAtIso: tx.createdAt.toISOString(),
    clientName: tx.client.user.fullName || "بدون نام",
    type: tx.type,
    paymentMethod: tx.paymentMethod || "—",
    amount: tx.amount,
    description: tx.description || "—",
  }));

  return <AccountingWalletClient rows={rows} />;
}