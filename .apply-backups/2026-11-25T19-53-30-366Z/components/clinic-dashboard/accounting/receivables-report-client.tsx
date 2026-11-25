// components/clinic-dashboard/accounting/receivables-report-client.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Wallet,
  FileCheck2,
  Calculator,
  ExternalLink,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createAccountingDescriptionAction } from "@/app/clinic-dashboard/(dashboard)/accounting/actions";
import {
  AccountingStatCard,
  CollapsibleFilterPanel,
  QuickDateRangeBar,
  formatJalaliShort,
  formatTimeShort,
  formatToman,
  getTodayDate,
} from "./accounting-shared";

export interface ReceivableRow {
  id: string;
  clientId: string;
  txDateIso: string;
  operatorName: string;
  clientName: string;
  nationalId: string;
  descriptionLabel: string;
  cardToCard: number;
  cardNamesText: string;
  pos: number;
  posNamesText: string;
  cash: number;
  credit: number;
  walletWithdraw: number;
  walletDeposit: number;
  checkSum: number;
  receivedSum: number;
  grandSum: number;
  posBreakdowns: Array<{
    terminalId: string;
    terminalName: string;
    amount: number;
  }>;
  cardBreakdowns: Array<{
    cardKey: string;
    cardLabel: string;
    amount: number;
  }>;
  serviceId: string;
  serviceTitle: string;
  therapistId: string;
  therapistName: string;
  notes: string;
  createdById: string;
  paymentMethods: string[];
}

interface SelectOption {
  value: string;
  label: string;
}

