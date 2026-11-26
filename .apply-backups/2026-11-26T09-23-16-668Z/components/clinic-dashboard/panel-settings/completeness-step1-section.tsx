// components/clinic-dashboard/panel-settings/completeness-step1-section.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { saveFileCompletenessConfigAction } from "@/app/clinic-dashboard/(dashboard)/settings/panel/actions";

interface CompletenessRuleItem {
  key: string;
  label: string;
  description: string;
}

const STEP1_RULES: CompletenessRuleItem[] = [
  {
    key: "requirePhone",
    label: "شماره تماس معتبر",
    description: "پرونده بدون شماره موبایل واقعی ناقص محسوب شود",
  },
  {
    key: "requireNationalId",
    label: "کد ملی ۱۰ رقمی",
    description: "پرونده فاقد کد ملی ناقص محسوب شود",
  },
  {
    key: "requireGender",
    label: "جنسیت مراجع",
    description: "تعیین جنسیت برای تکمیل پرونده الزامی باشد",
  },
  {
    key: "requireBirthDate",
    label: "تاریخ تولد",
    description: "ثبت تاریخ تولد برای تکمیل پرونده الزامی باشد",
  },
  {
    key: "requireAddress",
    label: "آدرس و اطلاعات تکمیلی",
    description: "ثبت آدرس در اطلاعات تکمیلی برای تکمیل پرونده الزامی باشد",
  },
  {
    key: "requireAtLeastOneService",
    label: "ثبت حداقل یک سرویس یا نوبت",
    description: "پرونده بدون هیچ خدمت یا نوبت ثبت‌شده در وضعیت ناقص قرار گیرد",
  },
];

export function CompletenessStep1Section({
  initialConfig,
}: {
  initialConfig: Record<string, unknown>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const [rules, setRules] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const r of STEP1_RULES) {
      initial[r.key] = Boolean(initialConfig[r.key]);
    }
    return initial;
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveFileCompletenessConfigAction({
        ...initialConfig,
        ...rules,
      });
      if (!res.success) {
        toast({
          title: "خطا در ذخیره‌سازی",
          description: res.error || "ذخیره تنظیمات تکمیل پرونده ناموفق بود.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "ذخیره انجام شد",
        description: "تنظیمات تکمیل / ناقص بودن پرونده با موفقیت ذخیره شد.",
      });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSave}
      className="space-y-5 rounded-2xl border bg-card p-5 shadow-2xs"
    >
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-bold">
            تنظیمات نحوه تکمیل یا ناقص بودن پرونده (گام اول)
          </h2>
          <p className="text-xs text-muted-foreground">
            موارد زیر را گام‌به‌گام تکمیل می‌کنیم تا دقیقاً مشخص شود چه پرونده‌ای «تکمیل» و چه پرونده‌ای «ناقص» است
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STEP1_RULES.map((rule) => (
          <div
            key={rule.key}
            className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 p-3.5"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold">{rule.label}</div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {rule.description}
              </p>
            </div>
            <Switch
              checked={Boolean(rules[rule.key])}
              onCheckedChange={(v) =>
                setRules((prev) => ({ ...prev, [rule.key]: Boolean(v) }))
              }
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Save className="ml-1.5 size-4" />
          {isPending ? "در حال ذخیره..." : "ذخیره معیارهای پرونده"}
        </Button>
      </div>
    </form>
  );
}
