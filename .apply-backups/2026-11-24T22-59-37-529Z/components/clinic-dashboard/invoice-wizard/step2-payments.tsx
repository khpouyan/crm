// components/clinic-dashboard/invoice-wizard/step2-payments.tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Plus,
  Trash2,
  CreditCard,
  Wallet,
  Calendar as CalendarIcon,
  ArrowRight,
  AlertTriangle,
  Percent,
  Settings,
  BookmarkCheck,
  DollarSign,
  Clock,
  Receipt,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { PriceInput } from "@/components/ui/price-input"
import type { InvoiceCalculationResult } from "@/lib/finance/invoice-calculator"
import {
  ResponsiveTimePicker,
  ResponsiveTimePickerContent,
  ResponsiveTimePickerTrigger,
} from "@/components/ui/time-picker"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"
import { toPersianDigits } from "@/lib/persian-date"
import type {
  DraftInstallmentRow,
  DraftPaymentRow,
  SelectOption,
  WizardCatalogService,
  WizardCreditProvider,
} from "./types"

interface Step2PaymentsProps {
  clientWalletBalance: number
  canApplyDiscount: boolean
  isSubmitting: boolean
  isEditMode: boolean

  paymentDate: Date | null
  onPaymentDateChange: (d: Date | null) => void
  paymentTime: string
  onPaymentTimeChange: (t: string) => void

  discountAmount: number
  onDiscountAmountChange: (v: number) => void
  discountReason: string
  onDiscountReasonChange: (v: string) => void

  extraChargeAmount: number
  onExtraChargeAmountChange: (v: number) => void
  extraChargeReason: string
  onExtraChargeReasonChange: (v: string) => void

  vatPercent: number
  hasTaxableServices: boolean
  applyTax: boolean
  onApplyTaxChange: (v: boolean) => void

  depositServiceId: string
  onDepositServiceIdChange: (id: string) => void
  depositAmount: number
  onDepositAmountChange: (v: number) => void
  catalogServices: WizardCatalogService[]

  payments: DraftPaymentRow[]
  onPaymentsChange: React.Dispatch<React.SetStateAction<DraftPaymentRow[]>>
  terminals: SelectOption[]
  creditProviders: WizardCreditProvider[]

  remainingMode: "DEBT" | "INSTALLMENT"
  onRemainingModeChange: (m: "DEBT" | "INSTALLMENT") => void
  installments: DraftInstallmentRow[]
  onInstallmentsChange: React.Dispatch<
    React.SetStateAction<DraftInstallmentRow[]>
  >

  calculation: InvoiceCalculationResult
  onBackStep: () => void
  onSubmitInvoice: () => void
}

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: "POS", label: "کارت‌خوان (POS)" },
  { value: "CREDIT", label: "سرویس اعتباری (اسنپ‌پی، دیجی‌پی و...)" },
  { value: "CASH", label: "نقدی" },
  { value: "CARD_TO_CARD", label: "کارت به کارت" },
  { value: "WALLET", label: "کسر از کیف پول" },
]

