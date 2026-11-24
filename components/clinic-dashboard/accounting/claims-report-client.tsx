// components/clinic-dashboard/accounting/claims-report-client.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  formatToman,
} from "./accounting-shared";

export interface ClaimRow {
  id: string;
  clientId: string;
  invoiceNumber: number | null;
  createdAtIso: string;
  nextDueDateIso: string | null;
  clientName: string;
  clientPhone: string;
  fileNumber: number | null;
  nationalId: string;
  serviceTitles: string;
  therapistName: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentsCount: number;
}

export function ClaimsReportClient({ rows }: { rows: ClaimRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "INSTALLMENT" && r.status !== "INSTALLMENT") return false;
      if (statusFilter === "DEBT" && r.status === "INSTALLMENT") return false;
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
      if (q) {
        const hay = `${r.clientName} ${r.clientPhone} ${r.nationalId} ${r.fileNumber ?? ""} ${r.serviceTitles}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, fromDate, toDate]);

  const totalClaims = useMemo(
    () => filtered.reduce((sum, r) => sum + r.remainingAmount, 0),
    [filtered]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">مطالبات</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          لیست کامل پرونده‌های دارای پرداخت در آینده یا اقساطی (نمایش تمام موارد با تاریخ و امکان فیلتر اختیاری)
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-2xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <Filter className="size-4 text-primary" />
            فیلتر مطالبات
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
              setFromDate(null);
              setToDate(null);
            }}
          >
            <RotateCcw className="ml-1 size-3.5" />
            نمایش همه
          </Button>
        </div>

        <FieldGroup>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel className="text-xs">جستجوی مراجع / پرونده / خدمت</FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pr-9"
                  placeholder="نام، موبایل، شماره پرونده..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </Field>
            <Field>
              <FieldLabel className="text-xs">نوع بدهی</FieldLabel>
              <Select
                value={statusFilter}
                items={[
                  { value: "ALL", label: "همه مطالبات" },
                  { value: "DEBT", label: "پرداخت در آینده (بدهکار)" },
                  { value: "INSTALLMENT", label: "قسطی / چک" },
                ]}
                onValueChange={(v) => setStatusFilter(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه مطالبات</SelectItem>
                  <SelectItem value="DEBT">پرداخت در آینده (بدهکار)</SelectItem>
                  <SelectItem value="INSTALLMENT">قسطی / چک</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="text-xs">از تاریخ فاکتور</FieldLabel>
              <DatePicker calendarType="shamsi" value={fromDate} onValueChange={setFromDate} />
            </Field>
            <Field>
              <FieldLabel className="text-xs">تا تاریخ فاکتور</FieldLabel>
              <DatePicker calendarType="shamsi" value={toDate} onValueChange={setToDate} />
            </Field>
          </div>
        </FieldGroup>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AccountingStatCard
          title="مجموع کل مطالبات (مانده حساب‌ها)"
          amount={totalClaims}
          icon={<AlertCircle className="size-4" />}
          tone="rose"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="whitespace-nowrap bg-muted/50 text-xs">
              <TableHead className="text-right">ردیف</TableHead>
              <TableHead className="text-right">تاریخ فاکتور</TableHead>
              <TableHead className="text-right">موعد قسط بعدی</TableHead>
              <TableHead className="text-right">نام و نام خانوادگی</TableHead>
              <TableHead className="text-right">شماره تماس</TableHead>
              <TableHead className="text-right">شماره پرونده</TableHead>
              <TableHead className="text-right">خدمات</TableHead>
              <TableHead className="text-right">نوع تسویه</TableHead>
              <TableHead className="text-right">مبلغ کل</TableHead>
              <TableHead className="text-right">پرداخت‌شده</TableHead>
              <TableHead className="text-right">مانده مطالبه</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center text-sm text-muted-foreground">
                  موردی در مطالبات یافت نشد
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
                  <TableCell>{r.nextDueDateIso ? formatJalaliShort(r.nextDueDateIso) : "—"}</TableCell>
                  <TableCell className="font-semibold text-primary">{r.clientName}</TableCell>
                  <TableCell dir="ltr">{r.clientPhone}</TableCell>
                  <TableCell>{r.fileNumber ? r.fileNumber.toLocaleString("fa-IR") : "—"}</TableCell>
                  <TableCell>{r.serviceTitles}</TableCell>
                  <TableCell>
                    {r.status === "INSTALLMENT" ? (
                      <Badge variant="secondary">قسطی ({r.installmentsCount.toLocaleString("fa-IR")} قسط)</Badge>
                    ) : (
                      <Badge variant="outline">پرداخت در آینده</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatToman(r.totalAmount)}</TableCell>
                  <TableCell className="text-emerald-600">{formatToman(r.paidAmount)}</TableCell>
                  <TableCell className="font-bold text-rose-600">{formatToman(r.remainingAmount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}