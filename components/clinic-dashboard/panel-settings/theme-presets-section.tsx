// components/clinic-dashboard/panel-settings/theme-presets-section.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, Moon, Sun, Monitor, Palette } from "lucide-react";
import { toastManager } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShadcnThemePreset {
  id: string;
  name: string;
  description: string;
  primaryHex: string;
  ringHex: string;
  accentBgHex: string;
}

export const SHADCN_THEME_PRESETS: ShadcnThemePreset[] = [
  {
    id: "zinc-neutral",
    name: "Zinc کلاسیک (دیفالت shadcn)",
    description: "طراحی خنثی، شفاف و استاندارد سبک shadcn/ui",
    primaryHex: "#18181b",
    ringHex: "#71717a",
    accentBgHex: "#f4f4f5",
  },
  {
    id: "violet-clinic",
    name: "Violet مدرن کلینیک",
    description: "پالت بنفش و یاسی نرم مناسب داشبوردهای درمانی و زیبایی",
    primaryHex: "#7c3aed",
    ringHex: "#8b5cf6",
    accentBgHex: "#f5f3ff",
  },
  {
    id: "emerald-medical",
    name: "Emerald درمانی و سلامت",
    description: "رنگ سبز زمردی آرامش‌بخش با کنتراست خوانا",
    primaryHex: "#059669",
    ringHex: "#10b981",
    accentBgHex: "#ecfdf5",
  },
  {
    id: "rose-beauty",
    name: "Rose کلینیک زیبایی",
    description: "پالت رز و سرخابی لطیف ویژه مراکز پوست و زیبایی",
    primaryHex: "#e11d48",
    ringHex: "#f43f5e",
    accentBgHex: "#fff1f2",
  },
];

const PRESET_STORAGE_KEY = "clinito_shadcn_preset";

export function applyShadcnThemePreset(presetId: string) {
  if (typeof document === "undefined") return;
  const preset =
    SHADCN_THEME_PRESETS.find((p) => p.id === presetId) ||
    SHADCN_THEME_PRESETS[0];
  const root = document.documentElement;
  root.dataset.shadcnPreset = preset.id;
  root.style.setProperty("--primary", preset.primaryHex);
  root.style.setProperty("--ring", preset.ringHex);
}

export function ThemePresetsSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [selectedPreset, setSelectedPreset] = React.useState<string>("zinc-neutral");

  React.useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem(PRESET_STORAGE_KEY) || "zinc-neutral";
    setSelectedPreset(saved);
    applyShadcnThemePreset(saved);
  }, []);

  function handleSelectPreset(presetId: string) {
    const preset = SHADCN_THEME_PRESETS.find((p) => p.id === presetId);
    setSelectedPreset(presetId);
    window.localStorage.setItem(PRESET_STORAGE_KEY, presetId);
    applyShadcnThemePreset(presetId);
    toastManager.add({
      type: "success",
      title: "قالب ذخیره شد",
      description: `قالب «${preset?.name || presetId}» روی پنل اعمال شد.`,
    });
  }

  function handleModeSelect(mode: "light" | "dark" | "system") {
    setTheme(mode);
    const label =
      mode === "light" ? "روشن" : mode === "dark" ? "تیره" : "سیستمی";
    toastManager.add({
      type: "success",
      title: "حالت نمایش ذخیره شد",
      description: `حالت «${label}» برای پنل فعال شد.`,
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-bold">مدیریت قالب‌ها (قالب‌های آماده shadcn)</h2>
            <p className="text-xs text-muted-foreground">
              انتخاب حالت روشن/تیره و پالت رنگ آماده shadcn برای کل پنل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border bg-muted/40 p-1">
          <Button
            type="button"
            size="sm"
            variant={mounted && theme === "light" ? "default" : "ghost"}
            className="h-8 gap-1 text-xs"
            onClick={() => handleModeSelect("light")}
          >
            <Sun className="size-3.5" />
            روشن
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mounted && theme === "dark" ? "default" : "ghost"}
            className="h-8 gap-1 text-xs"
            onClick={() => handleModeSelect("dark")}
          >
            <Moon className="size-3.5" />
            تیره
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mounted && theme === "system" ? "default" : "ghost"}
            className="h-8 gap-1 text-xs"
            onClick={() => handleModeSelect("system")}
          >
            <Monitor className="size-3.5" />
            سیستم
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SHADCN_THEME_PRESETS.map((preset) => {
          const active = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={cn(
                "flex flex-col justify-between gap-3 rounded-xl border p-3.5 text-right transition-all",
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "bg-background hover:bg-muted/40"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="size-5 shrink-0 rounded-full border shadow-2xs"
                    style={{ backgroundColor: preset.primaryHex }}
                  />
                  <span className="text-xs font-bold">{preset.name}</span>
                </div>
                {active && <Check className="size-4 shrink-0 text-primary" />}
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
