// app/clinic-dashboard/(dashboard)/clients/[id]/financial-records/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { ClientFinancialRecordsClient } from "@/components/clinic-dashboard/client-financial-records-client";

export const metadata = {
  title: "گزارش مالی مراجع | پنل کلینیک",
};

export default async function ClientFinancialRecordsPage({
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

  const [client, invoices, terminals] = await Promise.all([
    prisma.client.findFirst({
      where: { id, clinicId: ctx.clinicId },
      include: { user: { select: { fullName: true } } },
    }),
    prisma.invoice.findMany({
      where: { clientId: id, clinicId: ctx.clinicId },
      include: {
        providedServices: {
          include: {
            subService: {
              include: { service: { select: { title: true } } },
            },
            therapist: {
              include: { user: { select: { fullName: true } } },
            },
          },
        },
        payments: {
          include: {
            terminal: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentTerminal.findMany({
      where: { clinicId: ctx.clinicId },
      include: { bankAccount: { select: { bankName: true } } },
    }),
  ]);

  if (!client) notFound();

  const totalDebt = invoices.reduce(
    (sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount),
    0
  );

  return (
    <ClientFinancialRecordsClient
      client={{
        id: client.id,
        fullName: client.user.fullName || "مراجعه‌کننده",
        walletBalance: client.walletBalance,
      }}
      totalDebt={totalDebt}
      invoices={invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        discountAmount: inv.discountAmount,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
        services: inv.providedServices.map((ps) => ({
          id: ps.id,
          serviceTitle: ps.subService.service.title,
          subServiceTitle: ps.subService.title,
          therapistName:
            ps.therapist?.user.fullName || ps.therapistNameSnapshot || "—",
          finalPrice: ps.finalPrice,
        })),
        payments: inv.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          terminalName: p.terminal?.name || null,
          creditProvider: p.creditProvider,
          trackingCode: p.trackingCode,
          createdAt: p.createdAt.toISOString(),
        })),
        installments: inv.installments.map((ins) => ({
          id: ins.id,
          installmentNumber: ins.installmentNumber,
          amount: ins.amount,
          dueDate: ins.dueDate.toISOString(),
          isCheck: ins.isCheck,
          checkNumber: ins.checkNumber,
          status: ins.status,
        })),
      }))}
      terminals={terminals.map((t) => ({
        value: t.id,
        label: `${t.name} (${t.bankAccount.bankName})`,
      }))}
      canManageFinance={hasPermission(ctx.clinicUser, "finance.accounting")}
    />
  );
}