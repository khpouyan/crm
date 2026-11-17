// app/clinic-dashboard/(dashboard)/inventory/stock-in/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { parsePaginationParams } from "@/lib/inventory/pagination-helper";
import { checkClinicExportCapability } from "@/lib/export/data-export";
import { InventoryStockInClient } from "@/components/clinic-dashboard/inventory-stock-in-client";

export const metadata = {
  title: "ورود کالا به انبار | انبار",
};

export default async function InventoryStockInPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    from?: string;
    to?: string;
    serviceId?: string;
    staffId?: string;
  }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  if (!hasPermission(ctx.clinicUser, "finance.inventory")) {
    redirect("/clinic-dashboard");
  }

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePaginationParams(params);

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params.from) {
    const d = new Date(params.from);
    d.setHours(0, 0, 0, 0);
    if (!isNaN(d.getTime())) dateFilter.gte = d;
  }
  if (params.to) {
    const d = new Date(params.to);
    d.setHours(23, 59, 59, 999);
    if (!isNaN(d.getTime())) dateFilter.lte = d;
  }

  const whereClause = {
    clinicProduct: { clinicId: ctx.clinicId },
    ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
    ...(params.serviceId
      ? { exclusiveSubService: { serviceId: params.serviceId } }
      : {}),
    ...(params.staffId ? { exclusiveTherapistId: params.staffId } : {}),
  };

  const [
    totalCount,
    batches,
    products,
    unsettledGrouped,
    services,
    subServices,
    staffs,
    canExport,
  ] = await Promise.all([
    prisma.productBatch.count({ where: whereClause }),
    prisma.productBatch.findMany({
      where: whereClause,
      include: {
        clinicProduct: {
          select: {
            id: true,
            name: true,
            unit: true,
            packageUnit: true,
            unitsPerPackage: true,
            _count: {
              select: { usedInServices: true },
            },
          },
        },
        exclusiveSubService: {
          select: { id: true, title: true, service: { select: { title: true } } },
        },
        exclusiveTherapist: {
          select: { id: true, user: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.clinicProduct.findMany({
      where: { clinicId: ctx.clinicId },
      select: {
        id: true,
        name: true,
        unit: true,
        packageUnit: true,
        unitsPerPackage: true,
      },
      orderBy: { name: "asc" },
    }),
    // محاسبه مجموع کسری‌های تسویه‌نشده هر کالا از خدمات قبلی
    prisma.usedConsumable.groupBy({
      by: ["clinicProductId"],
      where: {
        productBatchId: null,
        quantity: { gt: 0 },
        clinicProduct: { clinicId: ctx.clinicId },
      },
      _sum: {
        quantity: true,
      },
    }),
    prisma.service.findMany({
      where: { clinicId: ctx.clinicId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.subService.findMany({
      where: { service: { clinicId: ctx.clinicId } },
      select: { id: true, title: true, service: { select: { title: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.clinicUser.findMany({
      where: { clinicId: ctx.clinicId, isActive: true, deletedAt: null },
      select: {
        id: true,
        canBeTherapist: true,
        user: { select: { fullName: true } },
      },
    }),
    checkClinicExportCapability(ctx.clinicId),
  ]);

  const deficitMap = new Map<string, number>(
    unsettledGrouped.map((g) => [g.clinicProductId, g._sum.quantity ?? 0])
  );

  return (
    <InventoryStockInClient
      batches={batches.map((b) => ({
        ...b,
        expirationDate: b.expirationDate ? b.expirationDate.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
      }))}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      products={products.map((p) => ({
        ...p,
        unsettledDeficit: deficitMap.get(p.id) ?? 0,
      }))}
      services={services}
      subServices={subServices}
      staffs={staffs.map((s) => ({
        id: s.id,
        fullName: s.user.fullName || "بدون نام",
        canBeTherapist: s.canBeTherapist,
      }))}
      filters={{
        from: params.from,
        to: params.to,
        serviceId: params.serviceId,
        staffId: params.staffId,
      }}
      canExport={canExport}
    />
  );
}