export function Step2Payments({
  clientWalletBalance,
  canApplyDiscount,
  isSubmitting,
  isEditMode,
  paymentDate,
  onPaymentDateChange,
  paymentTime,
  onPaymentTimeChange,
  discountAmount,
  onDiscountAmountChange,
  discountReason,
  onDiscountReasonChange,
  extraChargeAmount,
  onExtraChargeAmountChange,
  extraChargeReason,
  onExtraChargeReasonChange,
  vatPercent,
  hasTaxableServices,
  applyTax,
  onApplyTaxChange,
  depositServiceId,
  onDepositServiceIdChange,
  depositAmount,
  onDepositAmountChange,
  catalogServices,
  payments,
  onPaymentsChange,
  terminals,
  creditProviders,
  remainingMode,
  onRemainingModeChange,
  installments,
  onInstallmentsChange,
  calculation,
  onBackStep,
  onSubmitInvoice,
}: Step2PaymentsProps) {
  const allSubServiceOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      { value: "NONE", label: "بدون بیعانه / انتخاب سرویس..." },
    ]
    for (const srv of catalogServices) {
      for (const sub of srv.subServices) {
        opts.push({
          value: sub.id,
          label: `${srv.title} — ${sub.title}`,
        })
      }
    }
    return opts
  }, [catalogServices])

  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [paymentTimeText, setPaymentTimeText] = useState(() =>
    toPersianDigits(paymentTime || "12:00")
  )

  useEffect(() => {
    setPaymentTimeText(toPersianDigits(paymentTime || "12:00"))
  }, [paymentTime])

  const parsedPaymentTime = useMemo(() => {
    const [hh, mm] = (paymentTime || "00:00").split(":").map(Number)
    return {
      hour: Number.isFinite(hh) ? hh : 0,
      minute: Number.isFinite(mm) ? mm : 0,
    }
  }, [paymentTime])

  function commitTypedPaymentTime(rawInput: string) {
    const clean = normalizePersianDigits(rawInput).replace(/[^\d:]/g, "")
    let hh = 0
    let mm = 0

    if (clean.includes(":")) {
      const [hStr, mStr] = clean.split(":")
      hh = parseInt(hStr || "0", 10)
      mm = parseInt(mStr || "0", 10)
    } else if (clean.length <= 2) {
      hh = parseInt(clean || "0", 10)
      mm = 0
    } else {
      const padded = clean.padStart(4, "0").slice(0, 4)
      hh = parseInt(padded.slice(0, 2), 10)
      mm = parseInt(padded.slice(2, 4), 10)
    }

    hh = Number.isFinite(hh) ? Math.min(23, Math.max(0, hh)) : 0
    mm = Number.isFinite(mm) ? Math.min(59, Math.max(0, mm)) : 0

    const formatted = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
    onPaymentTimeChange(formatted)
    setPaymentTimeText(toPersianDigits(formatted))
  }

  const creditProviderOptions: SelectOption[] = useMemo(
    () => [
      ...creditProviders.map((cp) => ({
        value: cp.id,
        label: `${cp.title}${
          cp.clientFeePercent > 0
            ? ` (+${cp.clientFeePercent}% کارمزد مراجع)`
            : " (بدون کارمزد مراجع)"
        }`,
      })),
      { value: "CUSTOM", label: "سایر سرویس‌ها (بدون کارمزد خودکار)" },
    ],
    [creditProviders]
  )

  function handleSplitInstallmentsEqually(count: number) {
    const safeCount = Math.max(1, Math.min(24, count))
    const rem = calculation.remaining
    if (rem <= 0) {
      onInstallmentsChange([])
      return
    }
    const baseAmount = Math.floor(rem / safeCount)
    const remainder = rem - baseAmount * safeCount

    const rows: DraftInstallmentRow[] = Array.from({ length: safeCount }).map(
      (_, idx) => {
        const due = new Date()
        due.setMonth(due.getMonth() + idx + 1)
        return {
          uid: crypto.randomUUID(),
          amount: idx === 0 ? baseAmount + remainder : baseAmount,
          dueDate: due,
          isCheck: false,
          checkNumber: "",
        }
      }
    )
    onInstallmentsChange(rows)
  }

  function handlePayFullWithCredit(rowUid: string) {
    onPaymentsChange((prev) => {
      const target = prev.find((r) => r.uid === rowUid)
      return [
        {
          uid: rowUid,
          paymentMethod: "CREDIT",
          amount: calculation.baseTotalBeforeCreditFee,
          terminalId: terminals[0]?.value || "NONE",
          creditProviderId:
            target?.creditProviderId || creditProviders[0]?.id || "CUSTOM",
          customCreditProvider: target?.customCreditProvider || "",
          trackingCode: target?.trackingCode || "",
        },
      ]
    })
    toast.success(
      "کل مبلغ فاکتور روی سرویس اعتباری قرار گرفت و کارمزد محاسبه شد."
    )
  }

  function handleSettleRemainingWithCredit(rowUid: string) {
    const otherPaymentsPrincipal = payments
      .filter((r) => r.uid !== rowUid)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    const remainingBase = Math.max(
      0,
      calculation.baseTotalBeforeCreditFee - otherPaymentsPrincipal
    )

    onPaymentsChange((prev) =>
      prev.map((row) =>
        row.uid === rowUid
          ? {
              ...row,
              paymentMethod: "CREDIT",
              amount: remainingBase,
            }
          : row
      )
    )
    toast.success("باقیمانده مبلغ فاکتور روی سرویس اعتباری تنظیم شد.")
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pb-16 sm:p-6">
      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBackStep}
          className="gap-1.5"
        >
          <ArrowRight className="size-4" />
          بازگشت به مرحله قبل (ویرایش اطلاعات سرویس)
        </Button>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border bg-gradient-to-l from-primary/10 via-card to-card p-5 shadow-2xs sm:flex-row">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <DollarSign className="size-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">
              مبلغ کل فاکتور (نهایی)
            </span>
            <div className="mt-0.5 text-2xl font-black text-foreground">
              {calculation.finalTotal.toLocaleString("fa-IR")}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                تومان
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          {calculation.taxAmount > 0 && (
            <div className="rounded-xl border bg-background px-3.5 py-2">
              <span className="text-muted-foreground">مالیات: </span>
              <strong className="text-primary">
                {calculation.taxAmount.toLocaleString("fa-IR")} تومان
              </strong>
            </div>
          )}
          <div className="rounded-xl border bg-background px-3.5 py-2">
            <span className="text-muted-foreground">پرداخت‌شده: </span>
            <strong className="text-emerald-600">
              {calculation.paidSum.toLocaleString("fa-IR")} تومان
            </strong>
          </div>
          <div className="rounded-xl border bg-background px-3.5 py-2">
            <span className="text-muted-foreground">مانده حساب: </span>
            <strong className="text-amber-600">
              {calculation.remaining.toLocaleString("fa-IR")} تومان
            </strong>
          </div>
        </div>
      </div>

      {/* تخفیف، اضافه پرداخت، مالیات اختیاری و تاریخ/ساعت ثبت تراکنش پرداخت */}
      <div className="rounded-2xl border bg-card p-5 shadow-2xs">
        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>تاریخ ثبت پرداخت *</FieldLabel>
              <DatePicker
                calendarType="shamsi"
                value={paymentDate}
                onValueChange={onPaymentDateChange}
              />
            </Field>

            <Field>
              <FieldLabel>ساعت ثبت پرداخت *</FieldLabel>
              <ResponsiveTimePicker
                open={timePickerOpen}
                onOpenChange={setTimePickerOpen}
              >
                <InputGroup>
                  <InputGroupInput
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="۱۴:۳۰"
                    value={paymentTimeText}
                    onChange={(e) => setPaymentTimeText(e.target.value)}
                    onBlur={(e) => commitTypedPaymentTime(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        commitTypedPaymentTime(paymentTimeText)
                      }
                    }}
                    className="text-right tabular-nums"
                  />
                  <InputGroupAddon align="inline-end">
                    <ResponsiveTimePickerTrigger
                      render={
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label="انتخاب ساعت از لیست"
                        >
                          <Clock className="size-4" />
                        </InputGroupButton>
                      }
                    />
                  </InputGroupAddon>
                </InputGroup>

                <ResponsiveTimePickerContent
                  value={parsedPaymentTime}
                  onValueChange={(next) => {
                    const formatted = `${String(next.hour).padStart(2, "0")}:${String(next.minute).padStart(2, "0")}`
                    onPaymentTimeChange(formatted)
                    setPaymentTimeText(toPersianDigits(formatted))
                  }}
                  hourFormat="24"
                  digits="fa"
                  drawerTitle="انتخاب ساعت پرداخت"
                  drawerConfirmLabel="تایید ساعت"
                  onDrawerConfirm={() => setTimePickerOpen(false)}
                />
              </ResponsiveTimePicker>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>مبلغ تخفیف (تومان)</FieldLabel>
              <PriceInput
                locale="fa-IR"
                disabled={!canApplyDiscount}
                value={discountAmount}
                onValueChange={(v) => onDiscountAmountChange(v || 0)}
              />
              {discountAmount > 0 && (
                <Input
                  placeholder="دلیل تخفیف (اختیاری)"
                  value={discountReason}
                  onChange={(e) => onDiscountReasonChange(e.target.value)}
                />
              )}
            </Field>

            <Field>
              <FieldLabel>اضافه پرداخت / هزینه جانبی (تومان)</FieldLabel>
              <PriceInput
                locale="fa-IR"
                value={extraChargeAmount}
                onValueChange={(v) => onExtraChargeAmountChange(v || 0)}
              />
              {extraChargeAmount > 0 && (
                <Input
                  placeholder="بابت چه موردی؟ (اختیاری)"
                  value={extraChargeReason}
                  onChange={(e) => onExtraChargeReasonChange(e.target.value)}
                />
              )}
            </Field>
          </div>

          {/* مالیات بر ارزش افزوده در صورت تمایل کاربر */}
          {vatPercent > 0 && hasTaxableServices && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Receipt className="size-4 text-primary" />
                <div>
                  <Label
                    htmlFor="apply-invoice-tax"
                    className="cursor-pointer text-xs font-bold text-foreground"
                  >
                    اعمال مالیات بر ارزش افزوده ({vatPercent.toLocaleString("fa-IR")}٪) روی فاکتور
                  </Label>
                  <FieldDescription className="text-[11px]">
                    در صورت فعال بودن، مالیات خدمات مشمول به مبلغ فاکتور اضافه می‌شود
                  </FieldDescription>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {applyTax && (
                  <span className="text-xs font-bold text-primary">
                    {calculation.taxAmount.toLocaleString("fa-IR")} تومان
                  </span>
                )}
                <Switch
                  id="apply-invoice-tax"
                  checked={applyTax}
                  onCheckedChange={(v) => onApplyTaxChange(Boolean(v))}
                />
              </div>
            </div>
          )}
        </FieldGroup>
      </div>

      {/* بخش بیعانه سرویس آینده */}
      <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <BookmarkCheck className="size-4" />
            پرداخت بیعانه بابت سرویس آینده (شارژ کیف پول در همین فاکتور)
          </div>
          {calculation.depositAmount > 0 && (
            <Badge className="bg-emerald-600 text-white">
              +{calculation.depositAmount.toLocaleString("fa-IR")} تومان واریز
              به کیف پول
            </Badge>
          )}
        </div>

        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel className="text-xs">
                انتخاب سرویس (جهت توضیحات بیعانه)
              </FieldLabel>
              <Select
                value={depositServiceId}
                items={allSubServiceOptions}
                onValueChange={(val) => {
                  onDepositServiceIdChange(val || "NONE")
                  if (!val || val === "NONE") {
                    const prevDep = Number(depositAmount) || 0
                    onDepositAmountChange(0)
                    if (prevDep > 0) {
                      onPaymentsChange((prev) => {
                        if (
                          prev.length === 1 &&
                          prev[0].paymentMethod !== "CREDIT"
                        ) {
                          return [
                            {
                              ...prev[0],
                              amount: Math.max(
                                0,
                                (Number(prev[0].amount) || 0) - prevDep
                              ),
                            },
                          ]
                        }
                        return prev
                      })
                    }
                  }
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="انتخاب سرویس..." />
                </SelectTrigger>
                <SelectContent>
                  {allSubServiceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel className="text-xs">مبلغ بیعانه (تومان)</FieldLabel>
              <PriceInput
                locale="fa-IR"
                value={depositAmount}
                onValueChange={(v) => {
                  const nextDep = v || 0
                  const diff = nextDep - (Number(depositAmount) || 0)
                  onDepositAmountChange(nextDep)
                  onPaymentsChange((prev) => {
                    if (
                      prev.length === 1 &&
                      prev[0].paymentMethod !== "CREDIT"
                    ) {
                      return [
                        {
                          ...prev[0],
                          amount: Math.max(
                            0,
                            (Number(prev[0].amount) || 0) + diff
                          ),
                        },
                      ]
                    }
                    return prev
                  })
                }}
              />
            </Field>
          </div>
        </FieldGroup>
      </div>

      {/* روش‌های پرداخت */}
      <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CreditCard className="size-4 text-primary" />
            روش‌های پرداخت
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Wallet className="size-3.5 text-emerald-600" />
              موجودی کیف پول: {clientWalletBalance.toLocaleString("fa-IR")}{" "}
              تومان
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              nativeButton={false}
              render={<Link href="/clinic-dashboard/settings/financial" />}
            >
              <Settings className="size-3.5" />
              تنظیمات کارمزد
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {payments.map((pay, idx) => {
            const creditInfo = calculation.creditBreakdown[idx]
            const selectedCreditConfig =
              pay.paymentMethod === "CREDIT"
                ? creditProviders.find((cp) => cp.id === pay.creditProviderId)
                : undefined

            return (
              <div
                key={pay.uid}
                className="space-y-3 rounded-xl border bg-muted/25 p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {(idx + 1).toLocaleString("fa-IR")}
                  </Badge>
                  {payments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={() =>
                        onPaymentsChange((prev) =>
                          prev.filter((r) => r.uid !== pay.uid)
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <FieldGroup>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel className="text-xs">روش پرداخت</FieldLabel>
                      <Select
                        value={pay.paymentMethod}
                        items={PAYMENT_METHOD_OPTIONS}
                        onValueChange={(val) =>
                          onPaymentsChange((prev) =>
                            prev.map((row) =>
                              row.uid === pay.uid
                                ? {
                                    ...row,
                                    paymentMethod:
                                      (val as DraftPaymentRow["paymentMethod"]) ||
                                      "POS",
                                  }
                                : row
                            )
                          )
                        }
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHOD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel className="text-xs">
                        {pay.paymentMethod === "CREDIT"
                          ? "اصل مبلغ اعتباری (بدون کارمزد)"
                          : "مبلغ (تومان)"}
                      </FieldLabel>
                      <PriceInput
                        locale="fa-IR"
                        value={pay.amount}
                        onValueChange={(v) =>
                          onPaymentsChange((prev) =>
                            prev.map((row) =>
                              row.uid === pay.uid
                                ? { ...row, amount: v || 0 }
                                : row
                            )
                          )
                        }
                      />
                    </Field>
                  </div>

                  {pay.paymentMethod === "POS" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel className="text-xs">
                          دستگاه کارت‌خوان (POS)
                        </FieldLabel>
                        <Select
                          value={pay.terminalId}
                          items={[
                            { value: "NONE", label: "انتخاب کنید" },
                            ...terminals,
                          ]}
                          onValueChange={(val) =>
                            onPaymentsChange((prev) =>
                              prev.map((row) =>
                                row.uid === pay.uid
                                  ? { ...row, terminalId: val || "NONE" }
                                  : row
                              )
                            )
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">انتخاب کنید</SelectItem>
                            {terminals.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel className="text-xs">
                          شماره رهگیری (اختیاری)
                        </FieldLabel>
                        <Input
                          dir="ltr"
                          className="bg-background"
                          value={pay.trackingCode}
                          onChange={(e) =>
                            onPaymentsChange((prev) =>
                              prev.map((row) =>
                                row.uid === pay.uid
                                  ? { ...row, trackingCode: e.target.value }
                                  : row
                              )
                            )
                          }
                        />
                      </Field>
                    </div>
                  )}

                  {pay.paymentMethod === "CREDIT" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field>
                          <FieldLabel className="text-xs">
                            سرویس اعتباری *
                          </FieldLabel>
                          <Select
                            value={pay.creditProviderId}
                            items={creditProviderOptions}
                            onValueChange={(val) =>
                              onPaymentsChange((prev) =>
                                prev.map((row) =>
                                  row.uid === pay.uid
                                    ? {
                                        ...row,
                                        creditProviderId: val || "CUSTOM",
                                      }
                                    : row
                                )
                              )
                            }
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {creditProviderOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field>
                          <FieldLabel className="text-xs">
                            شماره قرارداد / رهگیری
                          </FieldLabel>
                          <Input
                            dir="ltr"
                            className="bg-background"
                            value={pay.trackingCode}
                            onChange={(e) =>
                              onPaymentsChange((prev) =>
                                prev.map((row) =>
                                  row.uid === pay.uid
                                    ? { ...row, trackingCode: e.target.value }
                                    : row
                                )
                              )
                            }
                          />
                        </Field>
                      </div>

                      {pay.creditProviderId === "CUSTOM" && (
                        <Input
                          className="bg-background text-xs"
                          placeholder="نام سرویس اعتباری را وارد کنید..."
                          value={pay.customCreditProvider}
                          onChange={(e) =>
                            onPaymentsChange((prev) =>
                              prev.map((row) =>
                                row.uid === pay.uid
                                  ? {
                                      ...row,
                                      customCreditProvider: e.target.value,
                                    }
                                  : row
                              )
                            )
                          }
                        />
                      )}

                      <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-primary">
                            <Percent className="size-3.5" />
                            محاسبه کارمزد{" "}
                            {selectedCreditConfig?.title || "سرویس اعتباری"}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                            <span>
                              کارمزد مراجع (
                              {selectedCreditConfig?.clientFeePercent ?? 0}%):{" "}
                              <strong className="text-amber-600">
                                +
                                {(creditInfo?.clientFee ?? 0).toLocaleString(
                                  "fa-IR"
                                )}{" "}
                                تومان
                              </strong>
                            </span>
                            <span>
                              جمع قابل کسر از اعتبار:{" "}
                              <strong className="text-emerald-700">
                                {(creditInfo?.totalCharge ?? 0).toLocaleString(
                                  "fa-IR"
                                )}{" "}
                                تومان
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs"
                            onClick={() =>
                              handleSettleRemainingWithCredit(pay.uid)
                            }
                          >
                            تسویه باقیمانده با اعتبار
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => handlePayFullWithCredit(pay.uid)}
                          >
                            پرداخت کل فاکتور با اعتبار
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </FieldGroup>
              </div>
            )
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed text-emerald-700 hover:bg-emerald-500/10"
          onClick={() =>
            onPaymentsChange((prev) => [
              ...prev,
              {
                uid: crypto.randomUUID(),
                paymentMethod: "CASH",
                amount: calculation.remaining,
                terminalId: terminals[0]?.value || "NONE",
                creditProviderId: creditProviders[0]?.id || "CUSTOM",
                customCreditProvider: "",
                trackingCode: "",
              },
            ])
          }
        >
          <Plus className="ml-1.5 size-4" />
          افزودن روش پرداخت
        </Button>
      </div>

      {calculation.remaining > 0 && (
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-extrabold text-amber-600">
                {calculation.remaining.toLocaleString("fa-IR")} تومان
              </div>
              <div className="text-xs text-muted-foreground">
                مبلغ مانده — گزینه پرداخت مبلغ مانده را انتخاب کنید:
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onRemainingModeChange("DEBT")}
              className={`rounded-xl border p-3.5 text-right transition-all ${
                remainingMode === "DEBT"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "bg-background hover:bg-muted"
              }`}
            >
              <div className="font-bold">بدهکار</div>
              <div className="text-xs opacity-80">پرداخت در آینده</div>
            </button>

            <button
              type="button"
              onClick={() => {
                onRemainingModeChange("INSTALLMENT")
                if (installments.length === 0) {
                  handleSplitInstallmentsEqually(1)
                }
              }}
              className={`rounded-xl border p-3.5 text-right transition-all ${
                remainingMode === "INSTALLMENT"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "bg-background hover:bg-muted"
              }`}
            >
              <div className="font-bold">اقساط</div>
              <div className="text-xs opacity-80">پرداخت قسطی / چک</div>
            </button>
          </div>

          {remainingMode === "INSTALLMENT" && (
            <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <CalendarIcon className="size-4 text-primary" />
                  تنظیم اقساط
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      handleSplitInstallmentsEqually(installments.length || 1)
                    }
                  >
                    تقسیم مساوی
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleSplitInstallmentsEqually(installments.length + 1)
                    }
                  >
                    + افزودن قسط جدید
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {installments.map((ins, idx) => (
                  <div
                    key={ins.uid}
                    className="space-y-3 rounded-xl border bg-background p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        قسط {(idx + 1).toLocaleString("fa-IR")}
                      </Badge>
                      {installments.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() =>
                            onInstallmentsChange((prev) =>
                              prev.filter((r) => r.uid !== ins.uid)
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel className="text-xs">مبلغ قسط</FieldLabel>
                        <PriceInput
                          locale="fa-IR"
                          value={ins.amount}
                          onValueChange={(v) =>
                            onInstallmentsChange((prev) =>
                              prev.map((r) =>
                                r.uid === ins.uid ? { ...r, amount: v || 0 } : r
                              )
                            )
                          }
                        />
                      </Field>

                      <Field>
                        <FieldLabel className="text-xs">
                          تاریخ پرداخت
                        </FieldLabel>
                        <DatePicker
                          calendarType="shamsi"
                          value={ins.dueDate}
                          onValueChange={(d) =>
                            onInstallmentsChange((prev) =>
                              prev.map((r) =>
                                r.uid === ins.uid ? { ...r, dueDate: d } : r
                              )
                            )
                          }
                        />
                      </Field>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`chk-${ins.uid}`}
                          checked={ins.isCheck}
                          onCheckedChange={(checked) =>
                            onInstallmentsChange((prev) =>
                              prev.map((r) =>
                                r.uid === ins.uid
                                  ? { ...r, isCheck: Boolean(checked) }
                                  : r
                              )
                            )
                          }
                        />
                        <Label
                          htmlFor={`chk-${ins.uid}`}
                          className="cursor-pointer text-xs"
                        >
                          این قسط چک است
                        </Label>
                      </div>

                      {ins.isCheck && (
                        <Input
                          dir="ltr"
                          className="h-8 w-44 text-xs"
                          placeholder="شماره چک..."
                          value={ins.checkNumber}
                          onChange={(e) =>
                            onInstallmentsChange((prev) =>
                              prev.map((r) =>
                                r.uid === ins.uid
                                  ? { ...r, checkNumber: e.target.value }
                                  : r
                              )
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl border bg-background p-3 text-center text-xs">
                <div>
                  <div className="text-muted-foreground">مانده کل</div>
                  <strong className="mt-0.5 block">
                    {calculation.remaining.toLocaleString("fa-IR")} تومان
                  </strong>
                </div>
                <div>
                  <div className="text-muted-foreground">مجموع اقساط</div>
                  <strong className="mt-0.5 block text-primary">
                    {calculation.installmentsSum.toLocaleString("fa-IR")} تومان
                  </strong>
                </div>
                <div>
                  <div className="text-muted-foreground">تفاوت</div>
                  <strong
                    className={`mt-0.5 block ${
                      calculation.remaining - calculation.installmentsSum === 0
                        ? "text-emerald-600"
                        : "text-destructive"
                    }`}
                  >
                    {(
                      calculation.remaining - calculation.installmentsSum
                    ).toLocaleString("fa-IR")}{" "}
                    تومان
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {calculation.validationError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border-2 border-red-500/60 bg-red-500/10 p-4 text-xs text-red-700 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
          <div className="space-y-0.5">
            <div className="font-bold">
              مشکلی در مقادیر فاکتور وجود دارد (دکمه ثبت نهایی غیرفعال است):
            </div>
            <div>{calculation.validationError}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          disabled={isSubmitting || Boolean(calculation.validationError)}
          onClick={onSubmitInvoice}
          className="w-full"
        >
          {isSubmitting
            ? "در حال پردازش..."
            : isEditMode
              ? "ذخیره و به‌روزرسانی نهایی فاکتور"
              : "ثبت فاکتور"}
        </Button>

        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={isSubmitting}
          onClick={onBackStep}
          className="w-full"
        >
          بازگشت
        </Button>
      </div>
    </div>
  )
}
