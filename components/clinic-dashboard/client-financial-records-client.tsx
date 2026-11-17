// components/clinic-dashboard/client-financial-records-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, CreditCard, Calendar } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { PriceInput } from "@/components/ui/price-input";
import { formatJalali } from "@/lib/jalali";
import { settleInvoiceOrInstallmentAction } from "@/app/clinic-dashboard/(dashboard)/clients/actions";

interface InvoiceRecord {
  id: string;
  invoiceNumber: number | null;
  totalAmount: number;
  paidAmount: number;
  discountAmount: number;
  status: string;
  createdAt: string;
  services: {
    id: string;
    serviceTitle: string;
    subServiceTitle: string;
    therapistName: string;
    finalPrice: number;
  }[];
  payments: {
    id: string;
    amount: number;
    paymentMethod: string;
    terminalName: string | null;
    creditProvider: string | null;
    trackingCode: string | null;
    createdAt: string;
  }[];
  installments: {
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    isCheck: boolean;
    checkNumber: string | null;
    status: string;
  }[];
}

interface ClientFinancialRecordsClientProps {
  client: {
    id: string;
    fullName: string;
    walletBalance: number;
  };
  totalDebt: number;
  invoices: InvoiceRecord[];
  terminals: { value: string; label: string }[];
  canManageFinance: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  POS: "کارت‌خوان",
  CASH: "نقدی",
  CARD_TO_CARD: "کارت به کارت",
  WALLET: "کیف پول",
  CREDIT: "سرویس اعتباری",
};

const SETTLE_METHODS = [
  { value: "POS", label: "کارت‌خوان (POS)" },
  { value: "CREDIT", label: "سرویس اعتباری (اسنپ‌پی، دیجی‌پی و...)" },
  { value: "CASH", label: "نقدی" },
  { value: "CARD_TO_CARD", label: "کارت به کارت" },
  { value: "WALLET", label: "کسر از کیف پول" },
];

const CREDIT_PROVIDERS = [
  { value: "اسنپ‌پی (Snapp! Pay)", label: "اسنپ‌پی (Snapp! Pay)" },
  { value: "دیجی‌پی (DigiPay)", label: "دیجی‌پی (DigiPay)" },
  { value: "تارا (Tara)", label: "تارا (Tara)" },
  { value: "ازکی‌وام (AzkiVam)", label: "ازکی‌وام (AzkiVam)" },
  { value: "سایر سرویس‌های اعتباری", label: "سایر سرویس‌های اعتباری" },
];

