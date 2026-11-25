// components/clinic-dashboard/accounting/payouts-debts-client.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { PriceInput } from "@/components/ui/price-input";
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogPanel,
  ResponsiveDialogDesktopOnly,
} from "@/components/ui/responsive-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createLedgerEntryAction,
  deleteLedgerEntryAction,
  createAccountingDescriptionAction,
} from "@/app/clinic-dashboard/(dashboard)/accounting/actions";
import {
  AccountingStatCard,
  CollapsibleFilterPanel,
  formatJalaliShort,
  formatTimeShort,
  formatToman,
  getTodayDate,
} from "./accounting-shared";

export interface LedgerEntryRow {
  id: string;
  entryDateIso: string;
  operatorName: string;
  beneficiaryId: string;
  beneficiaryName: string;
  serviceId: string;
  serviceTitle: string;
  therapistId: string;
  therapistName: string;
  clientId: string | null;
  clientName: string;
  paymentMethod: string;
  descriptionText: string;
  amount: number;
  notes: string;
  createdById: string;
}

interface SelectOption {
  value: string;
  label: string;
}

export function PayoutsDebtsClient({
  mode,
  title,
  subtitle,
  rows,
  beneficiaries,
  services,
  therapists,
  operators,
  clients,
  descriptions: initialDescriptions,
}: {
  mode: "PAYOUT" | "DEBT";
  title: string;
  subtitle: string;
  rows: LedgerEntryRow[];
  beneficiaries: SelectOption[];
  services: SelectOption[];
  therapists: SelectOption[];
  operators: SelectOption[];
  clients: SelectOption[];
  descriptions: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fromDate, setFromDate] = useState<Date | null>(() => getTodayDate());
  const [toDate, setToDate] = useState<Date | null>(() => getTodayDate());
  const [serviceId, setServiceId] = useState("ALL");
  const [therapistId, setTherapistId] = useState("ALL");
  const [clientId, setClientId] = useState("ALL");
  const [beneficiaryId, setBeneficiaryId] = useState("ALL");
  const [operatorId, setOperatorId] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [descriptionFilter, setDescriptionFilter] = useState("ALL");

  const [descriptions, setDescriptions] = useState(initialDescriptions);
  const [newDescInput, setNewDescInput] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formBeneficiaryId, setFormBeneficiaryId] = useState(
    beneficiaries[0]?.value || "NONE"
  );
  const [formDescription, setFormDescription] = useState(
    initialDescriptions[0]?.title || ""
  );
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formPaymentMethod, setFormPaymentMethod] = useState("CASH");
  const [formDate, setFormDate] = useState<Date | null>(() => getTodayDate());
  const [formNotes, setFormNotes] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const dt = new Date(r.entryDateIso);
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
      if (beneficiaryId !== "ALL" && r.beneficiaryId !== beneficiaryId)
        return false;
      if (operatorId !== "ALL" && r.createdById !== operatorId) return false;
      if (paymentMethod !== "ALL" && r.paymentMethod !== paymentMethod)
        return false;
      if (
        descriptionFilter !== "ALL" &&
        r.descriptionText !== descriptionFilter
      )
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
    beneficiaryId,
    operatorId,
    paymentMethod,
    descriptionFilter,
  ]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, r) => sum + r.amount, 0),
    [filtered]
  );

  async function handleQuickAddDescription() {
    if (!newDescInput.trim()) return;
    const res = await createAccountingDescriptionAction({
      scope: mode,
      title: newDescInput.trim(),
    });
    if (!res.success) {
      toast.error(res.error || "خطا در ثبت شرح");
      return;
    }
    const createdTitle = newDescInput.trim();
    setDescriptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: createdTitle },
    ]);
    setFormDescription(createdTitle);
    setNewDescInput("");
    toast.success("شرح جدید اضافه شد.");
  }

  function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createLedgerEntryAction({
        entryType: mode,
        beneficiaryId: formBeneficiaryId === "NONE" ? null : formBeneficiaryId,
        descriptionText: formDescription,
        amount: formAmount,
        paymentMethod: mode === "PAYOUT" ? formPaymentMethod : null,
        notes: formNotes,
        entryDate: formDate ? formDate.toISOString() : new Date().toISOString(),
      });

      if (!res.success) {
        toast.error(res.error || "خطا در ثبت");
        return;
      }

      toast.success(`${title} با موفقیت ثبت شد.`);
      setModalOpen(false);
      setFormAmount(0);
      setFormNotes("");
      router.refresh();
    });
  }

  function handleDeleteEntry(id: string) {
    startTransition(async () => {
      const res = await deleteLedgerEntryAction(id);
      if (!res.success) {
        toast.error(res.error || "خطا در حذف");
        return;
      }
      toast.success("رکورد حذف شد.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const today = getTodayDate();
              setFromDate(today);
              setToDate(today);
            }}
          >
            <RotateCcw className="ml-1 size-3.5" />
            امروز
          </Button>
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus className="ml-1.5 size-4" />
            ثبت {mode === "PAYOUT" ? "پرداختی جدید" : "بدهی جدید"}
          </Button>
        </div>
      </div>

      <CollapsibleFilterPanel
        resetLabel="نمایش همه تاریخ‌ها"
        onReset={() => {
          setFromDate(null);
          setToDate(null);
          setServiceId("ALL");
          setTherapistId("ALL");
          setClientId("ALL");
          setBeneficiaryId("ALL");
          setOperatorId("ALL");
          setPaymentMethod("ALL");
          setDescriptionFilter("ALL");
        }}
      >
        <FieldGroup>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                items={[{ value: "ALL", label: "همه خدمات" }, ...services]}
                onValueChange={(v) => setServiceId(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه خدمات</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel className="text-xs">ذی‌نفع</FieldLabel>
              <Select
                value={beneficiaryId}
                items={[{ value: "ALL", label: "همه ذی‌نفعان" }, ...beneficiaries]}
                onValueChange={(v) => setBeneficiaryId(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه ذی‌نفعان</SelectItem>
                  {beneficiaries.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="text-xs">شرح</FieldLabel>
              <Select
                value={descriptionFilter}
                items={[
                  { value: "ALL", label: "همه شرح‌ها" },
                  ...descriptions.map((d) => ({ value: d.title, label: d.title })),
                ]}
                onValueChange={(v) => setDescriptionFilter(v || "ALL")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه شرح‌ها</SelectItem>
                  {descriptions.map((d) => (
                    <SelectItem key={d.id} value={d.title}>{d.title}</SelectItem>
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
            {mode === "PAYOUT" && (
              <Field>
                <FieldLabel className="text-xs">روش پرداخت</FieldLabel>
                <Select
                  value={paymentMethod}
                  items={[
                    { value: "ALL", label: "همه" },
                    { value: "CASH", label: "نقدی" },
                    { value: "POS", label: "کارت‌خوان" },
                    { value: "CARD_TO_CARD", label: "کارت به کارت" },
                  ]}
                  onValueChange={(v) => setPaymentMethod(v || "ALL")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">همه</SelectItem>
                    <SelectItem value="CASH">نقدی</SelectItem>
                    <SelectItem value="POS">کارت‌خوان</SelectItem>
                    <SelectItem value="CARD_TO_CARD">کارت به کارت</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
        </FieldGroup>
      </CollapsibleFilterPanel>

      <div className="grid grid-cols-2 gap-3">
        <AccountingStatCard
          title={mode === "PAYOUT" ? "مجموع پرداختی" : "مجموع بدهی"}
          amount={totalAmount}
          icon={<Wallet className="size-4" />}
          tone={mode === "PAYOUT" ? "rose" : "amber"}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="whitespace-nowrap bg-muted/50 text-xs">
              <TableHead className="text-right">ردیف</TableHead>
              <TableHead className="text-right">تاریخ</TableHead>
              <TableHead className="text-right">ساعت</TableHead>
              <TableHead className="text-right">کاربر سیستم</TableHead>
              <TableHead className="text-right">ذی‌نفع</TableHead>
              <TableHead className="text-right">شرح</TableHead>
              <TableHead className="text-right">مبلغ (تومان)</TableHead>
              <TableHead className="text-right">توضیحات</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  داده‌ای وجود ندارد
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r, idx) => (
                <TableRow
                  key={r.id}
                  onClick={() => {
                    if (r.clientId) {
                      router.push(`/clinic-dashboard/clients/${r.clientId}`);
                    }
                  }}
                  className={`whitespace-nowrap text-xs ${
                    r.clientId ? "cursor-pointer hover:bg-primary/5" : ""
                  }`}
                >
                  <TableCell>{(idx + 1).toLocaleString("fa-IR")}</TableCell>
                  <TableCell>{formatJalaliShort(r.entryDateIso)}</TableCell>
                  <TableCell>{formatTimeShort(r.entryDateIso)}</TableCell>
                  <TableCell>{r.operatorName}</TableCell>
                  <TableCell className="font-semibold">{r.beneficiaryName}</TableCell>
                  <TableCell>{r.descriptionText}</TableCell>
                  <TableCell className="font-bold">{formatToman(r.amount)}</TableCell>
                  <TableCell className="max-w-48 truncate">{r.notes}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      disabled={isPending}
                      onClick={() => handleDeleteEntry(r.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ResponsiveDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        drawerPosition="bottom"
      >
        <ResponsiveDialogTrigger className="sr-only" tabIndex={-1} aria-hidden="true" />
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              ثبت {mode === "PAYOUT" ? "پرداختی به ذی‌نفع" : "بدهی به ذی‌نفع"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              ذی‌نفع، شرح و مبلغ را وارد کنید (در صورت نبودن شرح، می‌توانید همین‌جا شرح جدید اضافه کنید).
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSaveEntry} className="contents">
            <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto pt-2">
              <div className="px-5">
                <FieldGroup>
                  <Field>
                    <FieldLabel>ذی‌نفع</FieldLabel>
                    <Select
                      value={formBeneficiaryId}
                      items={[{ value: "NONE", label: "انتخاب ذی‌نفع..." }, ...beneficiaries]}
                      onValueChange={(v) => setFormBeneficiaryId(v || "NONE")}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">انتخاب ذی‌نفع...</SelectItem>
                        {beneficiaries.map((b) => (
                          <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel>شرح</FieldLabel>
                    <Input
                      placeholder="شرح پرداخت یا بدهی..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                    <div className="mt-1.5 flex gap-1.5">
                      <Input
                        className="h-8 text-xs"
                        placeholder="افزودن شرح جدید به لیست..."
                        value={newDescInput}
                        onChange={(e) => setNewDescInput(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 text-xs"
                        onClick={handleQuickAddDescription}
                      >
                        افزودن شرح
                      </Button>
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>مبلغ (تومان) *</FieldLabel>
                    <PriceInput
                      locale="fa-IR"
                      value={formAmount}
                      onValueChange={(v) => setFormAmount(v || 0)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>تاریخ ثبت</FieldLabel>
                    <DatePicker calendarType="shamsi" value={formDate} onValueChange={setFormDate} />
                  </Field>

                  {mode === "PAYOUT" && (
                    <Field>
                      <FieldLabel>روش پرداخت</FieldLabel>
                      <Select
                        value={formPaymentMethod}
                        items={[
                          { value: "CASH", label: "نقدی" },
                          { value: "POS", label: "کارت‌خوان" },
                          { value: "CARD_TO_CARD", label: "کارت به کارت" },
                        ]}
                        onValueChange={(v) => setFormPaymentMethod(v || "CASH")}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">نقدی</SelectItem>
                          <SelectItem value="POS">کارت‌خوان</SelectItem>
                          <SelectItem value="CARD_TO_CARD">کارت به کارت</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}

                  <Field>
                    <FieldLabel>توضیحات</FieldLabel>
                    <Textarea
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter>
              <ResponsiveDialogDesktopOnly>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  انصراف
                </Button>
              </ResponsiveDialogDesktopOnly>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? "در حال ثبت..." : "ثبت"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
