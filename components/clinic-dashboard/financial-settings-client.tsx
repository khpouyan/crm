// components/clinic-dashboard/financial-settings-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  CreditCard,
  Percent,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogPanel,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
  ResponsiveDialogDesktopOnly,
} from "@/components/ui/responsive-dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  upsertBankAccountAction,
  deleteBankAccountAction,
  upsertPaymentTerminalAction,
  deletePaymentTerminalAction,
  upsertCreditProviderAction,
  deleteCreditProviderAction,
} from "@/app/clinic-dashboard/(dashboard)/settings/financial/actions";

interface BankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  cardNumber: string | null;
  iban: string | null;
  ownerName: string;
  isActive: boolean;
}

interface TerminalItem {
  id: string;
  bankAccountId: string;
  bankName: string;
  name: string;
  type: string;
  terminalCode: string | null;
  isActive: boolean;
}

interface CreditProviderItem {
  id: string;
  title: string;
  commissionPercent: number;
  clientFeePercent: number;
  isActive: boolean;
}

interface FinancialSettingsClientProps {
  bankAccounts: BankAccountItem[];
  terminals: TerminalItem[];
  creditProviders: CreditProviderItem[];
}

const TERMINAL_TYPE_OPTIONS = [
  { value: "POS", label: "کارت‌خوان فیزیکی (POS)" },
  { value: "MOBILE_POS", label: "کارت‌خوان سیار" },
  { value: "IPG", label: "درگاه پرداخت اینترنتی" },
];

