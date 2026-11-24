// app/clinic-dashboard/(dashboard)/accounting/claims/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { ClaimsReportClient } from "@/components/clinic-dashboard/accounting/claims-report-client";

export const metadata = {
  title: "صندوق و حسابداری — مطالبات | پنل کلینیک",
};

export default async function ClaimsPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return null;

  const invoices = await prisma.invoice.findMany({
    where: {
      clinicId: ctx.clinicId,
      status: { in: ["UNPAID", "PARTIAL", "INSTALLMENT"] },
    },
    include: {
      client: {
        include: { user: { select: { fullName: true, phone: true, nationalId: true } } },
      },
      providedServices: {
        include: {
          subService: { include: { service: { select: { title: true } } } },
          therapist: { include: { user: { select: { fullName: true } } } },
        },
      },
      installments: { orderBy: { installmentNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = invoices
    .map((inv) => {
      const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
      const isNoPhone = inv.client.user.phone.startsWith("NO_PHONE_");
      const nextDue = inv.installments.find((i) => i.status !== "PAID")?.dueDate;

      return {
        id: inv.id,
        clientId: inv.clientId,
        invoiceNumber: inv.invoiceNumber,
        createdAtIso: inv.createdAt.toISOString(),
        nextDueDateIso: nextDue ? nextDue.toISOString() : null,
        clientName: inv.client.user.fullName || "بدون نام",
        clientPhone: isNoPhone ? "—" : inv.client.user.phone,
        fileNumber: inv.client.fileNumber,
        nationalId: inv.client.user.nationalId || "—",
        serviceTitles:
          Array.from(new Set(inv.providedServices.map((s) => s.subService.service.title))).join("، ") || "—",
        therapistName: inv.providedServices[0]?.therapist?.user.fullName || "—",
        status: inv.status,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        remainingAmount: remaining,
        installmentsCount: inv.installments.length,
      };
    })
    .filter((r) => r.remainingAmount > 0);

  return <ClaimsReportClient rows={rows} />;
}