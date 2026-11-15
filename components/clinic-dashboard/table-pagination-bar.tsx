// components/clinic-dashboard/table-pagination-bar.tsx
"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100, 200] as const;

interface TablePaginationBarProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
  disabled?: boolean;
}

export function TablePaginationBar({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: TablePaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(totalCount, page * pageSize);

  const pageSizeItems = useMemo(
    () =>
      ALLOWED_PAGE_SIZES.map((size) => ({
        value: String(size),
        label: `${size.toLocaleString("fa-IR")} ردیف`,
      })),
    []
  );

  return (
    <div
      className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
      dir="rtl"
    >
      {/* سمت راست: انتخاب تعداد نمایش در هر صفحه + آمار */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>تعداد نمایش:</span>
          <Select
            items={pageSizeItems}
            value={String(pageSize)}
            disabled={disabled}
            onValueChange={(val) => {
              if (val) onPageSizeChange(Number(val));
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span>
          نمایش{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {startItem.toLocaleString("fa-IR")}
          </strong>{" "}
          تا{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {endItem.toLocaleString("fa-IR")}
          </strong>{" "}
          از{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {totalCount.toLocaleString("fa-IR")}
          </strong>{" "}
          مورد
        </span>
      </div>

      {/* سمت چپ: دکمه‌های جابه‌جایی بین صفحات */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 gap-1 px-2.5 text-xs"
        >
          <ChevronRight className="size-3.5" />
          قبلی
        </Button>

        <span className="px-2 text-xs font-medium tabular-nums">
          صفحه {page.toLocaleString("fa-IR")} از{" "}
          {totalPages.toLocaleString("fa-IR")}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 gap-1 px-2.5 text-xs"
        >
          بعدی
          <ChevronLeft className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
