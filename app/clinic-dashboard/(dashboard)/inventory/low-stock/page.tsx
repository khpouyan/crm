// app/clinic-dashboard/(dashboard)/inventory/low-stock/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { parsePaginationParams } from "@/lib/inventory/pagination-helper";
import { InventoryLowStockClient } from "@/components/clinic-dashboard/inventory-low-stock-client";

export const metadata = {
  title: "کالاهای تمام‌شده و نزدیک به اتمام | انبار",
};

export default async function InventoryLowStockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const canManage = hasPermission(ctx.clinicUser, "finance.inventory");
  const canView =
    canManage || hasPermission(ctx.clinicUser, "tools.inventory_view");
  if (!canView) redirect("/clinic-dashboard");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePaginationParams(params);

  // محاسبه موجودی کل هر کالا و فیلتر موارد کمتر یا مساوی alertThreshold
  const allProducts = await prisma.clinicProduct.findMany({
    where: { clinicId: ctx.clinicId },
    include: {
      batches: { where: { quantity: { gt: 0 } }, select: { quantity: true } },
    },
    orderBy: { name: "asc" },
  });

  const lowStockItems = allProducts
    .map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      unit: p.unit,
      alertThreshold: p.alertThreshold,
      totalStock: p.batches.reduce((s, b) => s + b.quantity, 0),
    }))
    .filter((p) => p.totalStock <= p.alertThreshold)
    .sort((a, b) => a.totalStock - b.totalStock);

  const totalCount = lowStockItems.length;
  const paginatedItems = lowStockItems.slice(skip, skip + take);

  return (
    <InventoryLowStockClient
      items={paginatedItems}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      canManage={canManage}
    />
  );
}
