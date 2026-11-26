// components/clinic-dashboard/panel-settings/numbering-settings-section.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Hash, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { saveNumberingSettingsAction } from "@/app/clinic-dashboard/(dashboard)/settings/panel/actions";

interface NumberingSettingsSectionProps {
  initialData: {
    fileNumberAutoEnabled: boolean;
    fileNumberStartFrom: number;
    invoiceNumberAutoEnabled: boolean;
    invoiceNumberStartFrom: number;
  };
}

export function NumberingSettingsSection({
  initialData,
}: NumberingSettingsSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const [fileAuto, setFileAuto] = React.useState(
    initialData.fileNumberAutoEnabled
  );
  const [fileStart, setFileStart] = React.useState(
    String(initialData.fileNumberStartFrom || 1001)
  );
  const [invoiceAuto, setInvoiceAuto] = React.useState(
    initialData.invoiceNumberAutoEnabled
  );
  const [invoiceStart, setInvoiceStart] = React.useState(
    String(initialData.invoiceNumberStartFrom || 150001)
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveNumberingSettingsAction({
        fileNumberAutoEnabled: fileAuto,
        fileNumberStartFrom: parseInt(fileStart, 10) || 1001,
        invoiceNumberAutoEnabled: invoiceAuto,
        invoiceNumberStartFrom: parseInt(invoiceStart, 10) || 150001,
      });
      if (!res.success) {
        toast({
          title: "خطا در ذخیره‌سازی",
          description: res.error || "ذخیره تنظیمات شماره‌گذاری ناموفق بود.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "ذخیره انجام شد",
        description: "تنظیمات شماره پرونده و شماره فاکتور با موفقیت ذخیره شد.",
      });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border bg-card p-5 shadow-2xs"
    >
      <div className="flex items-center gap-2">
        <Hash className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-bold">
            تنظیمات شماره پرونده و شماره فاکتور
          </h2>
          <p className="text-xs text-muted-foreground">
            تعیین فعال بودن شماره‌گذاری خودکار و عدد شروع برای پرونده مراجعین و فاکتورها
          </p>
        </div>
      </div>

      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold">شماره‌گذاری خودکار پرونده</div>
                <FieldDescription className="text-[11px]">
                  در صورت غیرفعال بودن، پرونده بدون شماره خودکار ثبت می‌شود
                </FieldDescription>
              </div>
              <Switch
                checked={fileAuto}
                onCheckedChange={(v) => setFileAuto(Boolean(v))}
              />
            </div>

            <Field>
              <FieldLabel className="text-xs">شماره شروع پرونده</FieldLabel>
              <Input
                dir="ltr"
                type="number"
                min={1}
                disabled={!fileAuto}
                value={fileStart}
                onChange={(e) => setFileStart(e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold">شماره‌گذاری خودکار فاکتور</div>
                <FieldDescription className="text-[11px]">
                  تعیین فعال بودن و شماره شروع فاکتورهای صادرشده
                </FieldDescription>
              </div>
              <Switch
                checked={invoiceAuto}
                onCheckedChange={(v) => setInvoiceAuto(Boolean(v))}
              />
            </div>

            <Field>
              <FieldLabel className="text-xs">شماره شروع فاکتور</FieldLabel>
              <Input
                dir="ltr"
                type="number"
                min={1}
                disabled={!invoiceAuto}
                value={invoiceStart}
                onChange={(e) => setInvoiceStart(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </FieldGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Save className="ml-1.5 size-4" />
          {isPending ? "در حال ذخیره..." : "ذخیره تنظیمات شماره‌گذاری"}
        </Button>
      </div>
    </form>
  );
}