export function FinancialSettingsClient({
  bankAccounts,
  terminals,
  creditProviders,
}: FinancialSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // مودال سرویس اعتباری
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<CreditProviderItem | null>(
    null
  );
  const [cpTitle, setCpTitle] = useState("");
  const [cpCommission, setCpCommission] = useState("0");
  const [cpClientFee, setCpClientFee] = useState("0");
  const [cpActive, setCpActive] = useState(true);

  // مودال حساب بانکی
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccountItem | null>(null);
  const [bankName, setBankName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [iban, setIban] = useState("");
  const [bankActive, setBankActive] = useState(true);

  // مودال کارت‌خوان
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<TerminalItem | null>(null);
  const [posName, setPosName] = useState("");
  const [posBankId, setPosBankId] = useState("");
  const [posType, setPosType] = useState("POS");
  const [posCode, setPosCode] = useState("");
  const [posActive, setPosActive] = useState(true);

  function openCreditModal(item?: CreditProviderItem) {
    if (item) {
      setEditingCredit(item);
      setCpTitle(item.title);
      setCpCommission(String(item.commissionPercent));
      setCpClientFee(String(item.clientFeePercent));
      setCpActive(item.isActive);
    } else {
      setEditingCredit(null);
      setCpTitle("");
      setCpCommission("7");
      setCpClientFee("5");
      setCpActive(true);
    }
    setCreditModalOpen(true);
  }

  function handleSaveCredit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertCreditProviderAction({
        id: editingCredit?.id,
        title: cpTitle,
        commissionPercent: parseFloat(cpCommission) || 0,
        clientFeePercent: parseFloat(cpClientFee) || 0,
        isActive: cpActive,
      });
      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره سرویس اعتباری");
        return;
      }
      toast.success("تنظیمات سرویس اعتباری ذخیره شد.");
      setCreditModalOpen(false);
      router.refresh();
    });
  }

  function openBankModal(item?: BankAccountItem) {
    if (item) {
      setEditingBank(item);
      setBankName(item.bankName);
      setOwnerName(item.ownerName);
      setAccountNumber(item.accountNumber);
      setCardNumber(item.cardNumber || "");
      setIban(item.iban || "");
      setBankActive(item.isActive);
    } else {
      setEditingBank(null);
      setBankName("");
      setOwnerName("");
      setAccountNumber("");
      setCardNumber("");
      setIban("");
      setBankActive(true);
    }
    setBankModalOpen(true);
  }

  function handleSaveBank(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertBankAccountAction({
        id: editingBank?.id,
        bankName,
        ownerName,
        accountNumber,
        cardNumber,
        iban,
        isActive: bankActive,
      });
      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره حساب بانکی");
        return;
      }
      toast.success("حساب بانکی با موفقیت ذخیره شد.");
      setBankModalOpen(false);
      router.refresh();
    });
  }

  function openPosModal(item?: TerminalItem) {
    if (bankAccounts.length === 0) {
      toast.error("ابتدا حداقل یک حساب بانکی تعریف کنید.");
      return;
    }
    if (item) {
      setEditingPos(item);
      setPosName(item.name);
      setPosBankId(item.bankAccountId);
      setPosType(item.type);
      setPosCode(item.terminalCode || "");
      setPosActive(item.isActive);
    } else {
      setEditingPos(null);
      setPosName("");
      setPosBankId(bankAccounts[0]?.id || "");
      setPosType("POS");
      setPosCode("");
      setPosActive(true);
    }
    setPosModalOpen(true);
  }

  function handleSavePos(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertPaymentTerminalAction({
        id: editingPos?.id,
        bankAccountId: posBankId,
        name: posName,
        type: posType,
        terminalCode: posCode,
        isActive: posActive,
      });
      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره دستگاه کارت‌خوان");
        return;
      }
      toast.success("دستگاه کارت‌خوان ذخیره شد.");
      setPosModalOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          تنظیمات مالی، درگاه‌ها و سرویس‌های اعتباری
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          مدیریت حساب‌های بانکی کلینیک، دستگاه‌های کارت‌خوان (POS) و درصد کارمزد سرویس‌های خرید اعتباری (اسنپ‌پی، دیجی‌پی، تارا و...)
        </p>
      </div>

      <Tabs defaultValue="credit" className="space-y-5">
        <TabsList className="grid w-full max-w-xl grid-cols-3 [&_[data-slot=tabs-indicator]]:hidden">
          <TabsTrigger
            value="credit"
            className="gap-1.5 text-xs data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            <Percent className="size-3.5" />
            سرویس‌های اعتباری
          </TabsTrigger>
          <TabsTrigger
            value="banks"
            className="gap-1.5 text-xs data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            <Landmark className="size-3.5" />
            حساب‌های بانکی
          </TabsTrigger>
          <TabsTrigger
            value="terminals"
            className="gap-1.5 text-xs data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            <CreditCard className="size-3.5" />
            دستگاه‌های کارت‌خوان
          </TabsTrigger>
        </TabsList>

        {/* تب ۱: سرویس‌های اعتباری */}
        <TabsContent value="credit" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold">
                تعرفه و کارمزد سرویس‌های اعتباری (BNPL / اقساطی)
              </h2>
              <p className="text-xs text-muted-foreground">
                درصد کارمزد دریافتی از مراجع هنگام ثبت فاکتور اعتباری به صورت خودکار به مبلغ باقیمانده یا کل فاکتور اضافه می‌شود.
              </p>
            </div>
            <Button size="sm" onClick={() => openCreditModal()}>
              <Plus className="ml-1.5 size-4" />
              افزودن سرویس اعتباری
            </Button>
          </div>

          {creditProviders.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card py-14 text-center">
              <Percent className="mx-auto mb-2 size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">
                هنوز سرویس اعتباری تعریف نشده است
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                سرویس‌هایی مانند اسنپ‌پی، دیجی‌پی یا تارا را به همراه درصد کارمزد تعریف کنید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {creditProviders.map((cp) => {
                const clinicShare = Math.max(
                  0,
                  Number((cp.commissionPercent - cp.clientFeePercent).toFixed(2))
                );
                return (
                  <div
                    key={cp.id}
                    className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground">{cp.title}</h3>
                        <Badge
                          variant={cp.isActive ? "default" : "secondary"}
                          className="gap-1 text-[11px]"
                        >
                          {cp.isActive ? (
                            <>
                              <CheckCircle2 className="size-3" />
                              فعال
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3" />
                              غیرفعال
                            </>
                          )}
                        </Badge>
                      </div>

                      <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            کل کارمزد سرویس اعتباری:
                          </span>
                          <strong dir="ltr">{cp.commissionPercent}%</strong>
                        </div>
                        <div className="flex justify-between text-primary">
                          <span>سهم کارمزد دریافتی از مراجع:</span>
                          <strong dir="ltr">+{cp.clientFeePercent}%</strong>
                        </div>
                        <div className="flex justify-between border-t pt-1.5 text-muted-foreground">
                          <span>سهم کارمزد تقبل‌شده کلینیک:</span>
                          <span dir="ltr">{clinicShare}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-1.5 border-t pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => openCreditModal(cp)}
                      >
                        <Pencil className="ml-1 size-3.5" />
                        ویرایش
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          if (
                            !window.confirm(
                              `آیا از حذف «${cp.title}» مطمئن هستید؟`
                            )
                          )
                            return;
                          startTransition(async () => {
                            const res = await deleteCreditProviderAction(cp.id);
                            if (!res.success) toast.error(res.error);
                            else {
                              toast.success(
                                res.message || "سرویس اعتباری حذف شد."
                              );
                              router.refresh();
                            }
                          });
                        }}
                      >
                        <Trash2 className="ml-1 size-3.5" />
                        حذف
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* تب ۲: حساب‌های بانکی */}
        <TabsContent value="banks" className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div>
              <h2 className="text-sm font-bold">حساب‌های بانکی کلینیک</h2>
              <p className="text-xs text-muted-foreground">
                حساب‌های بانکی جهت اتصال به دستگاه‌های کارت‌خوان و واریز کارت‌به‌کارت
              </p>
            </div>
            <Button size="sm" onClick={() => openBankModal()}>
              <Plus className="ml-1.5 size-4" />
              افزودن حساب بانکی
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map((bank) => (
              <div
                key={bank.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-2xs"
              >
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{bank.bankName}</span>
                    <Badge variant={bank.isActive ? "default" : "secondary"}>
                      {bank.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    صاحب حساب:{" "}
                    <strong className="text-foreground">{bank.ownerName}</strong>
                  </div>
                  <div className="text-muted-foreground">
                    شماره حساب:{" "}
                    <span dir="ltr" className="font-mono text-foreground">
                      {bank.accountNumber}
                    </span>
                  </div>
                  {bank.cardNumber && (
                    <div className="text-muted-foreground">
                      شماره کارت:{" "}
                      <span dir="ltr" className="font-mono text-foreground">
                        {bank.cardNumber}
                      </span>
                    </div>
                  )}
                  {bank.iban && (
                    <div className="text-muted-foreground">
                      شبا:{" "}
                      <span
                        dir="ltr"
                        className="font-mono text-[11px] text-foreground"
                      >
                        {bank.iban}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-1.5 border-t pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => openBankModal(bank)}
                  >
                    <Pencil className="ml-1 size-3.5" />
                    ویرایش
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive"
                    onClick={() => {
                      if (!window.confirm("حذف این حساب بانکی؟")) return;
                      startTransition(async () => {
                        const res = await deleteBankAccountAction(bank.id);
                        if (!res.success) toast.error(res.error);
                        else {
                          toast.success("حساب بانکی حذف شد.");
                          router.refresh();
                        }
                      });
                    }}
                  >
                    <Trash2 className="ml-1 size-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* تب ۳: دستگاه‌های کارت‌خوان */}
        <TabsContent value="terminals" className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div>
              <h2 className="text-sm font-bold">دستگاه‌های کارت‌خوان (POS)</h2>
              <p className="text-xs text-muted-foreground">
                تعریف دستگاه‌های پوز متصل به حساب‌های بانکی برای ثبت دقیق واریزی‌ها
              </p>
            </div>
            <Button size="sm" onClick={() => openPosModal()}>
              <Plus className="ml-1.5 size-4" />
              افزودن کارت‌خوان
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {terminals.map((pos) => (
              <div
                key={pos.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-2xs"
              >
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{pos.name}</span>
                    <Badge variant={pos.isActive ? "default" : "secondary"}>
                      {pos.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    حساب متصل:{" "}
                    <strong className="text-foreground">{pos.bankName}</strong>
                  </div>
                  {pos.terminalCode && (
                    <div className="text-muted-foreground">
                      کد ترمینال:{" "}
                      <span dir="ltr" className="font-mono text-foreground">
                        {pos.terminalCode}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-1.5 border-t pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => openPosModal(pos)}
                  >
                    <Pencil className="ml-1 size-3.5" />
                    ویرایش
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive"
                    onClick={() => {
                      if (!window.confirm("حذف این دستگاه کارت‌خوان؟")) return;
                      startTransition(async () => {
                        const res = await deletePaymentTerminalAction(pos.id);
                        if (!res.success) toast.error(res.error);
                        else {
                          toast.success(res.message || "دستگاه حذف شد.");
                          router.refresh();
                        }
                      });
                    }}
                  >
                    <Trash2 className="ml-1 size-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================== */}
      {/* مودال افزودن/ویرایش سرویس اعتباری */}
      {/* ========================================== */}
      <ResponsiveDialog
        open={creditModalOpen}
        onOpenChange={setCreditModalOpen}
        drawerPosition="bottom"
      >
        <ResponsiveDialogTrigger
          aria-hidden="true"
          className="sr-only"
          tabIndex={-1}
        />
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editingCredit
                ? "ویرایش سرویس اعتباری"
                : "تعریف سرویس اعتباری جدید"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              درصد کارمزد کل سرویس و درصدی که از مراجع دریافت می‌شود را مشخص کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSaveCredit} className="contents">
            <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto pt-2">
              <div className="px-5 pb-2">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="cp-title">
                      نام سرویس اعتباری *
                    </FieldLabel>
                    <Input
                      id="cp-title"
                      placeholder="مثلاً: اسنپ‌پی، دیجی‌پی، تارا..."
                      value={cpTitle}
                      onChange={(e) => setCpTitle(e.target.value)}
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="cp-commission">
                        درصد کل کارمزد سرویس (%)
                      </FieldLabel>
                      <Input
                        id="cp-commission"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        dir="ltr"
                        value={cpCommission}
                        onChange={(e) => setCpCommission(e.target.value)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="cp-client-fee">
                        درصد دریافتی از مراجع (%)
                      </FieldLabel>
                      <Input
                        id="cp-client-fee"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        dir="ltr"
                        value={cpClientFee}
                        onChange={(e) => setCpClientFee(e.target.value)}
                      />
                    </Field>
                  </div>

                  <FieldDescription className="rounded-lg bg-muted/60 p-3 text-xs">
                    مثال: اگر مانده فاکتور مراجع <strong>۱۰,۰۰۰,۰۰۰ تومان</strong> باشد و درصد دریافتی از مراجع{" "}
                    <strong>{parseFloat(cpClientFee) || 0}%</strong> باشد، مبلغ{" "}
                    <strong className="text-foreground">
                      {Math.round(
                        (10_000_000 * (parseFloat(cpClientFee) || 0)) / 100
                      ).toLocaleString("fa-IR")}{" "}
                      تومان
                    </strong>{" "}
                    به صورت خودکار به فاکتور اضافه می‌شود.
                  </FieldDescription>

                  <Field
                    orientation="horizontal"
                    className="justify-between rounded-lg border p-3"
                  >
                    <FieldContent>
                      <FieldLabel
                        htmlFor="cp-active"
                        className="cursor-pointer text-xs font-medium"
                      >
                        سرویس فعال باشد
                      </FieldLabel>
                      <FieldDescription className="text-[11px]">
                        در ویزارد صدور فاکتور نمایش داده شود
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="cp-active"
                      checked={cpActive}
                      onCheckedChange={setCpActive}
                    />
                  </Field>
                </FieldGroup>
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter className="gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                {isPending ? "در حال ذخیره..." : "ذخیره سرویس"}
              </Button>
              <ResponsiveDialogDesktopOnly>
                <ResponsiveDialogClose
                  render={
                    <Button type="button" variant="outline">
                      انصراف
                    </Button>
                  }
                />
              </ResponsiveDialogDesktopOnly>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ========================================== */}
      {/* مودال حساب بانکی */}
      {/* ========================================== */}
      <ResponsiveDialog
        open={bankModalOpen}
        onOpenChange={setBankModalOpen}
        drawerPosition="bottom"
      >
        <ResponsiveDialogTrigger
          aria-hidden="true"
          className="sr-only"
          tabIndex={-1}
        />
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editingBank ? "ویرایش حساب بانکی" : "افزودن حساب بانکی"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              اطلاعات حساب بانکی کلینیک را برای اتصال به کارت‌خوان یا کارت‌به‌کارت وارد کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSaveBank} className="contents">
            <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto pt-2">
              <div className="px-5 pb-2">
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="bank-name">نام بانک *</FieldLabel>
                      <Input
                        id="bank-name"
                        placeholder="مثلاً: بانک ملت"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="bank-owner">
                        نام صاحب حساب *
                      </FieldLabel>
                      <Input
                        id="bank-owner"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        required
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="bank-account-number">
                      شماره حساب *
                    </FieldLabel>
                    <Input
                      id="bank-account-number"
                      dir="ltr"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="bank-card-number">
                      شماره کارت (اختیاری)
                    </FieldLabel>
                    <Input
                      id="bank-card-number"
                      dir="ltr"
                      maxLength={19}
                      placeholder="6037-9975-..."
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="bank-iban">
                      شماره شبا (اختیاری)
                    </FieldLabel>
                    <Input
                      id="bank-iban"
                      dir="ltr"
                      placeholder="IR..."
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                    />
                  </Field>

                  <Field
                    orientation="horizontal"
                    className="justify-between rounded-lg border p-3"
                  >
                    <FieldContent>
                      <FieldLabel
                        htmlFor="bank-active"
                        className="cursor-pointer text-xs font-medium"
                      >
                        حساب فعال باشد
                      </FieldLabel>
                      <FieldDescription className="text-[11px]">
                        امکان انتخاب در واریزهای کارت‌به‌کارت
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="bank-active"
                      checked={bankActive}
                      onCheckedChange={setBankActive}
                    />
                  </Field>
                </FieldGroup>
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter className="gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                {isPending ? "در حال ذخیره..." : "ذخیره حساب بانکی"}
              </Button>
              <ResponsiveDialogDesktopOnly>
                <ResponsiveDialogClose
                  render={
                    <Button type="button" variant="outline">
                      انصراف
                    </Button>
                  }
                />
              </ResponsiveDialogDesktopOnly>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ========================================== */}
      {/* مودال دستگاه کارت‌خوان */}
      {/* ========================================== */}
      <ResponsiveDialog
        open={posModalOpen}
        onOpenChange={setPosModalOpen}
        drawerPosition="bottom"
      >
        <ResponsiveDialogTrigger
          aria-hidden="true"
          className="sr-only"
          tabIndex={-1}
        />
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editingPos ? "ویرایش کارت‌خوان" : "افزودن دستگاه کارت‌خوان"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              مشخصات دستگاه کارت‌خوان و حساب بانکی متصل به آن را تعیین کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSavePos} className="contents">
            <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto pt-2">
              <div className="px-5 pb-2">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="pos-name">
                      عنوان دستگاه کارت‌خوان *
                    </FieldLabel>
                    <Input
                      id="pos-name"
                      placeholder="مثلاً: کارت‌خوان پذیرش ۱"
                      value={posName}
                      onChange={(e) => setPosName(e.target.value)}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="pos-bank">
                      حساب بانکی متصل *
                    </FieldLabel>
                    <Select
                      value={posBankId}
                      items={bankAccounts.map((b) => ({
                        value: b.id,
                        label: `${b.bankName} (${b.ownerName})`,
                      }))}
                      onValueChange={(v) => setPosBankId(v || "")}
                    >
                      <SelectTrigger id="pos-bank" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.bankName} ({b.ownerName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="pos-type">نوع دستگاه</FieldLabel>
                      <Select
                        value={posType}
                        items={TERMINAL_TYPE_OPTIONS}
                        onValueChange={(v) => setPosType(v || "POS")}
                      >
                        <SelectTrigger id="pos-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TERMINAL_TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="pos-code">
                        شماره ترمینال (اختیاری)
                      </FieldLabel>
                      <Input
                        id="pos-code"
                        dir="ltr"
                        value={posCode}
                        onChange={(e) => setPosCode(e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field
                    orientation="horizontal"
                    className="justify-between rounded-lg border p-3"
                  >
                    <FieldContent>
                      <FieldLabel
                        htmlFor="pos-active"
                        className="cursor-pointer text-xs font-medium"
                      >
                        دستگاه فعال باشد
                      </FieldLabel>
                      <FieldDescription className="text-[11px]">
                        در فرم تسویه و صدور فاکتور نمایش داده شود
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="pos-active"
                      checked={posActive}
                      onCheckedChange={setPosActive}
                    />
                  </Field>
                </FieldGroup>
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter className="gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                {isPending ? "در حال ذخیره..." : "ذخیره کارت‌خوان"}
              </Button>
              <ResponsiveDialogDesktopOnly>
                <ResponsiveDialogClose
                  render={
                    <Button type="button" variant="outline">
                      انصراف
                    </Button>
                  }
                />
              </ResponsiveDialogDesktopOnly>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}