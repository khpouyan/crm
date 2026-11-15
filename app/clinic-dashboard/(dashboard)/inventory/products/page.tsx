// app/clinic-dashboard/(dashboard)/inventory/products/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { parsePaginationParams } from "@/lib/inventory/pagination-helper";
import { checkClinicExportCapability } from "@/lib/export/data-export";
import { InventoryProductsClient } from "@/components/clinic-dashboard/inventory-products-client";

export const metadata = {
  title: "تعریف کالا و مصرفی | انبار",
};

export default async function InventoryProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const canManage = hasPermission(ctx.clinicUser, "finance.inventory");
  const canView =
    canManage || hasPermission(ctx.clinicUser, "tools.inventory_view");
  if (!canView) redirect("/clinic-dashboard");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePaginationParams(params);
  const query = params.q?.trim() || "";

  const whereClause = {
    clinicId: ctx.clinicId,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { code: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [totalCount, products, canExport] = await Promise.all([
    prisma.clinicProduct.count({ where: whereClause }),
    prisma.clinicProduct.findMany({
      where: whereClause,
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          select: { quantity: true },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    checkClinicExportCapability(ctx.clinicId),
  ]);

  const serializedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    unit: p.unit,
    packageUnit: p.packageUnit,
    unitsPerPackage: p.unitsPerPackage,
    alertThreshold: p.alertThreshold,
    totalStock: p.batches.reduce((sum, b) => sum + b.quantity, 0),
  }));

  return (
    <InventoryProductsClient
      products={serializedProducts}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      initialQuery={query}
      canManage={canManage}
      canExport={canExport}
    />
  );
}
