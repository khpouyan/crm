// components/clinic-dashboard/accounting/accounting-shared.tsx
"use client";

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

interface StatCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  tone?: "blue" | "emerald" | "amber" | "rose" | "purple" | "slate";
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
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-2xs",
        TONE_STYLES[tone]
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-xs opacity-80">{title}</div>
        <div className="mt-1 text-base font-black tabular-nums">
          {formatToman(amount)}{" "}
          <span className="text-[11px] font-normal opacity-75">تومان</span>
        </div>
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-2xs">
        {icon}
      </div>
    </div>
  );
}