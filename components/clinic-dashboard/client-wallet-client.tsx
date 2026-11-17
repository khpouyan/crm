// components/clinic-dashboard/client-wallet-client.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Hash,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createWalletTransactionAction } from "@/app/clinic-dashboard/(dashboard)/clients/actions";

interface WalletTxItem {
  id: string;
  type: string;
  amount: number;
  paymentMethod: string | null;
  description: string | null;
  createdAt: string;
}

interface ClientWalletClientProps {
  client: {
    id: string;
    fullName: string;
    walletBalance: number;
  };
  stats: {
    totalDeposits: number;
    totalOutflows: number;
    count: number;
  };
  transactions: WalletTxItem[];
  terminals: { value: string; label: string }[];
  canManageFinance: boolean;
}

const PAYMENT_METHODS = [
  { value: "POS", label: "کارت‌خوان (POS)" },
  { value: "CASH", label: "نقدی" },
  { value: "CARD_TO_CARD", label: "کارت به کارت" },
];

export function ClientWalletClient({
  client,
  stats,
  transactions,
  terminals,
  canManageFinance,
}: ClientWalletClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filter, setFilter] = useState<"ALL" | "DEPOSIT" | "OUTFLOW">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [txType, setTxType] = useState<"DEPOSIT" | "REFUND">("DEPOSIT");
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("POS");
  const [terminalId, setTerminalId] = useState(terminals[0]?.value || "NONE");
  const [description, setDescription] = useState("");

  const filteredTransactions = useMemo(() => {
    if (filter === "ALL") return transactions;
    if (filter === "DEPOSIT") {
      return transactions.filter((t) => t.type === "DEPOSIT");
    }
    return transactions.filter(
      (t) => t.type === "WITHDRAW" || t.type === "REFUND"
    );
  }, [transactions, filter]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("لطفاً مبلغ معتبر وارد کنید.");
      return;
    }
    if (!description.trim()) {
      toast.error("توضیحات تراکنش الزامی است.");
      return;
    }

    startTransition(async () => {
      const res = await createWalletTransactionAction({
        clientId: client.id,
        type: txType,
        amount,
        paymentMethod,
        terminalId:
          paymentMethod === "POS" && terminalId !== "NONE" ? terminalId : null,
        description,
      });

      if (!res.success) {
        toast.error(res.error || "خطا در ثبت تراکنش");
        return;
      }

      toast.success(
        txType === "DEPOSIT"
          ? "کیف پول مراجع با موفقیت شارژ شد."
          : "مبلغ با موفقیت از کیف پول مسترد شد."
      );
      setIsModalOpen(false);
      setAmount(0);
      setDescription("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      {/* کارت بزرگ موجودی کیف پول */}
      <div className="rounded-2xl bg-gradient-to-l from-primary to-primary/85 p-6 text-primary-foreground shadow-md">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm opacity-90">
            <Wallet className="size-5" />
            موجودی فعلی کیف پول
          </span>
          <span className="text-xs opacity-75">{client.fullName}</span>
        </div>
        <div className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {client.walletBalance.toLocaleString("fa-IR")}{" "}
          <span className="text-base font-normal">تومان</span>
        </div>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
          <div>
            <p className="text-xs text-muted-foreground">مجموع واریزی (شارژ)</p>
            <p className="mt-1 text-lg font-bold text-emerald-600">
              {stats.totalDeposits.toLocaleString("fa-IR")} تومان
            </p>
          </div>
          <ArrowDownCircle className="size-8 text-emerald-500/70" />
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
          <div>
            <p className="text-xs text-muted-foreground">مجموع برداشت و استرداد</p>
            <p className="mt-1 text-lg font-bold text-rose-600">
              {stats.totalOutflows.toLocaleString("fa-IR")} تومان
            </p>
          </div>
          <ArrowUpCircle className="size-8 text-rose-500/70" />
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
          <div>
            <p className="text-xs text-muted-foreground">تعداد کل تراکنش‌ها</p>
            <p className="mt-1 text-lg font-bold">
              {stats.count.toLocaleString("fa-IR")} مورد
            </p>
          </div>
          <Hash className="size-8 text-primary/60" />
        </div>
      </div>

      {/* تاریخچه تراکنش‌ها */}
      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">تاریخچه تراکنش‌ها</h2>

          <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs">
            {[
              { key: "ALL", label: "همه" },
              { key: "DEPOSIT", label: "واریزی" },
              { key: "OUTFLOW", label: "برداشت / استرداد" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key as "ALL" | "DEPOSIT" | "OUTFLOW")}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            تراکنشی برای نمایش وجود ندارد.
          </div>
        ) : (
          <div className="divide-y">
            {filteredTransactions.map((tx) => {
              const isDeposit = tx.type === "DEPOSIT";
              return (
                <div
                  key={tx.id}
                  className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    {isDeposit ? (
                      <ArrowDownCircle className="mt-0.5 size-6 shrink-0 text-emerald-600" />
                    ) : (
                      <ArrowUpCircle className="mt-0.5 size-6 shrink-0 text-rose-600" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">
                        {tx.description ||
                          (isDeposit ? "شارژ کیف پول" : "برداشت / استرداد")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatJalali(new Date(tx.createdAt))} -{" "}
                        {new Date(tx.createdAt).toLocaleTimeString("fa-IR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {tx.paymentMethod ? ` • ${tx.paymentMethod}` : ""}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`text-sm font-bold ${
                      isDeposit ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {isDeposit ? "+" : "-"}
                    {tx.amount.toLocaleString("fa-IR")} تومان
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* دکمه شناور + */}
      {canManageFinance && (
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
          title="افزودن تراکنش کیف پول"
        >
          <Plus className="size-6" />
        </Button>
      )}

      {/* مودال افزودن تراکنش جدید */}
      <ResponsiveDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
       <ResponsiveDialogTrigger className="sr-only" tabIndex={-1} aria-hidden="true"/>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>افزودن تراکنش جدید</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              شارژ کیف پول یا استرداد وجه برای {client.fullName}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setTxType("DEPOSIT")}
                className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                  txType === "DEPOSIT"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                شارژ کیف پول ↓
              </button>
              <button
                type="button"
                onClick={() => setTxType("REFUND")}
                className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                  txType === "REFUND"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                استرداد از کیف پول ↑
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>مبلغ (تومان) *</Label>
              <PriceInput
                value={amount}
                onValueChange={(v) => setAmount(v || 0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>روش پرداخت</Label>
              <Select
                value={paymentMethod}
                items={PAYMENT_METHODS}
                onValueChange={(val) => setPaymentMethod(val || "POS")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
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

            <div className="space-y-1.5">
              <Label>توضیحات *</Label>
              <Textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات تراکنش..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "در حال ثبت..." : "ثبت تراکنش"}
            </Button>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}