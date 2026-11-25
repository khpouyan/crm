// components/clinic-dashboard/(dashboard)/accounting/wallet-report-client.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AccountingStatCard,
  formatJalaliShort,
  formatTimeShort,
  formatToman,
} from "./accounting-shared";

export interface WalletReportRow {
  id: string;
  clientId: string;
  createdAtIso: string;
  clientName: string;
  type: string;
  paymentMethod: string;
  amount: number;
  description: string;
}

const METHOD_LABELS: Record<string, string> = {
  POS: "کارت‌خوان",
  CARD_TO_CARD: "کارت به کارت",
  CASH: "نقدی",
  DEPOSIT: "بیعانه سرویس",
  INVOICE_PAYMENT: "پرداخت سرویس",
  WALLET_REFUND: "استرداد",
  INVOICE_CANCEL: "لغو فاکتور",
};

export function AccountingWalletClient({ rows }: { rows: WalletReportRow[] }) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      const dt = new Date(r.createdAtIso);
      if (fromDate) {
        const s = new Date(fromDate);
        s.setHours(0, 0, 0, 0);
        if (dt < s) return false;
      }
      if (toDate) {
        const e = new Date(toDate);
        e.setHours(23, 59, 59, 999);
        if (dt > e) return false;
      }
      return true;
    });
  }, [rows, fromDate, toDate, typeFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        if (r.type === "DEPOSIT") acc.deposits += r.amount;
        else acc.withdraws += r.amount;
        return acc;
      },
      { deposits: 0, withdraws: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">کیف پول</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          کل تراکنش‌های واریز، برداشت و بیعانه کیف پول مراجعین — کلیک روی هر سطر پرونده مراجع را باز می‌کند
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-2xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <Filter className="size-4 text-primary" />
            فیلترها
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFromDate(null);
              setToDate(null);
              setTypeFilter("ALL");
            }}
          >
            <RotateCcw className="ml-1 size-3.5" />
            پاک کردن فیلترها
          </Button>
        </div>

        <FieldGroup>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel className="text-xs">از تاریخ</FieldLabel>
              <DatePicker calendarType="shamsi" value={fromDate} onValueChange={setFromDate} />
            </Field>
            <Field>
              <FieldLabel className="text-xs">تا تاریخ</FieldLabel>
              <DatePicker calendarType="shamsi" value={toDate} onValueChange={setToDate} />
            </Field>
            <Field>
              <FieldLabel className="text-xs">نوع تراکنش</FieldLabel>
              <Select
                value={typeFilter}
                items={[
                  { value: "ALL", label: "همه" },
                  { value: "DEPOSIT", label: "واریزی" },
                  { value: "WITHDRAW", label: "برداشت" },
                  { value: "REFUND", label: "استرداد" },
                ]}
                onValueChange={(v) => setTypeFilter(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه</SelectItem>
                  <SelectItem value="DEPOSIT">واریزی</SelectItem>
                  <SelectItem value="WITHDRAW">برداشت</SelectItem>
                  <SelectItem value="REFUND">استرداد</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FieldGroup>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AccountingStatCard title="جمع واریزی‌ها" amount={totals.deposits} icon={<Wallet className="size-4" />} tone="emerald" />
        <AccountingStatCard title="جمع برداشت‌ها" amount={totals.withdraws} icon={<Wallet className="size-4" />} tone="rose" />
      </div>

      <div className="text-xs text-muted-foreground">
        تعداد رکوردها: <strong>{filtered.length.toLocaleString("fa-IR")}</strong>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="whitespace-nowrap bg-muted/50 text-xs">
              <TableHead className="text-right">ردیف</TableHead>
              <TableHead className="text-right">تاریخ</TableHead>
              <TableHead className="text-right">ساعت</TableHead>
              <TableHead className="text-right">شرح</TableHead>
              <TableHead className="text-right">مراجعه‌کننده</TableHead>
              <TableHead className="text-right">نوع تراکنش</TableHead>
              <TableHead className="text-right">مبلغ (تومان)</TableHead>
              <TableHead className="text-right">توضیحات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  داده‌ای وجود ندارد
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r, idx) => (
                <TableRow
                  key={r.id}
                  onClick={() => router.push(`/clinic-dashboard/clients/${r.clientId}`)}
                  className="cursor-pointer whitespace-nowrap text-xs hover:bg-primary/5"
                >
                  <TableCell>{(idx + 1).toLocaleString("fa-IR")}</TableCell>
                  <TableCell>{formatJalaliShort(r.createdAtIso)}</TableCell>
                  <TableCell>{formatTimeShort(r.createdAtIso)}</TableCell>
                  <TableCell>{METHOD_LABELS[r.paymentMethod] || r.paymentMethod}</TableCell>
                  <TableCell className="font-semibold text-primary">{r.clientName}</TableCell>
                  <TableCell>
                    {r.type === "DEPOSIT" ? (
                      <span className="font-bold text-emerald-600">واریزی</span>
                    ) : (
                      <span className="font-bold text-rose-600">برداشت</span>
                    )}
                  </TableCell>
                  <TableCell className="font-bold">{formatToman(r.amount)}</TableCell>
                  <TableCell className="max-w-64 truncate">{r.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}