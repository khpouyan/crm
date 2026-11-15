// app/clinic-dashboard/(dashboard)/inventory/stock-out/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { parsePaginationParams } from "@/lib/inventory/pagination-helper";
import { InventoryStockOutClient } from "@/components/clinic-dashboard/inventory-stock-out-client";

export const metadata = {
  title: "خروج کالا از انبار | انبار",
};

export default async function InventoryStockOutPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  if (!hasPermission(ctx.clinicUser, "finance.inventory")) {
    redirect("/clinic-dashboard");
  }

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePaginationParams(params);

  const [totalCount, stockOuts, products] = await Promise.all([
    prisma.inventoryStockOut.count({ where: { clinicId: ctx.clinicId } }),
    prisma.inventoryStockOut.findMany({
      where: { clinicId: ctx.clinicId },
      include: {
        clinicProduct: { select: { name: true, unit: true } },
        createdBy: { select: { user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.clinicProduct.findMany({
      where: { clinicId: ctx.clinicId },
      include: {
        batches: { where: { quantity: { gt: 0 } }, select: { quantity: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <InventoryStockOutClient
      stockOuts={stockOuts.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        totalStock: p.batches.reduce((s, b) => s + b.quantity, 0),
      }))}
    />
  );
}
