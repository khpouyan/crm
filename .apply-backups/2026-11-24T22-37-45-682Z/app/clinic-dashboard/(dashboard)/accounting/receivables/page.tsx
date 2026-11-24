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

  const [invoices, services, therapists, staffUsers, clients, descriptions] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { clinicId: ctx.clinicId },
        include: {
          client: {
            include: { user: { select: { fullName: true, nationalId: true } } },
          },
          providedServices: {
            include: {
              subService: { include: { service: { select: { id: true, title: true } } } },
              therapist: { include: { user: { select: { fullName: true } } } },
            },
          },
          payments: true,
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
      prisma.accountingDescriptionItem.findMany({
        where: { clinicId: ctx.clinicId, scope: "RECEIVE" },
        orderBy: { createdAt: "asc" },
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

    for (const p of inv.payments) {
      if (p.paymentMethod === "CARD_TO_CARD") cardToCard += p.amount;
      else if (p.paymentMethod === "POS") pos += p.amount;
      else if (p.paymentMethod === "CASH") cash += p.amount;
      else if (p.paymentMethod === "CREDIT") credit += p.amount;
      else if (p.paymentMethod === "WALLET") walletWithdraw += p.amount;
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
      descriptionLabel: inv.invoiceNumber ? `فاکتور #${inv.invoiceNumber}` : "فاکتور",
      cardToCard,
      pos,
      cash,
      credit,
      walletWithdraw,
      walletDeposit: inv.depositAmount || 0,
      checkSum,
      receivedSum,
      grandSum,
      serviceId: firstSrv?.subService.service.id || "NONE",
      serviceTitle:
        Array.from(new Set(inv.providedServices.map((s) => s.subService.service.title))).join("، ") || "—",
      therapistId: firstSrv?.therapistId || "NONE",
      therapistName:
        firstSrv?.therapist?.user.fullName || firstSrv?.therapistNameSnapshot || "—",
      notes: firstSrv?.description || "—",
      createdById: firstSrv?.createdById || "NONE",
      paymentMethods: inv.payments.map((p) => p.paymentMethod),
    };
  });

  return (
    <ReceivablesReportClient
      rows={rows}
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