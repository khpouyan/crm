// components/clinic-dashboard/accounting/services-report-client.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Percent,
  PlusCircle,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Filter,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export interface ServiceReportRow {
  id: string;
  clientId: string;
  performedAtIso: string;
  operatorName: string;
  clientName: string;
  clientPhone: string;
  fileNumber: number | null;
  nationalId: string;
  serviceId: string;
  serviceTitle: string;
  subServiceId: string;
  subServiceTitle: string;
  therapistId: string;
  therapistName: string;
  assistantNames: string;
  serviceAmount: number;
  discountAmount: number;
  extraChargeAmount: number;
  taxAmount: number;
  creditAmount: number;
  invoiceTotal: number;
  invoiceCreatedAtIso: string;
  paidAmount: number;
  paymentMethods: string[];
  paymentRef: string;
  remainingAmount: number;
  description: string;
  createdById: string;
}

interface SelectItemOption {
  value: string;
  label: string;
}

interface ServicesReportClientProps {
  rows: ServiceReportRow[];
  services: { id: string; title: string; subServices: { id: string; title: string }[] }[];
  therapists: SelectItemOption[];
  operators: SelectItemOption[];
  clients: SelectItemOption[];
}

export function AccountingServicesClient({
  rows,
  services,
  therapists,
  operators,
  clients,
}: ServicesReportClientProps) {
  const router = useRouter();

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [serviceId, setServiceId] = useState("ALL");
  const [subServiceId, setSubServiceId] = useState("ALL");
  const [therapistId, setTherapistId] = useState("ALL");
  const [clientId, setClientId] = useState("ALL");
  const [operatorId, setOperatorId] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");

  const [onlyDebt, setOnlyDebt] = useState(false);
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [onlyExtra, setOnlyExtra] = useState(false);
  const [onlyTax, setOnlyTax] = useState(false);

  const selectedServiceObj = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const dt = new Date(r.performedAtIso);
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (dt < start) return false;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (dt > end) return false;
      }
      if (serviceId !== "ALL" && r.serviceId !== serviceId) return false;
      if (subServiceId !== "ALL" && r.subServiceId !== subServiceId) return false;
      if (therapistId !== "ALL" && r.therapistId !== therapistId) return false;
      if (clientId !== "ALL" && r.clientId !== clientId) return false;
      if (operatorId !== "ALL" && r.createdById !== operatorId) return false;
      if (paymentMethod !== "ALL" && !r.paymentMethods.includes(paymentMethod))
        return false;
      if (onlyDebt && r.remainingAmount <= 0) return false;
      if (onlyDiscount && r.discountAmount <= 0) return false;
      if (onlyExtra && r.extraChargeAmount <= 0) return false;
      if (onlyTax && r.taxAmount <= 0) return false;
      return true;
    });
  }, [
    rows,
    fromDate,
    toDate,
    serviceId,
    subServiceId,
    therapistId,
    clientId,
    operatorId,
    paymentMethod,
    onlyDebt,
    onlyDiscount,
    onlyExtra,
    onlyTax,
  ]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.serviceSum += r.serviceAmount;
        acc.discountSum += r.discountAmount;
        acc.extraSum += r.extraChargeAmount;
        acc.taxSum += r.taxAmount;
        acc.creditSum += r.creditAmount;
        acc.remainingSum += r.remainingAmount;
        acc.paidSum += r.paidAmount;
        return acc;
      },
      {
        serviceSum: 0,
        discountSum: 0,
        extraSum: 0,
        taxSum: 0,
        creditSum: 0,
        remainingSum: 0,
        paidSum: 0,
      }
    );
  }, [filtered]);

  function resetFilters() {
    setFromDate(null);
    setToDate(null);
    setServiceId("ALL");
    setSubServiceId("ALL");
    setTherapistId("ALL");
    setClientId("ALL");
    setOperatorId("ALL");
    setPaymentMethod("ALL");
    setOnlyDebt(false);
    setOnlyDiscount(false);
    setOnlyExtra(false);
    setOnlyTax(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">خدمات</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          گزارش جامع مبلغ کل خدمات ارائه‌شده (حتی در صورت پرداخت قسطی) — با کلیک روی هر ردیف وارد پرونده مراجع می‌شوید
        </p>
      </div>

      {/* فیلترها */}
      <div className="rounded-xl border bg-card p-4 shadow-2xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <Filter className="size-4 text-primary" />
            فیلترها
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="ml-1 size-3.5" />
            پاک کردن فیلترها
          </Button>
        </div>

        <FieldGroup>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel className="text-xs">از تاریخ</FieldLabel>
              <DatePicker calendarType="shamsi" value={fromDate} onValueChange={setFromDate} />
            </Field>
            <Field>
              <FieldLabel className="text-xs">تا تاریخ</FieldLabel>
              <DatePicker calendarType="shamsi" value={toDate} onValueChange={setToDate} />
            </Field>
            <Field>
              <FieldLabel className="text-xs">خدمات</FieldLabel>
              <Select
                value={serviceId}
                items={[{ value: "ALL", label: "همه خدمات" }, ...services.map((s) => ({ value: s.id, label: s.title }))]}
                onValueChange={(v) => {
                  setServiceId(v || "ALL");
                  setSubServiceId("ALL");
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه خدمات</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="text-xs">ریز خدمات‌ها</FieldLabel>
              <Select
                value={subServiceId}
                disabled={serviceId === "ALL"}
                items={[
                  { value: "ALL", label: "همه ریز خدمات‌ها" },
                  ...(selectedServiceObj?.subServices.map((ss) => ({
                    value: ss.id,
                    label: ss.title,
                  })) || []),
                ]}
                onValueChange={(v) => setSubServiceId(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه ریز خدمات‌ها</SelectItem>
                  {selectedServiceObj?.subServices.map((ss) => (
                    <SelectItem key={ss.id} value={ss.id}>{ss.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel className="text-xs">درمانگر</FieldLabel>
              <Select
                value={therapistId}
                items={[{ value: "ALL", label: "همه درمانگران" }, ...therapists]}
                onValueChange={(v) => setTherapistId(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه درمانگران</SelectItem>
                  {therapists.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="text-xs">مراجعه‌کننده</FieldLabel>
              <Select
                value={clientId}
                items={[{ value: "ALL", label: "همه مراجعین" }, ...clients]}
                onValueChange={(v) => setClientId(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه مراجعین</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="text-xs">کاربر ثبت‌کننده</FieldLabel>
              <Select
                value={operatorId}
                items={[{ value: "ALL", label: "همه کاربران" }, ...operators]}
                onValueChange={(v) => setOperatorId(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه کاربران</SelectItem>
                  {operators.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="text-xs">روش پرداخت</FieldLabel>
              <Select
                value={paymentMethod}
                items={[
                  { value: "ALL", label: "همه" },
                  { value: "POS", label: "کارت‌خوان" },
                  { value: "CARD_TO_CARD", label: "کارت به کارت" },
                  { value: "CASH", label: "نقدی" },
                  { value: "CREDIT", label: "اعتباری" },
                  { value: "WALLET", label: "کیف پول" },
                ]}
                onValueChange={(v) => setPaymentMethod(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه</SelectItem>
                  <SelectItem value="POS">کارت‌خوان</SelectItem>
                  <SelectItem value="CARD_TO_CARD">کارت به کارت</SelectItem>
                  <SelectItem value="CASH">نقدی</SelectItem>
                  <SelectItem value="CREDIT">اعتباری</SelectItem>
                  <SelectItem value="WALLET">کیف پول</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={onlyDebt} onCheckedChange={(v) => setOnlyDebt(Boolean(v))} />
              <span>دارای بدهی</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={onlyDiscount} onCheckedChange={(v) => setOnlyDiscount(Boolean(v))} />
              <span>دارای تخفیف</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={onlyExtra} onCheckedChange={(v) => setOnlyExtra(Boolean(v))} />
              <span>دارای اضافه پرداخت</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={onlyTax} onCheckedChange={(v) => setOnlyTax(Boolean(v))} />
              <span>دارای مالیات</span>
            </label>
          </div>
        </FieldGroup>
      </div>

      {/* کارت‌های جمع مبالغ (شامل باکس اعتباری) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AccountingStatCard title="جمع مبلغ سرویس" amount={totals.serviceSum} icon={<DollarSign className="size-4" />} tone="blue" />
        <AccountingStatCard title="جمع مبلغ تخفیف" amount={totals.discountSum} icon={<Percent className="size-4" />} tone="emerald" />
        <AccountingStatCard title="جمع مبلغ اضافه پرداخت" amount={totals.extraSum} icon={<PlusCircle className="size-4" />} tone="purple" />
        <AccountingStatCard title="جمع مبلغ مالیات" amount={totals.taxSum} icon={<Receipt className="size-4" />} tone="amber" />
        <AccountingStatCard title="جمع اعتباری" amount={totals.creditSum} icon={<Sparkles className="size-4" />} tone="blue" />
        <AccountingStatCard title="جمع مبلغ مانده حساب" amount={totals.remainingSum} icon={<AlertCircle className="size-4" />} tone="rose" />
        <AccountingStatCard title="جمع مبلغ پرداختی" amount={totals.paidSum} icon={<CheckCircle2 className="size-4" />} tone="emerald" />
      </div>

      <div className="text-xs text-muted-foreground">
        تعداد رکوردها: <strong>{filtered.length.toLocaleString("fa-IR")}</strong>
      </div>

      {/* جدول کامل ۲۲ ستونه */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="whitespace-nowrap bg-muted/50 text-xs">
              <TableHead className="text-right">ردیف</TableHead>
              <TableHead className="text-right">تاریخ</TableHead>
              <TableHead className="text-right">ساعت</TableHead>
              <TableHead className="text-right">کاربر سیستم</TableHead>
              <TableHead className="text-right">نام و نام خانوادگی مراجعه کننده</TableHead>
              <TableHead className="text-right">شماره تماس</TableHead>
              <TableHead className="text-right">شماره پرونده</TableHead>
              <TableHead className="text-right">کد ملی</TableHead>
              <TableHead className="text-right">خدمات</TableHead>
              <TableHead className="text-right">ریز خدمات</TableHead>
              <TableHead className="text-right">درمانگر</TableHead>
              <TableHead className="text-right">دستیار درمان</TableHead>
              <TableHead className="text-right">مبلغ سرویس</TableHead>
              <TableHead className="text-right">تخفیف</TableHead>
              <TableHead className="text-right">اضافه پرداخت</TableHead>
              <TableHead className="text-right">مالیات</TableHead>
              <TableHead className="text-right">مبلغ فاکتور</TableHead>
              <TableHead className="text-right">تاریخ فاکتور</TableHead>
              <TableHead className="text-right">مبلغ پرداختی</TableHead>
              <TableHead className="text-right">سند پرداختی</TableHead>
              <TableHead className="text-right">مانده حساب</TableHead>
              <TableHead className="text-right">توضیحات سرویس</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={22} className="py-12 text-center text-sm text-muted-foreground">
                  داده‌ای وجود ندارد
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, idx) => (
                <TableRow
                  key={row.id}
                  onClick={() => router.push(`/clinic-dashboard/clients/${row.clientId}`)}
                  className="cursor-pointer whitespace-nowrap text-xs hover:bg-primary/5"
                >
                  <TableCell>{(idx + 1).toLocaleString("fa-IR")}</TableCell>
                  <TableCell>{formatJalaliShort(row.performedAtIso)}</TableCell>
                  <TableCell>{formatTimeShort(row.performedAtIso)}</TableCell>
                  <TableCell>{row.operatorName}</TableCell>
                  <TableCell className="font-semibold text-primary">{row.clientName}</TableCell>
                  <TableCell dir="ltr">{row.clientPhone}</TableCell>
                  <TableCell>{row.fileNumber ? row.fileNumber.toLocaleString("fa-IR") : "—"}</TableCell>
                  <TableCell dir="ltr">{row.nationalId}</TableCell>
                  <TableCell>{row.serviceTitle}</TableCell>
                  <TableCell>{row.subServiceTitle}</TableCell>
                  <TableCell>{row.therapistName}</TableCell>
                  <TableCell>{row.assistantNames}</TableCell>
                  <TableCell className="font-bold">{formatToman(row.serviceAmount)}</TableCell>
                  <TableCell>{formatToman(row.discountAmount)}</TableCell>
                  <TableCell>{formatToman(row.extraChargeAmount)}</TableCell>
                  <TableCell>{formatToman(row.taxAmount)}</TableCell>
                  <TableCell className="font-bold">{formatToman(row.invoiceTotal)}</TableCell>
                  <TableCell>{formatJalaliShort(row.invoiceCreatedAtIso)}</TableCell>
                  <TableCell className="text-emerald-600">{formatToman(row.paidAmount)}</TableCell>
                  <TableCell dir="ltr">{row.paymentRef}</TableCell>
                  <TableCell className={row.remainingAmount > 0 ? "font-bold text-rose-600" : ""}>
                    {formatToman(row.remainingAmount)}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{row.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
