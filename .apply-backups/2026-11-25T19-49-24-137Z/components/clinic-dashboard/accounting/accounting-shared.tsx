// components/clinic-dashboard/accounting/accounting-shared.tsx
"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/persian-date";
import { cn } from "@/lib/utils";

export function formatJalaliShort(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return toPersianDigits(formatJalali(d));
}

export function formatTimeShort(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return toPersianDigits(`${hh}:${mm}`);
}

export function formatToman(amount: number): string {
  return Math.round(amount || 0).toLocaleString("fa-IR");
}

export function getTodayDate(): Date {
  return new Date();
}

interface StatCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  tone?: "blue" | "emerald" | "amber" | "rose" | "purple" | "slate";
  breakdownItems?: Array<{
    label: string;
    amount: number;
  }>;
}

const TONE_STYLES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  blue: "border-sky-500/25 bg-sky-500/5 text-sky-700 dark:text-sky-300",
  emerald:
    "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  amber:
    "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  rose: "border-rose-500/25 bg-rose-500/5 text-rose-700 dark:text-rose-300",
  purple:
    "border-purple-500/25 bg-purple-500/5 text-purple-700 dark:text-purple-300",
  slate: "border-border bg-card text-foreground",
};

export function AccountingStatCard({
  title,
  amount,
  icon,
  tone = "slate",
  breakdownItems,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-2.5 rounded-xl border p-3 shadow-2xs sm:px-4 sm:py-3",
        TONE_STYLES[tone]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium opacity-85 sm:text-xs">
            {title}
          </div>
          <div className="mt-1 text-sm font-black tabular-nums sm:text-base">
            {formatToman(amount)}{" "}
            <span className="text-[10px] font-normal opacity-75 sm:text-[11px]">
              تومان
            </span>
          </div>
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-2xs sm:size-9">
          {icon}
        </div>
      </div>

      {breakdownItems && breakdownItems.length > 0 && (
        <div className="space-y-1 border-t border-current/15 pt-2 text-[11px]">
          {breakdownItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1"
            >
              <span className="truncate font-medium text-foreground/90">
                {item.label}
              </span>
              <span className="shrink-0 font-bold tabular-nums">
                {formatToman(item.amount)} تومان
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CollapsibleFilterPanelProps {
  onReset: () => void;
  resetLabel?: string;
  children: React.ReactNode;
}

export function CollapsibleFilterPanel({
  onReset,
  resetLabel = "پاک کردن فیلترها",
  children,
}: CollapsibleFilterPanelProps) {
  const [isOpen, setIsOpen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 768;
  });

  return (
    <div className="rounded-xl border bg-card shadow-2xs">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 select-none"
      >
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Filter className="size-4 text-primary" />
          <span>فیلترها</span>
          <span className="text-[11px] font-normal text-muted-foreground md:hidden">
            ({isOpen ? "بستن" : "برای باز شدن کلیک کنید"})
          </span>
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            {resetLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? "بستن فیلترها" : "باز کردن فیلترها"}
          >
            {isOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {isOpen && <div className="border-t p-4">{children}</div>}
    </div>
  );
}
