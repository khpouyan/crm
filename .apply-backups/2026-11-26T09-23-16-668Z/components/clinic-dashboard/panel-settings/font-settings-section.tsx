// components/clinic-dashboard/panel-settings/font-settings-section.tsx
"use client";

import * as React from "react";
import { Type } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface FontOption {
  id: string;
  label: string;
  fontFamily: string;
  note: string;
}

export const PERSIAN_FONT_OPTIONS: FontOption[] = [
  {
    id: "iransansx",
    label: "ایران‌سنس X (IRANSansX)",
    fontFamily: '"IRANSansX", "Vazirmatn", Tahoma, sans-serif',
    note: "تمام وزن‌ها از Thin تا Black با خوانایی عالی",
  },
  {
    id: "yekan",
    label: "یکان (Yekan)",
    fontFamily: '"Yekan", "Vazirmatn", Tahoma, sans-serif',
    note: "مناسب جداول، اعداد و رابط‌های فارسی",
  },
  {
    id: "vazirmatn",
    label: "وزیرمتن (Vazirmatn)",
    fontFamily: '"Vazirmatn", Tahoma, sans-serif',
    note: "فونت استاندارد و روان وب فارسی",
  },
];

export interface FontSizeOption {
  id: "sm" | "md" | "lg" | "xl";
  label: string;
  percent: string;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { id: "sm", label: "کوچک", percent: "92%" },
  { id: "md", label: "استاندارد", percent: "100%" },
  { id: "lg", label: "بزرگ", percent: "108%" },
  { id: "xl", label: "خیلی بزرگ", percent: "116%" },
];

const FONT_STORAGE_KEY = "clinito_panel_font";
const FONT_SIZE_STORAGE_KEY = "clinito_panel_font_size";

export function applyFontPreferences(fontId: string, sizeId: string) {
  if (typeof document === "undefined") return;
  const font =
    PERSIAN_FONT_OPTIONS.find((f) => f.id === fontId) || PERSIAN_FONT_OPTIONS[0];
  const size =
    FONT_SIZE_OPTIONS.find((s) => s.id === sizeId) || FONT_SIZE_OPTIONS[1];

  const root = document.documentElement;
  root.style.setProperty("--font-sans", font.fontFamily);
  root.style.fontFamily = font.fontFamily;
  root.style.fontSize = size.percent;
}

export function FontSettingsSection() {
  const { toast } = useToast();
  const [selectedFont, setSelectedFont] = React.useState<string>("iransansx");
  const [selectedSize, setSelectedSize] = React.useState<string>("md");

  React.useEffect(() => {
    const savedFont =
      window.localStorage.getItem(FONT_STORAGE_KEY) || "iransansx";
    const savedSize =
      window.localStorage.getItem(FONT_SIZE_STORAGE_KEY) || "md";
    setSelectedFont(savedFont);
    setSelectedSize(savedSize);
    applyFontPreferences(savedFont, savedSize);
  }, []);

  function handleFontChange(nextFont: string) {
    const font = PERSIAN_FONT_OPTIONS.find((f) => f.id === nextFont);
    setSelectedFont(nextFont);
    window.localStorage.setItem(FONT_STORAGE_KEY, nextFont);
    applyFontPreferences(nextFont, selectedSize);
    toast({
      title: "فونت تغییر کرد",
      description: `فونت «${font?.label || nextFont}» ذخیره و اعمال شد.`,
    });
  }

  function handleSizeChange(nextSize: string) {
    const size = FONT_SIZE_OPTIONS.find((s) => s.id === nextSize);
    setSelectedSize(nextSize);
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, nextSize);
    applyFontPreferences(selectedFont, nextSize);
    toast({
      title: "اندازه فونت تغییر کرد",
      description: `اندازه فونت «${size?.label || nextSize} (${size?.percent || ""})» ذخیره شد.`,
    });
  }

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-2xs">
      <div className="flex items-center gap-2">
        <Type className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-bold">مدیریت فونت و اندازه فونت</h2>
          <p className="text-xs text-muted-foreground">
            انتخاب فونت فارسی (ایران‌سنس X، یکان و وزیرمتن) و اندازه متن پنل
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-muted-foreground">نوع فونت</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PERSIAN_FONT_OPTIONS.map((font) => {
            const active = selectedFont === font.id;
            return (
              <button
                key={font.id}
                type="button"
                style={{ fontFamily: font.fontFamily }}
                onClick={() => handleFontChange(font.id)}
                className={cn(
                  "flex flex-col justify-between gap-1.5 rounded-xl border p-3.5 text-right transition-all",
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "bg-background hover:bg-muted/40"
                )}
              >
                <span className="text-xs font-bold">{font.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {font.note}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-muted-foreground">
          اندازه فونت پنل
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {FONT_SIZE_OPTIONS.map((sz) => {
            const active = selectedSize === sz.id;
            return (
              <button
                key={sz.id}
                type="button"
                onClick={() => handleSizeChange(sz.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs transition-all",
                  active
                    ? "border-primary bg-primary font-bold text-primary-foreground"
                    : "bg-background hover:bg-muted/40"
                )}
              >
                <span>{sz.label}</span>
                <span dir="ltr" className="opacity-80">
                  {sz.percent}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
