// components/clinic-dashboard/accounting/accounting-settings-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  upsertBeneficiaryAction,
  deleteBeneficiaryAction,
  createAccountingDescriptionAction,
  deleteAccountingDescriptionAction,
  saveTaxSettingsAction,
} from "@/app/clinic-dashboard/(dashboard)/accounting/actions";

interface BeneficiaryItem {
  id: string;
  fullName: string;
  phone: string | null;
  notes: string | null;
}

interface DescriptionItem {
  id: string;
  scope: "PAYOUT" | "RECEIVE" | "DEBT";
  title: string;
}

export function AccountingSettingsClient({
  initialVatPercent,
  beneficiaries: initialBeneficiaries,
  descriptions: initialDescriptions,
  services: initialServices,
}: {
  initialVatPercent: number;
  beneficiaries: BeneficiaryItem[];
  descriptions: DescriptionItem[];
  services: { id: string; title: string; taxEnabled: boolean }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // تب ذی‌نفع
  const [beneficiaries, setBeneficiaries] = useState(initialBeneficiaries);
  const [benName, setBenName] = useState("");
  const [benPhone, setBenPhone] = useState("");

  // تب‌های شرح پرداختی و شرح دریافتی
  const [descriptions, setDescriptions] = useState(initialDescriptions);
  const [payoutDescInput, setPayoutDescInput] = useState("");
  const [receiveDescInput, setReceiveDescInput] = useState("");

  // تب مالیات بر ارزش افزوده
  const [vatPercent, setVatPercent] = useState(String(initialVatPercent ?? 0));
  const [taxServices, setTaxServices] = useState(initialServices);

  function handleAddBeneficiary(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertBeneficiaryAction({
        fullName: benName,
        phone: benPhone,
      });
      if (!res.success) {
        toast.error(res.error || "خطا در ثبت ذی‌نفع");
        return;
      }
      setBeneficiaries((prev) => [
        {
          id: crypto.randomUUID(),
          fullName: benName.trim(),
          phone: benPhone.trim() || null,
          notes: null,
        },
        ...prev,
      ]);
      setBenName("");
      setBenPhone("");
      toast.success("ذی‌نفع ثبت شد.");
      router.refresh();
    });
  }

  function handleAddDesc(scope: "PAYOUT" | "RECEIVE") {
    const text = scope === "PAYOUT" ? payoutDescInput : receiveDescInput;
    if (!text.trim()) return;

    startTransition(async () => {
      const res = await createAccountingDescriptionAction({
        scope,
        title: text.trim(),
      });
      if (!res.success) {
        toast.error(res.error || "خطا در افزودن شرح");
        return;
      }
      setDescriptions((prev) => [
        ...prev,
        { id: crypto.randomUUID(), scope, title: text.trim() },
      ]);
      if (scope === "PAYOUT") setPayoutDescInput("");
      else setReceiveDescInput("");
      toast.success("شرح ذخیره شد.");
      router.refresh();
    });
  }

  function handleSaveTax(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveTaxSettingsAction({
        vatPercent: parseFloat(vatPercent) || 0,
        taxEnabledServiceIds: taxServices.filter((s) => s.taxEnabled).map((s) => s.id),
      });
      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره مالیات");
        return;
      }
      toast.success("تنظیمات مالیات ذخیره شد.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">تنظیمات حسابداری</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          مدیریت ذی‌نفعان، شرح پرداختی و دریافتی و مالیات بر ارزش افزوده خدمات
        </p>
      </div>

      <Tabs defaultValue="beneficiary" dir="rtl" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 [&_[data-slot=tabs-indicator]]:hidden">
          <TabsTrigger
            value="beneficiary"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            ذی‌نفع
          </TabsTrigger>
          <TabsTrigger
            value="payout-desc"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            شرح پرداختی
          </TabsTrigger>
          <TabsTrigger
            value="receive-desc"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            شرح دریافتی
          </TabsTrigger>
          <TabsTrigger
            value="tax"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            مالیات بر ارزش افزوده
          </TabsTrigger>
        </TabsList>

        {/* تب ذی‌نفع */}
        <TabsContent value="beneficiary" className="space-y-4">
          <form
            onSubmit={handleAddBeneficiary}
            className="rounded-xl border bg-card p-4 shadow-2xs"
          >
            <FieldGroup>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel className="text-xs">نام ذی‌نفع *</FieldLabel>
                  <Input
                    required
                    placeholder="نام و نام خانوادگی یا مرکز"
                    value={benName}
                    onChange={(e) => setBenName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">شماره تماس</FieldLabel>
                  <Input
                    dir="ltr"
                    placeholder="09123456789"
                    value={benPhone}
                    onChange={(e) => setBenPhone(e.target.value)}
                  />
                </Field>
                <div className="flex items-end">
                  <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                    <Plus className="ml-1.5 size-4" />
                    افزودن ذی‌نفع
                  </Button>
                </div>
              </div>
            </FieldGroup>
          </form>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-xs">
                  <TableHead className="text-right">ردیف</TableHead>
                  <TableHead className="text-right">نام ذی‌نفع</TableHead>
                  <TableHead className="text-right">شماره تماس</TableHead>
                  <TableHead className="text-right">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beneficiaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                      شخصی وجود ندارد
                    </TableCell>
                  </TableRow>
                ) : (
                  beneficiaries.map((b, i) => (
                    <TableRow key={b.id} className="text-xs">
                      <TableCell>{(i + 1).toLocaleString("fa-IR")}</TableCell>
                      <TableCell className="font-semibold">{b.fullName}</TableCell>
                      <TableCell dir="ltr">{b.phone || "—"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() => {
                            startTransition(async () => {
                              await deleteBeneficiaryAction(b.id);
                              setBeneficiaries((prev) => prev.filter((x) => x.id !== b.id));
                              toast.success("حذف شد.");
                            });
                          }}
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
        </TabsContent>

        {/* تب شرح پرداختی */}
        <TabsContent value="payout-desc" className="space-y-4">
          <div className="flex gap-2 rounded-xl border bg-card p-4">
            <Input
              placeholder="شرح جدید پرداختی (مثلاً: اجاره، خرید مواد، حقوق)..."
              value={payoutDescInput}
              onChange={(e) => setPayoutDescInput(e.target.value)}
            />
            <Button type="button" onClick={() => handleAddDesc("PAYOUT")} disabled={isPending}>
              <Plus className="ml-1 size-4" />
              افزودن
            </Button>
          </div>
          <div className="divide-y rounded-xl border bg-card">
            {descriptions
              .filter((d) => d.scope === "PAYOUT")
              .map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span>{d.title}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => {
                      startTransition(async () => {
                        await deleteAccountingDescriptionAction(d.id);
                        setDescriptions((prev) => prev.filter((x) => x.id !== d.id));
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* تب شرح دریافتی */}
        <TabsContent value="receive-desc" className="space-y-4">
          <div className="flex gap-2 rounded-xl border bg-card p-4">
            <Input
              placeholder="شرح جدید دریافتی..."
              value={receiveDescInput}
              onChange={(e) => setReceiveDescInput(e.target.value)}
            />
            <Button type="button" onClick={() => handleAddDesc("RECEIVE")} disabled={isPending}>
              <Plus className="ml-1 size-4" />
              افزودن
            </Button>
          </div>
          <div className="divide-y rounded-xl border bg-card">
            {descriptions
              .filter((d) => d.scope === "RECEIVE")
              .map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span>{d.title}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => {
                      startTransition(async () => {
                        await deleteAccountingDescriptionAction(d.id);
                        setDescriptions((prev) => prev.filter((x) => x.id !== d.id));
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* تب مالیات بر ارزش افزوده */}
        <TabsContent value="tax">
          <form onSubmit={handleSaveTax} className="space-y-5 rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-end gap-4">
              <Field className="w-48">
                <FieldLabel>درصد مالیات</FieldLabel>
                <Input
                  dir="ltr"
                  type="number"
                  step="0.5"
                  value={vatPercent}
                  onChange={(e) => setVatPercent(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={isPending}>
                <Save className="ml-1.5 size-4" />
                ذخیره
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-muted-foreground">
                تنظیمات مالیات خدمات
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {taxServices.map((srv) => (
                  <div
                    key={srv.id}
                    className="flex items-center justify-between rounded-xl border bg-muted/20 px-3.5 py-2.5 text-xs"
                  >
                    <span className="font-medium">{srv.title}</span>
                    <Switch
                      checked={srv.taxEnabled}
                      onCheckedChange={(checked) =>
                        setTaxServices((prev) =>
                          prev.map((item) =>
                            item.id === srv.id
                              ? { ...item, taxEnabled: Boolean(checked) }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
