// components/clinic-dashboard/invoice-wizard/step3-print-receipt.tsx
"use client";

import { useState } from "react";
import { Printer, Receipt, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatJalali } from "@/lib/jalali";
import type { InvoiceCalculationResult } from "@/lib/finance/invoice-calculator";
import type {
  DraftInstallmentRow,
  DraftPaymentRow,
  DraftServiceAccordionBlock,
  PrintSectionFlags,
  SelectOption,
  WizardCatalogService,
  WizardCreditProvider,
} from "./types";

interface Step3PrintReceiptProps {
  clinicName: string;
  operatorName: string;
  invoiceNumber: number | null;
  client: {
    fullName: string;
    phone: string | null;
    nationalId: string | null;
    gender: string | null;
  };
  performedDate: Date | null;
  performedTime: string;
  paymentDate: Date | null;
  paymentTime: string;
  therapistName: string;
  serviceBlocks: DraftServiceAccordionBlock[];
  catalogServices: WizardCatalogService[];
  payments: DraftPaymentRow[];
  terminals: SelectOption[];
  creditProviders: WizardCreditProvider[];
  installments: DraftInstallmentRow[];
  remainingMode: "DEBT" | "INSTALLMENT";
  calculation: InvoiceCalculationResult;
  onFinish: () => void;
}

const PRINT_OPTIONS: { key: keyof PrintSectionFlags; label: string }[] = [
  { key: "clientInfo", label: "اطلاعات مراجعه‌کننده" },
  { key: "nationalId", label: "کد ملی" },
  { key: "therapistName", label: "نام درمانگر" },
  { key: "serviceInfo", label: "اطلاعات سرویس" },
  { key: "subServices", label: "ریز خدمات" },
  { key: "consumables", label: "کالاهای مصرفی" },
  { key: "financialSummary", label: "جمع و مبلغ پرداختی" },
  { key: "discounts", label: "تخفیف" },
  { key: "extraCharges", label: "اضافه پرداخت / بیعانه" },
  { key: "payments", label: "شیوه پرداخت" },
  { key: "installments", label: "اقساط و چک‌ها" },
  { key: "description", label: "توضیحات" },
];

const PAYMENT_LABELS: Record<string, string> = {
  POS: "کارت‌خوان",
  CASH: "نقدی",
  CARD_TO_CARD: "کارت به کارت",
  WALLET: "کیف پول",
  CREDIT: "سرویس اعتباری",
};

