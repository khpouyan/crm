// components/clinic-dashboard/inventory-skeletons.tsx
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TableRowsSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-2.5 p-4">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-3">
          {Array.from({ length: cols }).map((__, cIdx) => (
            <Skeleton key={cIdx} className="h-8 flex-1 rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function InventoryTablePageSkeleton({
  showFilter = false,
  showStats = false,
}: {
  showFilter?: boolean;
  showStats?: boolean;
}) {
  return (
    <div className="space-y-5" dir="rtl">
      {/* هدر */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* کارت‌های آماری فشرده (برای صفحه گزارش فروش) */}
      {showStats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-6 w-36" />
                </div>
                <Skeleton className="size-9 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* نوار فیلتر */}
      {showFilter && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* جدول */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <TableRowsSkeleton rows={7} cols={5} />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-8 w-36" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