export function ReceivablesReportClient({
  rows,
  terminals,
  bankAccounts,
  services,
  therapists,
  operators,
  clients,
  descriptions: initialDescriptions,
}: {
  rows: ReceivableRow[];
  terminals: Array<{ id: string; name: string }>;
  bankAccounts: Array<{
    id: string;
    bankName: string;
    cardNumber: string | null;
  }>;
  services: SelectOption[];
  therapists: SelectOption[];
  operators: SelectOption[];
  clients: SelectOption[];
  descriptions: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState<Date | null>(() => getTodayDate());
  const [toDate, setToDate] = useState<Date | null>(() => getTodayDate());
  const [serviceId, setServiceId] = useState("ALL");
  const [therapistId, setTherapistId] = useState("ALL");
  const [clientId, setClientId] = useState("ALL");
  const [operatorId, setOperatorId] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [newDescText, setNewDescText] = useState("");
  const [descriptions, setDescriptions] = useState(initialDescriptions);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const dt = new Date(r.txDateIso);
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
      if (serviceId !== "ALL" && r.serviceId !== serviceId) return false;
      if (therapistId !== "ALL" && r.therapistId !== therapistId) return false;
      if (clientId !== "ALL" && r.clientId !== clientId) return false;
      if (operatorId !== "ALL" && r.createdById !== operatorId) return false;
      if (paymentMethod !== "ALL" && !r.paymentMethods.includes(paymentMethod))
        return false;
      return true;
    });
  }, [
    rows,
    fromDate,
    toDate,
    serviceId,
    therapistId,
    clientId,
    operatorId,
    paymentMethod,
  ]);

  const totals = useMemo(() => {
    const posByTerminal = new Map<string, { label: string; amount: number }>();
    for (const t of terminals) {
      posByTerminal.set(t.id, { label: t.name, amount: 0 });
    }

    const cardByAccount = new Map<string, { label: string; amount: number }>();
    for (const b of bankAccounts) {
      const cleanDigits = (b.cardNumber || "").replace(/\D/g, "");
      const last4 = cleanDigits ? cleanDigits.slice(-4) : "----";
      cardByAccount.set(b.id, {
        label: `${b.bankName} (•••• ${last4})`,
        amount: 0,
      });
    }

    const base = filtered.reduce(
      (acc, r) => {
        acc.cash += r.cash;
        acc.pos += r.pos;
        acc.cardToCard += r.cardToCard;
        acc.credit += r.credit;
        acc.walletWithdraw += r.walletWithdraw;
        acc.walletDeposit += r.walletDeposit;
        acc.checkSum += r.checkSum;
        acc.receivedSum += r.receivedSum;
        acc.grandSum += r.grandSum;

        for (const pb of r.posBreakdowns) {
          const cur = posByTerminal.get(pb.terminalId) || {
            label: pb.terminalName,
            amount: 0,
          };
          cur.amount += pb.amount;
          posByTerminal.set(pb.terminalId, cur);
        }

        for (const cb of r.cardBreakdowns) {
          const cur = cardByAccount.get(cb.cardKey) || {
            label: cb.cardLabel,
            amount: 0,
          };
          cur.amount += cb.amount;
          cardByAccount.set(cb.cardKey, cur);
        }

        return acc;
      },
      {
        cash: 0,
        pos: 0,
        cardToCard: 0,
        credit: 0,
        walletWithdraw: 0,
        walletDeposit: 0,
        checkSum: 0,
        receivedSum: 0,
        grandSum: 0,
      }
    );

    return {
      ...base,
      posBreakdownItems: Array.from(posByTerminal.values()),
      cardBreakdownItems: Array.from(cardByAccount.values()),
    };
  }, [filtered, terminals, bankAccounts]);

  async function handleAddDescription() {
    if (!newDescText.trim()) return;
    const res = await createAccountingDescriptionAction({
      scope: "RECEIVE",
      title: newDescText.trim(),
    });
    if (!res.success) {
      toast.error(res.error || "خطا در افزودن شرح");
      return;
    }
    setDescriptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: newDescText.trim() },
    ]);
    setNewDescText("");
    toast.success("شرح دریافتی اضافه شد.");
  }

  function resetFiltersToToday() {
    const today = getTodayDate();
    setFromDate(today);
    setToDate(today);
    setServiceId("ALL");
    setTherapistId("ALL");
    setClientId("ALL");
    setOperatorId("ALL");
    setPaymentMethod("ALL");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">دریافتی</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            جزئیات مبالغ دریافتی به تفکیک روش پرداخت — کلیک روی هر سطر پرونده مراجع را باز می‌کند
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
        <FieldGroup>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field>
              <FieldLabel className="text-xs">از تاریخ</FieldLabel>
              <DatePicker
                calendarType="shamsi"
                value={fromDate}
                onValueChange={setFromDate}
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs">تا تاریخ</FieldLabel>
              <DatePicker
                calendarType="shamsi"
                value={toDate}
                onValueChange={setToDate}
              />
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
            <Field>
              <FieldLabel className="text-xs">درمانگر</FieldLabel>
              <Select
                value={therapistId}
                items={[{ value: "ALL", label: "همه درمانگران" }, ...therapists]}
                onValueChange={(v) => setTherapistId(v || "ALL")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه درمانگران</SelectItem>
                  {therapists.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه مراجعین</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel className="text-xs">شرح (افزودن مورد جدید)</FieldLabel>
              <div className="flex gap-1.5">
                <Input
                  placeholder="افزودن شرح جدید..."
                  value={newDescText}
                  onChange={(e) => setNewDescText(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddDescription}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              {descriptions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  {descriptions.map((d) => (
                    <span key={d.id} className="rounded bg-muted px-2 py-0.5">
                      {d.title}
                    </span>
                  ))}
                </div>
              )}
            </Field>
            <Field>
              <FieldLabel className="text-xs">کاربر ثبت‌کننده</FieldLabel>
              <Select
                value={operatorId}
                items={[{ value: "ALL", label: "همه کاربران" }, ...operators]}
                onValueChange={(v) => setOperatorId(v || "ALL")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه کاربران</SelectItem>
                  {operators.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
        </FieldGroup>
      </CollapsibleFilterPanel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AccountingStatCard
          title="نقدی"
          amount={totals.cash}
          icon={<Banknote className="size-4" />}
          tone="emerald"
        />
        <AccountingStatCard
          title="کارت‌خوان"
          amount={totals.pos}
          icon={<CreditCard className="size-4" />}
          tone="blue"
          breakdownItems={totals.posBreakdownItems}
        />
        <AccountingStatCard
          title="کارت به کارت"
          amount={totals.cardToCard}
          icon={<ArrowLeftRight className="size-4" />}
          tone="purple"
          breakdownItems={totals.cardBreakdownItems}
        />
        <AccountingStatCard
          title="اعتباری"
          amount={totals.credit}
          icon={<Sparkles className="size-4" />}
          tone="blue"
        />
        <AccountingStatCard
          title="برداشت از کیف پول"
          amount={totals.walletWithdraw}
          icon={<Wallet className="size-4" />}
          tone="amber"
        />
        <AccountingStatCard
          title="واریز به کیف پول (بیعانه)"
          amount={totals.walletDeposit}
          icon={<Wallet className="size-4" />}
          tone="purple"
        />
        <AccountingStatCard
          title="سند یا چک"
          amount={totals.checkSum}
          icon={<FileCheck2 className="size-4" />}
          tone="rose"
        />
        <AccountingStatCard
          title="جمع دریافتی"
          amount={totals.receivedSum}
          icon={<Calculator className="size-4" />}
          tone="amber"
        />
        <AccountingStatCard
          title="مجموع کل"
          amount={totals.grandSum}
          icon={<Calculator className="size-4" />}
          tone="slate"
        />
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
              <TableHead className="text-right">کاربر سیستم</TableHead>
              <TableHead className="text-right">مراجعه‌کننده</TableHead>
              <TableHead className="text-right">کد ملی</TableHead>
              <TableHead className="text-right">شرح</TableHead>
              <TableHead className="text-right">کارت به کارت</TableHead>
              <TableHead className="text-right">کارت دریافتی</TableHead>
              <TableHead className="text-right">کارت‌خوان</TableHead>
              <TableHead className="text-right">دستگاه کارت‌خوان</TableHead>
              <TableHead className="text-right">نقدی</TableHead>
              <TableHead className="text-right">اعتباری</TableHead>
              <TableHead className="text-right">برداشت از کیف پول</TableHead>
              <TableHead className="text-right">چک یا سند</TableHead>
              <TableHead className="text-right">جمع دریافتی</TableHead>
              <TableHead className="text-right">جمع کل</TableHead>
              <TableHead className="text-right">خدمات</TableHead>
              <TableHead className="text-right">درمانگر</TableHead>
              <TableHead className="text-right">توضیحات</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={21}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  داده‌ای وجود ندارد
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r, idx) => (
                <TableRow
                  key={r.id}
                  onClick={() =>
                    router.push(`/clinic-dashboard/clients/${r.clientId}`)
                  }
                  className="cursor-pointer whitespace-nowrap text-xs hover:bg-primary/5"
                >
                  <TableCell>{(idx + 1).toLocaleString("fa-IR")}</TableCell>
                  <TableCell>{formatJalaliShort(r.txDateIso)}</TableCell>
                  <TableCell>{formatTimeShort(r.txDateIso)}</TableCell>
                  <TableCell>{r.operatorName}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {r.clientName}
                  </TableCell>
                  <TableCell dir="ltr">{r.nationalId}</TableCell>
                  <TableCell>{r.descriptionLabel}</TableCell>
                  <TableCell>{formatToman(r.cardToCard)}</TableCell>
                  <TableCell>{r.cardNamesText}</TableCell>
                  <TableCell>{formatToman(r.pos)}</TableCell>
                  <TableCell>{r.posNamesText}</TableCell>
                  <TableCell>{formatToman(r.cash)}</TableCell>
                  <TableCell>{formatToman(r.credit)}</TableCell>
                  <TableCell>{formatToman(r.walletWithdraw)}</TableCell>
                  <TableCell>{formatToman(r.checkSum)}</TableCell>
                  <TableCell className="font-bold text-emerald-600">
                    {formatToman(r.receivedSum)}
                  </TableCell>
                  <TableCell className="font-bold">
                    {formatToman(r.grandSum)}
                  </TableCell>
                  <TableCell>{r.serviceTitle}</TableCell>
                  <TableCell>{r.therapistName}</TableCell>
                  <TableCell className="max-w-44 truncate">{r.notes}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <ExternalLink className="size-3.5" />
                      پرونده
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