export function ClientFinancialRecordsClient({
  client,
  totalDebt,
  invoices,
  terminals,
  canManageFinance,
}: ClientFinancialRecordsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [settleTarget, setSettleTarget] = useState<{
    invoiceId: string;
    invoiceNumber: number | null;
    installmentId?: string | null;
    defaultAmount: number;
    title: string;
  } | null>(null);

  const [settleAmount, setSettleAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "POS" | "CASH" | "CARD_TO_CARD" | "WALLET" | "CREDIT"
  >("POS");
  const [terminalId, setTerminalId] = useState(terminals[0]?.value || "NONE");
  const [creditProvider, setCreditProvider] = useState("اسنپ‌پی (Snapp! Pay)");
  const [trackingCode, setTrackingCode] = useState("");

  function openSettleModal(params: {
    invoiceId: string;
    invoiceNumber: number | null;
    installmentId?: string | null;
    amount: number;
    title: string;
  }) {
    setSettleTarget({
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
      installmentId: params.installmentId || null,
      defaultAmount: params.amount,
      title: params.title,
    });
    setSettleAmount(params.amount);
    setPaymentMethod("POS");
    setTrackingCode("");
  }

  function handleSettleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settleTarget) return;

    startTransition(async () => {
      const res = await settleInvoiceOrInstallmentAction({
        clientId: client.id,
        invoiceId: settleTarget.invoiceId,
        installmentId: settleTarget.installmentId,
        amount: settleAmount,
        paymentMethod,
        terminalId:
          paymentMethod === "POS" && terminalId !== "NONE" ? terminalId : null,
        creditProvider: paymentMethod === "CREDIT" ? creditProvider : null,
        trackingCode,
      });

      if (!res.success) {
        toast.error(res.error || "خطا در ثبت پرداخت");
        return;
      }

      toast.success("پرداخت با موفقیت ثبت شد.");
      setSettleTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* نوار وضعیت کلی حساب مراجع */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-2xs">
        <div className="flex items-center gap-2.5 text-sm">
          <span className="text-muted-foreground">وضعیت کلی حساب:</span>
          {totalDebt === 0 ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
              <CheckCircle2 className="ml-1 size-3.5" />
              تسویه شده
            </Badge>
          ) : (
            <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/20">
              <AlertCircle className="ml-1 size-3.5" />
              بدهکار: {totalDebt.toLocaleString("fa-IR")} تومان
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          تعداد فاکتورها:{" "}
          <strong className="text-foreground">
            {invoices.length.toLocaleString("fa-IR")}
          </strong>
        </div>
      </div>

      {/* لیست فاکتورها */}
      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card py-16 text-center text-sm text-muted-foreground">
          هنوز فاکتور مالی برای این مراجع صادر نشده است.
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
            return (
              <div
                key={inv.id}
                className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">
                      فاکتور #{inv.invoiceNumber ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatJalali(new Date(inv.createdAt))})
                    </span>
                    <Badge
                      className={
                        remaining === 0
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-amber-500/15 text-amber-700"
                      }
                    >
                      {remaining === 0
                        ? "تسویه شده"
                        : inv.status === "INSTALLMENT"
                        ? "قسطی"
                        : "بدهکار"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span>
                      مبلغ کل:{" "}
                      <strong>{inv.totalAmount.toLocaleString("fa-IR")}</strong>{" "}
                      تومان
                    </span>
                    <span className="text-emerald-600">
                      پرداخت‌شده:{" "}
                      <strong>{inv.paidAmount.toLocaleString("fa-IR")}</strong>{" "}
                      تومان
                    </span>
                    {remaining > 0 && (
                      <span className="text-rose-600">
                        مانده:{" "}
                        <strong>{remaining.toLocaleString("fa-IR")}</strong> تومان
                      </span>
                    )}

                    {remaining > 0 &&
                      canManageFinance &&
                      inv.installments.length === 0 && (
                        <Button
                          size="sm"
                          onClick={() =>
                            openSettleModal({
                              invoiceId: inv.id,
                              invoiceNumber: inv.invoiceNumber,
                              amount: remaining,
                              title: `تسویه بدهی فاکتور #${inv.invoiceNumber}`,
                            })
                          }
                        >
                          تسویه بدهی
                        </Button>
                      )}
                  </div>
                </div>

                {/* خدمات موجود در این فاکتور */}
                <div className="space-y-1.5 text-xs">
                  <p className="font-semibold text-muted-foreground">
                    خدمات این فاکتور:
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {inv.services.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                      >
                        <div>
                          <div className="font-medium">
                            {s.serviceTitle} — {s.subServiceTitle}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            درمانگر: {s.therapistName}
                          </div>
                        </div>
                        <span className="font-semibold">
                          {s.finalPrice.toLocaleString("fa-IR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* پرداخت‌های ثبت‌شده */}
                {inv.payments.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <p className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                      <CreditCard className="size-3.5" />
                      تراکنش‌های پرداختی:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {inv.payments.map((p) => (
                        <Badge key={p.id} variant="outline" className="py-1">
                          {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                          {p.creditProvider ? ` (${p.creditProvider})` : ""}
                          {p.terminalName ? ` (${p.terminalName})` : ""}:{" "}
                          <strong className="mr-1">
                            {p.amount.toLocaleString("fa-IR")} تومان
                          </strong>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* اقساط فاکتور */}
                {inv.installments.length > 0 && (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
                    <p className="flex items-center gap-1.5 font-bold">
                      <Calendar className="size-3.5 text-primary" />
                      اقساط و چک‌های فاکتور:
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {inv.installments.map((ins) => (
                        <div
                          key={ins.id}
                          className="flex items-center justify-between rounded-lg border bg-background p-2.5"
                        >
                          <div>
                            <div className="font-semibold">
                              قسط {ins.installmentNumber}{" "}
                              {ins.isCheck ? "(چک)" : ""}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              سررسید: {formatJalali(new Date(ins.dueDate))}
                            </div>
                            <div className="mt-0.5 font-bold text-primary">
                              {ins.amount.toLocaleString("fa-IR")} تومان
                            </div>
                          </div>

                          {ins.status === "PAID" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700">
                              پرداخت شده
                            </Badge>
                          ) : (
                            canManageFinance && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs"
                                onClick={() =>
                                  openSettleModal({
                                    invoiceId: inv.id,
                                    invoiceNumber: inv.invoiceNumber,
                                    installmentId: ins.id,
                                    amount: ins.amount,
                                    title: `پرداخت قسط ${ins.installmentNumber} فاکتور #${inv.invoiceNumber}`,
                                  })
                                }
                              >
                                پرداخت قسط
                              </Button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* مودال ثبت پرداخت قسط یا تسویه بدهی */}
      <ResponsiveDialog
        open={Boolean(settleTarget)}
        onOpenChange={(open) => !open && setSettleTarget(null)}
      >
        <ResponsiveDialogTrigger className="sr-only" tabIndex={-1} aria-hidden="true"/>

        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{settleTarget?.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              مبلغ و روش پرداخت را برای ثبت در حساب مراجع مشخص کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSettleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>مبلغ پرداختی (تومان) *</Label>
              <PriceInput
                value={settleAmount}
                onValueChange={(v) => setSettleAmount(v || 0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>روش پرداخت</Label>
              <Select
                value={paymentMethod}
                items={SETTLE_METHODS}
                onValueChange={(val) =>
                  setPaymentMethod(
                    (val as "POS" | "CASH" | "CARD_TO_CARD" | "WALLET" | "CREDIT") ||
                      "POS"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETTLE_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "POS" && (
              <div className="space-y-1.5">
                <Label>دستگاه کارت‌خوان</Label>
                <Select
                  value={terminalId}
                  items={[
                    { value: "NONE", label: "انتخاب کنید" },
                    ...terminals,
                  ]}
                  onValueChange={(val) => setTerminalId(val || "NONE")}
                >
                  <SelectTrigger>
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
              </div>
            )}

            {paymentMethod === "CREDIT" && (
              <div className="space-y-1.5">
                <Label>سرویس اعتباری</Label>
                <Select
                  value={creditProvider}
                  items={CREDIT_PROVIDERS}
                  onValueChange={(val) =>
                    setCreditProvider(val || "اسنپ‌پی (Snapp! Pay)")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_PROVIDERS.map((cp) => (
                      <SelectItem key={cp.value} value={cp.value}>
                        {cp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>شماره رهگیری / قرارداد (اختیاری)</Label>
              <Input
                dir="ltr"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "در حال ثبت..." : "ثبت پرداخت"}
            </Button>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}