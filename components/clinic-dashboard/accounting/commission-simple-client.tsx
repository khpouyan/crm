// components/clinic-dashboard/accounting/commission-simple-client.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calculator, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import {
  AccountingStatCard,
  CollapsibleFilterPanel,
  QuickDateRangeBar,
  formatJalaliShort,
  formatToman,
  getTodayDate,
} from "./accounting-shared";

export interface CommissionSourceItem {
  id: string;
  clientId: string;
  performedAtIso: string;
  clientName: string;
  serviceId: string;
  serviceTitle: string;
  therapistId: string;
  referrerId: string;
  personName: string;
  finalPrice: number;
  purchaseCost: number;
  sellCost: number;
}

interface SelectOption {
  value: string;
  label: string;
}

export function CommissionSimpleClient({
  services,
  staffOptions,
  items,
}: {
  services: SelectOption[];
  staffOptions: SelectOption[];
  items: CommissionSourceItem[];
}) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState<Date | null>(() => getTodayDate());
  const [toDate, setToDate] = useState<Date | null>(() => getTodayDate());
  const [percentInput, setPercentInput] = useState("");
  const [serviceId, setServiceId] = useState("ALL");
  const [personId, setPersonId] = useState("ALL");
  const [deductMode, setDeductMode] = useState<"NONE" | "PURCHASE" | "SELL">(
    "NONE"
  );
  const [calculated, setCalculated] = useState(false);

  const parsedPercent = useMemo(() => {
    const clean = normalizePersianDigits(percentInput).replace(/[^\d.]/g, "");
    const num = parseFloat(clean);
    return Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : null;
  }, [percentInput]);

  const rows = useMemo(() => {
    return items
      .filter((item) => {
        const dt = new Date(item.performedAtIso);
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
        if (serviceId !== "ALL" && item.serviceId !== serviceId) return false;
        if (
          personId !== "ALL" &&
          item.therapistId !== personId &&
          item.referrerId !== personId
        ) {
          return false;
        }
        return true;
      })
      .map((item) => {
        const deducted =
          deductMode === "PURCHASE"
            ? item.purchaseCost
            : deductMode === "SELL"
              ? item.sellCost
              : 0;
        const base = Math.max(0, item.finalPrice - deducted);
        const pct = parsedPercent ?? 0;
        const commissionAmount = Math.round((base * pct) / 100);
        return {
          ...item,
          base,
          commissionAmount,
        };
      });
  }, [items, fromDate, toDate, serviceId, personId, deductMode, parsedPercent]);

  const totalCommission = useMemo(
    () => rows.reduce((sum, r) => sum + r.commissionAmount, 0),
    [rows]
  );

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    if (parsedPercent === null) {
      toast.error("درصد کمیسیون الزامی است.");
      return;
    }
    setCalculated(true);
  }

  function resetFiltersToToday() {
    const today = getTodayDate();
    setFromDate(today);
    setToDate(today);
    setPercentInput("");
    setServiceId("ALL");
    setPersonId("ALL");
    setDeductMode("NONE");
    setCalculated(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">محاسبه کمیسیون</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            محاسبه ساده کمیسیون بر اساس بازه تاریخ، درصد، خدمت، پرسنل/معرف و کسر قیمت کالا
          </p>
        </div>
        <QuickDateRangeBar
          onSelectRange={(f, t) => {
            setFromDate(f);
            setToDate(t);
          }}
        />
      </div>

      <CollapsibleFilterPanel
        resetLabel="بازنشانی به امروز"
        onReset={resetFiltersToToday}
      >
        <form onSubmit={handleCalculate} className="space-y-4">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel className="text-xs">از تاریخ *</FieldLabel>
                <DatePicker
                  calendarType="shamsi"
                  value={fromDate}
                  onValueChange={setFromDate}
                />
              </Field>
              <Field>
                <FieldLabel className="text-xs">تا تاریخ *</FieldLabel>
                <DatePicker
                  calendarType="shamsi"
                  value={toDate}
                  onValueChange={setToDate}
                />
              </Field>
              <Field>
                <FieldLabel className="text-xs">درصد کمیسیون *</FieldLabel>
                <Input
                  dir="ltr"
                  placeholder="مثال: 15.5"
                  value={percentInput}
                  onChange={(e) => setPercentInput(e.target.value)}
                />
                {calculated && parsedPercent === null && (
                  <span className="text-[11px] text-destructive">
                    درصد کمیسیون الزامی است
                  </span>
                )}
              </Field>
              <Field>
                <FieldLabel className="text-xs">خدمات</FieldLabel>
                <Select
                  value={serviceId}
                  items={[{ value: "ALL", label: "همه خدمات" }, ...services]}
                  onValueChange={(v) => setServiceId(v || "ALL")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">همه خدمات</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel className="text-xs">پرسنل / معرف</FieldLabel>
                <Select
                  value={personId}
                  items={[{ value: "ALL", label: "همه" }, ...staffOptions]}
                  onValueChange={(v) => setPersonId(v || "ALL")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">همه</SelectItem>
                    {staffOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel className="text-xs">کسر قیمت</FieldLabel>
                <RadioGroup
                  value={deductMode}
                  onValueChange={(v) =>
                    setDeductMode((v as "NONE" | "PURCHASE" | "SELL") || "NONE")
                  }
                  className="flex flex-wrap gap-4 pt-1"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="NONE" id="ded-none" />
                    <Label htmlFor="ded-none" className="cursor-pointer text-xs">
                      هیچکدام
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="PURCHASE" id="ded-pur" />
                    <Label htmlFor="ded-pur" className="cursor-pointer text-xs">
                      کسر قیمت خرید محصول
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="SELL" id="ded-sell" />
                    <Label htmlFor="ded-sell" className="cursor-pointer text-xs">
                      کسر قیمت فروش محصول
                    </Label>
                  </div>
                </RadioGroup>
              </Field>
            </div>
          </FieldGroup>

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit">
              <Calculator className="ml-1.5 size-4" />
              محاسبه کمیسیون
            </Button>
            <Button type="button" variant="outline" onClick={resetFiltersToToday}>
              <RotateCcw className="ml-1.5 size-4" />
              بازنشانی امروز
            </Button>
          </div>
        </form>
      </CollapsibleFilterPanel>

      {calculated && parsedPercent !== null && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <AccountingStatCard
              title={`جمع کمیسیون (${parsedPercent.toLocaleString("fa-IR")}٪)`}
              amount={totalCommission}
              icon={<Calculator className="size-4" />}
              tone="emerald"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="whitespace-nowrap bg-muted/50 text-xs">
                  <TableHead className="text-right">ردیف</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">مراجعه‌کننده</TableHead>
                  <TableHead className="text-right">پرسنل / معرف</TableHead>
                  <TableHead className="text-right">سرویس</TableHead>
                  <TableHead className="text-right">مبنای محاسبه (تومان)</TableHead>
                  <TableHead className="text-right">کمیسیون (تومان)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      موردی یافت نشد
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => (
                    <TableRow
                      key={r.id}
                      onClick={() =>
                        router.push(`/clinic-dashboard/clients/${r.clientId}`)
                      }
                      className="cursor-pointer whitespace-nowrap text-xs hover:bg-primary/5"
                    >
                      <TableCell>{(idx + 1).toLocaleString("fa-IR")}</TableCell>
                      <TableCell>{formatJalaliShort(r.performedAtIso)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {r.clientName}
                      </TableCell>
                      <TableCell>{r.personName}</TableCell>
                      <TableCell>{r.serviceTitle}</TableCell>
                      <TableCell>{formatToman(r.base)}</TableCell>
                      <TableCell className="font-bold text-emerald-600">
                        {formatToman(r.commissionAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
