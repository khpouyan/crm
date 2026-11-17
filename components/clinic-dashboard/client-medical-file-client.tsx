// components/clinic-dashboard/client-medical-file-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, HeartPulse, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { updateClientMedicalRecordAction } from "@/app/clinic-dashboard/(dashboard)/clients/actions";

export const MEDICAL_CONDITIONS = [
  { key: "DIABETES", label: "دیابت" },
  { key: "HEART_DISEASE", label: "ناراحتی قلبی" },
  { key: "HYPERTENSION", label: "فشار خون" },
  { key: "THYROID", label: "مشکلات تیروئیدی" },
  { key: "GASTROINTESTINAL", label: "مشکلات گوارشی" },
  { key: "ABDOMINAL_PAIN", label: "دردهای شکمی" },
  { key: "HORMONAL", label: "اختلالات هورمونی" },
  { key: "HIV", label: "HIV" },
  { key: "LIVER", label: "مشکلات کبدی" },
  { key: "ALLERGY", label: "آلرژی" },
  { key: "NEURO_PSYCH", label: "اختلالات عصبی یا روانی" },
  { key: "KIDNEY", label: "مشکلات کلیوی" },
  { key: "BLOOD_LIPIDS", label: "چربی خون" },
  { key: "HEARING_AID", label: "سمعک" },
] as const;

interface ClientMedicalFileClientProps {
  clientId: string;
  initialRecord: {
    conditions: string[];
    surgeryCount: string;
    allergies: string;
    cosmeticHistory: string;
    specialDisease: string;
    medications: string;
    heightCm: string;
    weightKg: string;
    weightGainLastYear: string;
    weightLossLastYear: string;
    notes: string;
  };
  canEdit: boolean;
}

export function ClientMedicalFileClient({
  clientId,
  initialRecord,
  canEdit,
}: ClientMedicalFileClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [conditions, setConditions] = useState<string[]>(
    initialRecord.conditions
  );
  const [surgeryCount, setSurgeryCount] = useState(initialRecord.surgeryCount);
  const [allergies, setAllergies] = useState(initialRecord.allergies);
  const [cosmeticHistory, setCosmeticHistory] = useState(
    initialRecord.cosmeticHistory
  );
  const [specialDisease, setSpecialDisease] = useState(
    initialRecord.specialDisease
  );
  const [medications, setMedications] = useState(initialRecord.medications);
  const [heightCm, setHeightCm] = useState(initialRecord.heightCm);
  const [weightKg, setWeightKg] = useState(initialRecord.weightKg);
  const [weightGainLastYear, setWeightGainLastYear] = useState(
    initialRecord.weightGainLastYear
  );
  const [weightLossLastYear, setWeightLossLastYear] = useState(
    initialRecord.weightLossLastYear
  );
  const [notes, setNotes] = useState(initialRecord.notes);

  function toggleCondition(key: string) {
    setConditions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateClientMedicalRecordAction({
        clientId,
        medicalRecord: {
          conditions,
          surgeryCount: surgeryCount.trim(),
          allergies: allergies.trim(),
          cosmeticHistory: cosmeticHistory.trim(),
          specialDisease: specialDisease.trim(),
          medications: medications.trim(),
          heightCm: heightCm.trim(),
          weightKg: weightKg.trim(),
          weightGainLastYear: weightGainLastYear.trim(),
          weightLossLastYear: weightLossLastYear.trim(),
          notes: notes.trim(),
        },
      });

      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره پرونده پزشکی");
        return;
      }

      toast.success("تغییرات پرونده پزشکی با موفقیت ذخیره شد.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 md:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ستون راست: وضعیت عمومی و بیماری‌های زمینه‌ای */}
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
          <div className="border-b pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <HeartPulse className="size-5 text-rose-500" />
              وضعیت عمومی و سوابق بیماری
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              بیماری‌هایی که مراجعه‌کننده با آن‌ها درگیر است را علامت بزنید:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MEDICAL_CONDITIONS.map((item) => {
              const checked = conditions.includes(item.key);
              return (
                <label
                  key={item.key}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors ${
                    checked
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    disabled={!canEdit}
                    checked={checked}
                    onCheckedChange={() => toggleCondition(item.key)}
                  />
                  <span>{item.label}</span>
                </label>
              );
            })}
          </div>

          <div className="space-y-1.5 pt-2">
            <Label>توضیحات بیشتر</Label>
            <Textarea
              rows={4}
              disabled={!canEdit}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="توضیحات تکمیلی پزشک یا اپراتور درباره وضعیت سلامتی مراجع..."
            />
          </div>
        </div>

        {/* ستون چپ: اطلاعات تکمیلی پزشکی */}
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
          <div className="border-b pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <ClipboardList className="size-5 text-primary" />
              اطلاعات تکمیلی پزشکی
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              فیلدها اختیاری هستند؛ در صورت درگیر نبودن مراجعه‌کننده آن‌ها را خالی بگذارید.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>تعداد سابقه جراحی</Label>
              <Input
                disabled={!canEdit}
                value={surgeryCount}
                onChange={(e) => setSurgeryCount(e.target.value)}
                placeholder="مثلاً: 1"
              />
            </div>

            <div className="space-y-1.5">
              <Label>حساسیت‌ها</Label>
              <Input
                disabled={!canEdit}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="مثلاً: استامینوفن، لیدوکائین"
              />
            </div>

            <div className="space-y-1.5">
              <Label>سابقه دریافت خدمات زیبایی</Label>
              <Input
                disabled={!canEdit}
                value={cosmeticHistory}
                onChange={(e) => setCosmeticHistory(e.target.value)}
                placeholder="مثلاً: تزریق ژل، لیزر"
              />
            </div>

            <div className="space-y-1.5">
              <Label>بیماری خاص</Label>
              <Input
                disabled={!canEdit}
                value={specialDisease}
                onChange={(e) => setSpecialDisease(e.target.value)}
                placeholder="مثلاً: صرع"
              />
            </div>

            <div className="space-y-1.5">
              <Label>مصرف هر نوع دارو</Label>
              <Input
                disabled={!canEdit}
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="مثلاً: راکوتان"
              />
            </div>

            <div className="space-y-1.5">
              <Label>قد (سانتی‌متر)</Label>
              <Input
                disabled={!canEdit}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="مثلاً: 165"
              />
            </div>

            <div className="space-y-1.5">
              <Label>وزن (کیلوگرم)</Label>
              <Input
                disabled={!canEdit}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="مثلاً: 62"
              />
            </div>

            <div className="space-y-1.5">
              <Label>افزایش وزن در یک سال اخیر (کیلوگرم)</Label>
              <Input
                disabled={!canEdit}
                value={weightGainLastYear}
                onChange={(e) => setWeightGainLastYear(e.target.value)}
                placeholder="مثلاً: 2"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>کاهش وزن در یک سال اخیر (کیلوگرم)</Label>
              <Input
                disabled={!canEdit}
                value={weightLossLastYear}
                onChange={(e) => setWeightLossLastYear(e.target.value)}
                placeholder="مثلاً: 2"
              />
            </div>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} className="gap-2">
            <Save className="size-4" />
            {isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
        </div>
      )}
    </form>
  );
}