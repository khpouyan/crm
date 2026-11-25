// app/clinic-dashboard/(dashboard)/accounting/receivables/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { ReceivablesReportClient } from "@/components/clinic-dashboard/accounting/receivables-report-client";

export const metadata = {
  title: "صندوق و حسابداری — دریافتی‌ها | پنل کلینیک",
};

export default async function ReceivablesPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return null;

  const [
    invoices,
    services,
    therapists,
    staffUsers,
    clients,
    descriptions,
    terminals,
    bankAccounts,
    creditProviders,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { clinicId: ctx.clinicId },
      include: {
        client: {
          include: { user: { select: { fullName: true, nationalId: true } } },
        },
        providedServices: {
          include: {
            subService: {
              include: { service: { select: { id: true, title: true } } },
            },
            therapist: { include: { user: { select: { fullName: true } } } },
          },
        },
        payments: {
          include: {
            terminal: {
              include: {
                bankAccount: {
                  select: { id: true, bankName: true, cardNumber: true },
                },
              },
            },
            creditProviderConfig: {
              select: { id: true, title: true },
            },
          },
        },
        installments: { where: { isCheck: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.service.findMany({
      where: { clinicId: ctx.clinicId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.clinicUser.findMany({
      where: {
        clinicId: ctx.clinicId,
        deletedAt: null,
        canBeTherapist: true,
      },
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
    prisma.accountingDescriptionItem.findMany({
      where: { clinicId: ctx.clinicId, scope: "RECEIVE" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.paymentTerminal.findMany({
      where: { clinicId: ctx.clinicId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.clinicBankAccount.findMany({
      where: { clinicId: ctx.clinicId },
      select: { id: true, bankName: true, cardNumber: true },
      orderBy: { bankName: "asc" },
    }),
    prisma.clinicCreditProvider.findMany({
      where: { clinicId: ctx.clinicId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const creatorMap = new Map(
    staffUsers.map((u) => [u.id, u.user.fullName || u.jobTitle])
  );

  const rows = invoices.map((inv) => {
    const firstSrv = inv.providedServices[0];
    const firstPay = inv.payments[0];
    const txDate = firstPay?.paidAt ?? inv.createdAt;

    let cardToCard = 0;
    let pos = 0;
    let cash = 0;
    let credit = 0;
    let walletWithdraw = 0;

    const posBreakdowns: Array<{
      terminalId: string;
      terminalName: string;
      amount: number;
    }> = [];
    const cardBreakdowns: Array<{
      cardKey: string;
      cardLabel: string;
      amount: number;
    }> = [];
    const creditBreakdowns: Array<{
      creditKey: string;
      creditLabel: string;
      amount: number;
    }> = [];
    const posNamesSet = new Set<string>();
    const cardNamesSet = new Set<string>();
    const creditNamesSet = new Set<string>();

    for (const p of inv.payments) {
      if (p.paymentMethod === "CARD_TO_CARD") {
        cardToCard += p.amount;
        const bank = p.terminal?.bankAccount;
        const cleanDigits = (bank?.cardNumber || "").replace(/\D/g, "");
        const last4 = cleanDigits ? cleanDigits.slice(-4) : "----";
        const cardName = bank?.bankName || "کارت بانکی";
        const label = `${cardName} (${last4})`;
        cardNamesSet.add(label);
        cardBreakdowns.push({
          cardKey: bank?.id || `${cardName}-${last4}`,
          cardLabel: `${cardName} (•••• ${last4})`,
          amount: p.amount,
        });
      } else if (p.paymentMethod === "POS") {
        pos += p.amount;
        const termName = p.terminal?.name || "کارت‌خوان";
        posNamesSet.add(termName);
        posBreakdowns.push({
          terminalId: p.terminalId || termName,
          terminalName: termName,
          amount: p.amount,
        });
      } else if (p.paymentMethod === "CREDIT") {
        credit += p.amount;
        const providerTitle =
          p.creditProviderConfig?.title || p.creditProvider || "سرویس اعتباری";
        creditNamesSet.add(`${providerTitle} (${p.amount.toLocaleString("fa-IR")})`);
        creditBreakdowns.push({
          creditKey: p.creditProviderId || providerTitle,
          creditLabel: providerTitle,
          amount: p.amount,
        });
      } else if (p.paymentMethod === "CASH") {
        cash += p.amount;
      } else if (p.paymentMethod === "WALLET") {
        walletWithdraw += p.amount;
      }
    }

    const checkSum = inv.installments.reduce((s, c) => s + c.amount, 0);
    const receivedSum = cardToCard + pos + cash + credit + walletWithdraw;
    const grandSum = receivedSum + checkSum;

    return {
      id: inv.id,
      clientId: inv.clientId,
      txDateIso: txDate.toISOString(),
      operatorName: firstSrv?.createdById
        ? creatorMap.get(firstSrv.createdById) || "اپراتور"
        : "اپراتور",
      clientName: inv.client.user.fullName || "بدون نام",
      nationalId: inv.client.user.nationalId || "—",
      descriptionLabel: inv.invoiceNumber
        ? `فاکتور #${inv.invoiceNumber}`
        : "فاکتور",
      cardToCard,
      cardNamesText: Array.from(cardNamesSet).join("، ") || "—",
      pos,
      posNamesText: Array.from(posNamesSet).join("، ") || "—",
      cash,
      credit,
      creditNamesText: Array.from(creditNamesSet).join("، ") || "—",
      walletWithdraw,
      walletDeposit: inv.depositAmount || 0,
      checkSum,
      receivedSum,
      grandSum,
      posBreakdowns,
      cardBreakdowns,
      creditBreakdowns,
      serviceId: firstSrv?.subService.service.id || "NONE",
      serviceTitle:
        Array.from(
          new Set(inv.providedServices.map((s) => s.subService.service.title))
        ).join("، ") || "—",
      therapistId: firstSrv?.therapistId || "NONE",
      therapistName:
        firstSrv?.therapist?.user.fullName ||
        firstSrv?.therapistNameSnapshot ||
        "—",
      notes: firstSrv?.description || "—",
      createdById: firstSrv?.createdById || "NONE",
      paymentMethods: inv.payments.map((p) => p.paymentMethod),
    };
  });

  return (
    <ReceivablesReportClient
      rows={rows}
      terminals={terminals}
      bankAccounts={bankAccounts}
      creditProviders={creditProviders}
      services={services.map((s) => ({ value: s.id, label: s.title }))}
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
        label: c.user.fullName || "بدون نام",
      }))}
      descriptions={descriptions.map((d) => ({ id: d.id, title: d.title }))}
    />
  );
}
