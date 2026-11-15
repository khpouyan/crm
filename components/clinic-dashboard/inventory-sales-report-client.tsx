// components/clinic-dashboard/inventory-sales-report-client.tsx
"use client";

import React, { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TrendingUp, Wallet, Coins } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TomanIcon } from "@/components/ui/toman-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatJalaliNumeric } from "@/lib/jalali";
import {
  InventoryFilterBar,
  InventoryFilterValues,
} from "./inventory-filter-bar";
import { TablePaginationBar } from "./table-pagination-bar";
import { ExportDataMenu } from "./export-data-menu";
import { TableRowsSkeleton } from "./inventory-skeletons";

interface ReportRow {
  id: string;
  source: "SERVICE" | "MANUAL";
  sourceLabel: string;
  productName: string;
  unit: string;
  quantity: number;
  isSale: boolean;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  staffName: string;
  createdAt: string;
}

interface InventorySalesReportClientProps {
  rows: ReportRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: {
    totalConsumableExpense: number;
    totalSalesProfit: number;
    totalSalesRevenue: number;
  };
  services: { id: string; title: string }[];
  staffs: { id: string; fullName: string }[];
  filters: InventoryFilterValues;
  canExport: boolean;
}

export function InventorySalesReportClient({
  rows,
  totalCount,
  page,
  pageSize,
  summary,
  services,
  staffs,
  filters,
  canExport,
}: InventorySalesReportClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateUrlParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* هدر */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            گزارش مالی فروش و مصرف کالاها
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            تفکیک هزینه کالاهای مصرف‌شده در خدمات/انبار و سود خالص کالاهای فروخته‌شده
          </p>
        </div>

        <ExportDataMenu
          entity="INVENTORY_SALES_REPORT"
          canExport={canExport}
          filters={filters}
        />
      </div>

      {/* کارت‌های آماری جمع‌وجور (بهینه‌شده برای موبایل و دسکتاپ) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-3.5">
            <div>
              <p className="text-xs text-muted-foreground">
                هزینه کالاهای مصرفی (بدون قیمت فروش)
              </p>
              <p className="mt-1 flex items-center gap-1 text-base font-bold tabular-nums text-rose-600 sm:text-lg">
                {summary.totalConsumableExpense.toLocaleString("fa-IR")}
                <TomanIcon className="size-3.5 text-muted-foreground" />
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
              <Wallet className="size-4" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-3.5">
            <div>
              <p className="text-xs text-muted-foreground">
                سود خالص فروش کالاها
              </p>
              <p className="mt-1 flex items-center gap-1 text-base font-bold tabular-nums text-emerald-600 sm:text-lg">
                {summary.totalSalesProfit.toLocaleString("fa-IR")}
                <TomanIcon className="size-3.5 text-muted-foreground" />
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="size-4" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-3.5">
            <div>
              <p className="text-xs text-muted-foreground">
                مجموع فروش ناخالص کالاها
              </p>
              <p className="mt-1 flex items-center gap-1 text-base font-bold tabular-nums sm:text-lg">
                {summary.totalSalesRevenue.toLocaleString("fa-IR")}
                <TomanIcon className="size-3.5 text-muted-foreground" />
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Coins className="size-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* نوار فیلتر */}
      <InventoryFilterBar
        services={services}
        staffs={staffs}
        initialValues={filters}
        disabled={isPending}
        onApply={(vals) =>
          updateUrlParams({
            from: vals.from,
            to: vals.to,
            serviceId: vals.serviceId,
            staffId: vals.staffId,
            page: "1",
          })
        }
      />

      {/* جدول جزئیات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            ریز تراکنش‌های مصرف و فروش کالا
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            {isPending ? (
              <TableRowsSkeleton rows={pageSize > 10 ? 8 : pageSize} cols={7} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right">کالا</TableHead>
                    <TableHead className="text-right">تعداد</TableHead>
                    <TableHead className="text-right">نوع محاسبه</TableHead>
                    <TableHead className="text-right">بهای تمام‌شده</TableHead>
                    <TableHead className="text-right">فروش / سود</TableHead>
                    <TableHead className="text-right">منبع / خدمت</TableHead>
                    <TableHead className="text-right">تاریخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        تراکنشی مطابق فیلترهای انتخابی یافت نشد.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.productName}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.quantity.toLocaleString("fa-IR")} {row.unit}
                        </TableCell>
                        <TableCell>
                          {row.isSale ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500 text-emerald-600"
                            >
                              فروش کالا
                            </Badge>
                          ) : (
                            <Badge variant="secondary">هزینه مصرفی</Badge>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {row.totalCost.toLocaleString("fa-IR")} تومان
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {row.isSale ? (
                            <span className="font-semibold text-emerald-600">
                              +{row.netProfit.toLocaleString("fa-IR")} سود
                            </span>
                          ) : (
                            <span className="text-rose-600">
                              -{row.totalCost.toLocaleString("fa-IR")} هزینه
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{row.sourceLabel}</div>
                          {row.staffName !== "—" && (
                            <div className="text-[11px] text-muted-foreground">
                              پرسنل: {row.staffName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatJalaliNumeric(new Date(row.createdAt))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          <TablePaginationBar
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            disabled={isPending}
            onPageChange={(nextPage) =>
              updateUrlParams({ page: String(nextPage) })
            }
            onPageSizeChange={(nextSize) =>
              updateUrlParams({ pageSize: String(nextSize), page: "1" })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
