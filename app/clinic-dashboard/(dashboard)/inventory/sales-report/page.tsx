// app/clinic-dashboard/(dashboard)/inventory/sales-report/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { parsePaginationParams } from "@/lib/inventory/pagination-helper";
import { checkClinicExportCapability } from "@/lib/export/data-export";
import { InventorySalesReportClient } from "@/components/clinic-dashboard/inventory-sales-report-client";

export const metadata = {
  title: "گزارش فروش و هزینه کالاها | انبار",
};

export default async function InventorySalesReportPage({
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

  const canView =
    hasPermission(ctx.clinicUser, "finance.inventory") ||
    hasPermission(ctx.clinicUser, "finance.accounting");
  if (!canView) redirect("/clinic-dashboard");

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
  const hasDate = Boolean(dateFilter.gte || dateFilter.lte);

  const [usages, stockOuts, services, staffs, canExport] = await Promise.all([
    prisma.usedConsumable.findMany({
      where: {
        clinicProduct: { clinicId: ctx.clinicId },
        providedService: {
          ...(hasDate ? { createdAt: dateFilter } : {}),
          ...(params.serviceId
            ? { subService: { serviceId: params.serviceId } }
            : {}),
          ...(params.staffId ? { therapistId: params.staffId } : {}),
        },
      },
      include: {
        clinicProduct: { select: { name: true, unit: true } },
        providedService: {
          select: {
            clientId: true,
            invoiceId: true,
            createdAt: true,
            therapistNameSnapshot: true,
            client: {
              select: {
                user: { select: { fullName: true } },
              },
            },
            subService: {
              select: { title: true, service: { select: { title: true } } },
            },
          },
        },
      },
      orderBy: { providedService: { createdAt: "desc" } },
    }),
    // خروج دستی زمانی که فیلتر خدمت خاص انتخاب نشده باشد
    params.serviceId
      ? Promise.resolve([])
      : prisma.inventoryStockOut.findMany({
          where: {
            clinicId: ctx.clinicId,
            ...(hasDate ? { createdAt: dateFilter } : {}),
            ...(params.staffId ? { createdById: params.staffId } : {}),
          },
          include: {
            clinicProduct: { select: { name: true, unit: true } },
            createdBy: { select: { user: { select: { fullName: true } } } },
          },
          orderBy: { createdAt: "desc" },
        }),
    prisma.service.findMany({
      where: { clinicId: ctx.clinicId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.clinicUser.findMany({
      where: { clinicId: ctx.clinicId, isActive: true, deletedAt: null },
      select: { id: true, user: { select: { fullName: true } } },
    }),
    checkClinicExportCapability(ctx.clinicId),
  ]);

  // ترکیب اقلام کسرشده با خدمات و اقلام خروجی دستی
  const combinedItems = [
    ...usages.map((u) => {
      const isSale = Boolean(u.sellingPrice && u.sellingPrice > 0);
      const totalCost = u.unitCost * u.quantity;
      const totalRevenue = isSale ? (u.sellingPrice || 0) * u.quantity : 0;
      const clientName = u.providedService.client?.user?.fullName;
      return {
        id: `usage-${u.id}`,
        source: "SERVICE" as const,
        sourceLabel: `${u.providedService.subService.service.title} - ${u.providedService.subService.title}`,
        clientName: clientName || null,
        clientId: u.providedService.clientId,
        invoiceId: u.providedService.invoiceId,
        stockOutId: null,
        productName: u.clinicProduct.name,
        unit: u.clinicProduct.unit,
        quantity: u.quantity,
        isSale,
        totalCost,
        totalRevenue,
        netProfit: isSale ? totalRevenue - totalCost : 0,
        staffName: u.providedService.therapistNameSnapshot || "—",
        createdAt: u.providedService.createdAt.toISOString(),
      };
    }),
    ...stockOuts.map((o) => {
      const isSale = Boolean(o.sellingPrice && o.sellingPrice > 0);
      const totalCost = o.unitCost * o.quantity;
      const totalRevenue = isSale ? (o.sellingPrice || 0) * o.quantity : 0;
      return {
        id: `out-${o.id}`,
        source: "MANUAL" as const,
        sourceLabel: o.reason || "خروج دستی",
        clientName: null,
        clientId: null,
        invoiceId: null,
        stockOutId: o.id,
        productName: o.clinicProduct.name,
        unit: o.clinicProduct.unit,
        quantity: o.quantity,
        isSale,
        totalCost,
        totalRevenue,
        netProfit: isSale ? totalRevenue - totalCost : 0,
        staffName: o.createdBy?.user.fullName || "—",
        createdAt: o.createdAt.toISOString(),
      };
    }),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // محاسبه آمار کل برای کارت‌های بالای صفحه:
  // ۱. کالاهایی که قیمت فروش نداشتند -> هزینه کالاهای مصرفی
  // ۲. کالاهایی که قیمت فروش داشتند -> درآمد و سود فروش کالا
  const totalConsumableExpense = combinedItems
    .filter((i) => !i.isSale)
    .reduce((sum, i) => sum + i.totalCost, 0);

  const totalSalesProfit = combinedItems
    .filter((i) => i.isSale)
    .reduce((sum, i) => sum + i.netProfit, 0);

  const totalSalesRevenue = combinedItems
    .filter((i) => i.isSale)
    .reduce((sum, i) => sum + i.totalRevenue, 0);

  const totalCount = combinedItems.length;
  const paginatedRows = combinedItems.slice(skip, skip + take);

  return (
    <InventorySalesReportClient
      rows={paginatedRows}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      summary={{
        totalConsumableExpense,
        totalSalesProfit,
        totalSalesRevenue,
      }}
      services={services}
      staffs={staffs.map((s) => ({
        id: s.id,
        fullName: s.user.fullName || "بدون نام",
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