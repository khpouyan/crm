// components/clinic-dashboard/inventory-low-stock-client.tsx
"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowDownLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePaginationBar } from "./table-pagination-bar";
import { TableRowsSkeleton } from "./inventory-skeletons";

interface InventoryLowStockClientProps {
  items: {
    id: string;
    name: string;
    code: string | null;
    unit: string;
    alertThreshold: number;
    totalStock: number;
  }[];
  totalCount: number;
  page: number;
  pageSize: number;
  canManage: boolean;
}

export function InventoryLowStockClient({
  items,
  totalCount,
  page,
  pageSize,
  canManage,
}: InventoryLowStockClientProps) {
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
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          کالاهای تمام‌شده و نزدیک به اتمام
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          اقلامی که موجودی آن‌ها به صفر رسیده یا کمتر از نقطه هشدار تعریف‌شده است
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            فهرست اقلام نیازمند شارژ مجدد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            {isPending ? (
              <TableRowsSkeleton rows={pageSize > 10 ? 8 : pageSize} cols={5} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right">نام کالا</TableHead>
                    <TableHead className="text-right">موجودی فعلی</TableHead>
                    <TableHead className="text-right">نقطه هشدار</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    {canManage && (
                      <TableHead className="w-32 text-left">اقدام</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        هیچ کالای تمام‌شده یا رو به اتمامی وجود ندارد.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="tabular-nums font-bold">
                          {item.totalStock.toLocaleString("fa-IR")}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {item.alertThreshold.toLocaleString("fa-IR")}{" "}
                          {item.unit}
                        </TableCell>
                        <TableCell>
                          {item.totalStock === 0 ? (
                            <Badge variant="destructive">اتمام موجودی</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-500 text-amber-600"
                            >
                              نزدیک به اتمام
                            </Badge>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-left">
                            <Button
                              variant="outline"
                              nativeButton={false}
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              render={
                                <Link href="/clinic-dashboard/inventory/stock-in">
                                  <ArrowDownLeft className="size-3.5" />
                                  ثبت ورود
                                </Link>
                              }
                            />
                          </TableCell>
                        )}
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
