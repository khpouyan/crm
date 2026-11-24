// app/clinic-dashboard/(dashboard)/accounting/commission/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { CommissionSimpleClient } from "@/components/clinic-dashboard/accounting/commission-simple-client";

export const metadata = {
  title: "صندوق و حسابداری — محاسبه کمیسیون | پنل کلینیک",
};

export default async function CommissionPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return null;

  const [providedServices, services, staffMembers] = await Promise.all([
    prisma.providedService.findMany({
      where: { client: { clinicId: ctx.clinicId } },
      include: {
        client: { include: { user: { select: { fullName: true } } } },
        subService: { include: { service: { select: { id: true, title: true } } } },
        therapist: { include: { user: { select: { fullName: true } } } },
        referrer: { include: { user: { select: { fullName: true } } } },
        referrerClient: { include: { user: { select: { fullName: true } } } },
        usedConsumables: true,
      },
      orderBy: { performedAt: "desc" },
      take: 1000,
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
  ]);

  return (
    <CommissionSimpleClient
      services={services.map((s) => ({ value: s.id, label: s.title }))}
      staffOptions={staffMembers.map((m) => ({
        value: m.id,
        label: m.user.fullName || m.jobTitle,
      }))}
      items={providedServices.map((ps) => {
        const purchaseCost = ps.usedConsumables.reduce(
          (sum, uc) => sum + uc.quantity * uc.unitCost,
          0
        );
        const sellCost = ps.usedConsumables.reduce(
          (sum, uc) => sum + uc.quantity * (uc.sellingPrice ?? uc.unitCost),
          0
        );

        return {
          id: ps.id,
          clientId: ps.clientId,
          performedAtIso: ps.performedAt.toISOString(),
          clientName: ps.client.user.fullName || "بدون نام",
          serviceId: ps.subService.service.id,
          serviceTitle: `${ps.subService.service.title} — ${ps.subService.title}`,
          therapistId: ps.therapistId || "NONE",
          referrerId: ps.referrerId || ps.referrerClientId || "NONE",
          personName:
            ps.therapist?.user.fullName ||
            ps.referrer?.user.fullName ||
            ps.referrerClient?.user.fullName ||
            "—",
          finalPrice: ps.finalPrice,
          purchaseCost,
          sellCost,
        };
      })}
    />
  );
}