export function Step3PrintReceipt({
  clinicName,
  operatorName,
  invoiceNumber,
  client,
  performedDate,
  performedTime,
  paymentDate,
  paymentTime,
  therapistName,
  serviceBlocks,
  catalogServices,
  payments,
  terminals,
  creditProviders,
  installments,
  remainingMode,
  calculation,
  onFinish,
}: Step3PrintReceiptProps) {
  const [printMode, setPrintMode] = useState<"A4" | "THERMAL">("A4");
  const [flags, setFlags] = useState<PrintSectionFlags>({
    clientInfo: true,
    nationalId: true,
    therapistName: true,
    serviceInfo: true,
    subServices: true,
    consumables: true,
    financialSummary: true,
    discounts: true,
    extraCharges: true,
    payments: true,
    installments: true,
    description: true,
  });

  function triggerPrint(mode: "A4" | "THERMAL") {
    setPrintMode(mode);
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 120);
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pb-16 sm:p-6">
      {/* استایل اختصاصی چاپ برای حذف کامل سایدبار، هدر داشبورد و دکمه‌ها و اعمال حاشیه استاندارد هنگام پرینت */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${printMode === "THERMAL" ? "80mm auto" : "A4 portrait"};
            margin: ${printMode === "THERMAL" ? "4mm" : "12mm"};
          }

          body * {
            visibility: hidden !important;
          }

          #printable-receipt-area,
          #printable-receipt-area * {
            visibility: visible !important;
          }

          #printable-receipt-area {
            position: fixed !important;
            inset: 0 !important;
            top: 0 !important;
            right: 0 !important;
            left: 0 !important;
            width: ${printMode === "THERMAL" ? "72mm" : "100%"} !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: ${printMode === "THERMAL" ? "3mm 2mm" : "6mm"} !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 99999 !important;
          }
        }
      `}</style>

      {/* نوار دکمه‌های عملیات بالا (مخفی هنگام چاپ) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-2xs print:hidden">
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="size-5" />
          <span className="text-sm font-bold">
            فاکتور شماره #{invoiceNumber} ثبت شد
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => triggerPrint("THERMAL")}
            className="gap-1.5"
          >
            <Receipt className="size-4" />
            پرینت فیش
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => triggerPrint("A4")}
            className="gap-1.5"
          >
            <Printer className="size-4" />
            پرینت A4
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onFinish}
            className="gap-1.5"
          >
            <ArrowRight className="size-4" />
            بازگشت به پرونده مراجع
          </Button>
        </div>
      </div>

      {/* بخش انتخاب بخش‌های قابل پرینت (مخفی هنگام چاپ) */}
      <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-2xs print:hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">انتخاب بخش‌های پرینت</h3>
          <span className="text-xs text-muted-foreground">
            بخش‌های انتخاب‌شده در پیش‌نمایش و پرینت نمایش داده می‌شوند.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {PRINT_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs hover:bg-muted/50"
            >
              <Checkbox
                checked={flags[opt.key]}
                onCheckedChange={(checked) =>
                  setFlags((prev) => ({
                    ...prev,
                    [opt.key]: Boolean(checked),
                  }))
                }
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* پیش‌نمایش قابل چاپ (تنها بخشی که در PDF/چاپ ظاهر می‌شود) */}
      <div
        id="printable-receipt-area"
        dir="rtl"
        className={`mx-auto rounded-2xl border bg-white p-6 text-slate-900 shadow-xs ${
          printMode === "THERMAL" ? "max-w-sm text-xs" : "w-full text-sm"
        }`}
      >
        <div className="mb-6 border-b pb-4 text-center">
          <h2 className="text-lg font-black">{clinicName}</h2>
          <p className="mt-1 text-xs text-slate-500">
            صورت‌حساب و جزئیات خدمات — شماره فاکتور: #{invoiceNumber}
          </p>
        </div>

        <div className="space-y-6">
          {/* اطلاعات مراجعه‌کننده */}
          {flags.clientInfo && (
            <div className="space-y-2">
              <h4 className="border-r-2 border-primary pr-2 text-xs font-bold text-slate-700">
                اطلاعات مراجعه‌کننده
              </h4>
              <div className="grid grid-cols-2 gap-2 rounded-xl border bg-slate-50 p-3 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-500">نام: </span>
                  <strong>{client.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">موبایل: </span>
                  <strong dir="ltr">{client.phone || "ثبت نشده"}</strong>
                </div>
                {flags.nationalId && (
                  <div>
                    <span className="text-slate-500">کد ملی: </span>
                    <strong dir="ltr">{client.nationalId || "ثبت نشده"}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">جنسیت: </span>
                  <strong>
                    {client.gender === "MALE"
                      ? "مرد"
                      : client.gender === "FEMALE"
                      ? "زن"
                      : "—"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* اطلاعات سرویس و ریز خدمات */}
          {flags.serviceInfo && (
            <div className="space-y-2">
              <h4 className="border-r-2 border-primary pr-2 text-xs font-bold text-slate-700">
                اطلاعات سرویس و ریز خدمات
              </h4>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2.5">خدمت</th>
                      {flags.subServices && (
                        <th className="p-2.5">زیرسرویس و ویژگی‌ها</th>
                      )}
                      {flags.therapistName && (
                        <th className="p-2.5">درمانگر</th>
                      )}
                      <th className="p-2.5">تاریخ انجام</th>
                      <th className="p-2.5">مبلغ (تومان)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {serviceBlocks.map((block) => {
                      const srv = catalogServices.find(
                        (s) => s.id === block.serviceId
                      );
                      return block.selectedSubServices.map((sub) => (
                        <tr key={`${block.uid}-${sub.subServiceId}`}>
                          <td className="p-2.5 font-semibold">
                            {srv?.title || "—"}
                          </td>
                          {flags.subServices && (
                            <td className="p-2.5">
                              <div>{sub.subServiceTitle}</div>
                              {sub.attributes.length > 0 && (
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {sub.attributes
                                    .map((a) => `${a.key}: ${a.value}`)
                                    .join(" | ")}
                                </div>
                              )}
                            </td>
                          )}
                          {flags.therapistName && (
                            <td className="p-2.5">{therapistName}</td>
                          )}
                          <td className="p-2.5">
                            {performedDate ? formatJalali(performedDate) : "—"}{" "}
                            ({performedTime})
                          </td>
                          <td className="p-2.5 font-bold">
                            {sub.finalPrice.toLocaleString("fa-IR")}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* کالاهای مصرفی */}
          {flags.consumables &&
            serviceBlocks.some((b) => b.consumables.length > 0) && (
              <div className="space-y-2">
                <h4 className="border-r-2 border-primary pr-2 text-xs font-bold text-slate-700">
                  کالاهای مصرفی
                </h4>
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-2.5">نام محصول</th>
                        <th className="p-2.5">تعداد</th>
                        <th className="p-2.5">قیمت واحد</th>
                        <th className="p-2.5">قیمت کل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {serviceBlocks.flatMap((b) =>
                        b.consumables.map((c) => (
                          <tr key={c.uid}>
                            <td className="p-2.5">{c.productName}</td>
                            <td className="p-2.5">
                              {c.quantity} {c.unit}
                            </td>
                            <td className="p-2.5">
                              {c.sellingPrice.toLocaleString("fa-IR")}
                            </td>
                            <td className="p-2.5 font-bold">
                              {Math.round(
                                c.quantity * c.sellingPrice
                              ).toLocaleString("fa-IR")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* خلاصه مالی */}
          {flags.financialSummary && (
            <div className="space-y-2">
              <h4 className="border-r-2 border-primary pr-2 text-xs font-bold text-slate-700">
                خلاصه مالی فاکتور
              </h4>
              <div className="grid grid-cols-2 gap-2 rounded-xl border bg-slate-50 p-3 text-xs sm:grid-cols-5">
                <div>
                  <span className="text-slate-500">جمع خدمات و کالا: </span>
                  <strong>{calculation.subTotal.toLocaleString("fa-IR")}</strong>
                </div>
                {flags.discounts && (
                  <div>
                    <span className="text-slate-500">تخفیف: </span>
                    <strong>
                      {calculation.discountAmount.toLocaleString("fa-IR")}
                    </strong>
                  </div>
                )}
                {flags.extraCharges && (
                  <div>
                    <span className="text-slate-500">اضافه/بیعانه: </span>
                    <strong>
                      {(
                        calculation.extraChargeAmount +
                        calculation.depositAmount +
                        calculation.creditFeeTotal
                      ).toLocaleString("fa-IR")}
                    </strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">مبلغ کل: </span>
                  <strong className="text-primary">
                    {calculation.finalTotal.toLocaleString("fa-IR")} تومان
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">مانده حساب: </span>
                  <strong className="text-amber-600">
                    {calculation.remaining.toLocaleString("fa-IR")} تومان
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* شیوه پرداخت */}
          {flags.payments && payments.some((p) => p.amount > 0) && (
            <div className="space-y-2">
              <h4 className="border-r-2 border-primary pr-2 text-xs font-bold text-slate-700">
                شیوه پرداخت
              </h4>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2.5">ردیف</th>
                      <th className="p-2.5">نحوه پرداخت</th>
                      <th className="p-2.5">مبلغ (تومان)</th>
                      <th className="p-2.5">تاریخ و ساعت ثبت سند</th>
                      <th className="p-2.5">کد رهگیری</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments
                      .filter((p) => p.amount > 0)
                      .map((p, idx) => {
                        const creditRow = calculation.creditBreakdown[idx];
                        const posLabel =
                          p.paymentMethod === "POS"
                            ? terminals.find((t) => t.value === p.terminalId)
                                ?.label
                            : null;
                        const cpLabel =
                          p.paymentMethod === "CREDIT"
                            ? creditProviders.find(
                                (c) => c.id === p.creditProviderId
                              )?.title || p.customCreditProvider
                            : null;

                        return (
                          <tr key={p.uid}>
                            <td className="p-2.5">{idx + 1}</td>
                            <td className="p-2.5">
                              {PAYMENT_LABELS[p.paymentMethod]}
                              {posLabel ? ` (${posLabel})` : ""}
                              {cpLabel ? ` (${cpLabel})` : ""}
                            </td>
                            <td className="p-2.5 font-bold">
                              {(
                                creditRow?.totalCharge ?? p.amount
                              ).toLocaleString("fa-IR")}
                            </td>
                            <td className="p-2.5">
                              {paymentDate ? formatJalali(paymentDate) : "—"}{" "}
                              ({paymentTime})
                            </td>
                            <td className="p-2.5" dir="ltr">
                              {p.trackingCode || "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* اقساط و چک‌ها */}
          {flags.installments &&
            calculation.remaining > 0 &&
            remainingMode === "INSTALLMENT" &&
            installments.length > 0 && (
              <div className="space-y-2">
                <h4 className="border-r-2 border-primary pr-2 text-xs font-bold text-slate-700">
                  اقساط و چک‌ها
                </h4>
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-2.5">ردیف</th>
                        <th className="p-2.5">نوع</th>
                        <th className="p-2.5">موعد پرداخت</th>
                        <th className="p-2.5">مبلغ (تومان)</th>
                        <th className="p-2.5">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {installments.map((ins, idx) => (
                        <tr key={ins.uid}>
                          <td className="p-2.5">{idx + 1}</td>
                          <td className="p-2.5">
                            {ins.isCheck
                              ? `چک ${ins.checkNumber ? `(${ins.checkNumber})` : ""}`
                              : "قسط"}
                          </td>
                          <td className="p-2.5">
                            {ins.dueDate ? formatJalali(ins.dueDate) : "—"}
                          </td>
                          <td className="p-2.5 font-bold">
                            {ins.amount.toLocaleString("fa-IR")}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px]">
                              پرداخت نشده
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* توضیحات */}
          {flags.description &&
            serviceBlocks.some((b) => b.description.trim()) && (
              <div className="space-y-1.5">
                <h4 className="border-r-2 border-primary pr-2 text-xs font-bold text-slate-700">
                  توضیحات
                </h4>
                <div className="rounded-xl border bg-slate-50 p-3 text-xs text-slate-600">
                  {serviceBlocks
                    .map((b) => b.description.trim())
                    .filter(Boolean)
                    .join(" — ")}
                </div>
              </div>
            )}

          <div className="border-t pt-3 text-[11px] text-slate-400">
            اپراتور ثبت‌کننده: {operatorName}
          </div>
        </div>
      </div>
    </div>
  );
}