// components/clinic-dashboard/panel-settings/panel-settings-client.tsx
"use client";

import * as React from "react";
import { Palette, Type, Hash, ClipboardCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemePresetsSection } from "./theme-presets-section";
import { FontSettingsSection } from "./font-settings-section";
import { NumberingSettingsSection } from "./numbering-settings-section";
import { CompletenessStep1Section } from "./completeness-step1-section";

interface PanelSettingsClientProps {
  numbering: {
    fileNumberAutoEnabled: boolean;
    fileNumberStartFrom: number;
    invoiceNumberAutoEnabled: boolean;
    invoiceNumberStartFrom: number;
  };
  completenessConfig: Record<string, unknown>;
}

export function PanelSettingsClient({
  numbering,
  completenessConfig,
}: PanelSettingsClientProps) {
  return (
    <div className="space-y-6 p-4 md:p-0" dir="rtl">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          تنظیمات پنل
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          سفارشی‌سازی قالب shadcn، فونت و اندازه فونت، شماره‌گذاری پرونده و فاکتور و معیارهای تکمیل پرونده
        </p>
      </div>

      <Tabs defaultValue="appearance" dir="rtl" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 [&_[data-slot=tabs-indicator]]:hidden">
          <TabsTrigger
            value="appearance"
            className="gap-1.5 data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            <Palette className="size-3.5" />
            قالب و فونت
          </TabsTrigger>
          <TabsTrigger
            value="numbering"
            className="gap-1.5 data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            <Hash className="size-3.5" />
            شماره پرونده و فاکتور
          </TabsTrigger>
          <TabsTrigger
            value="completeness"
            className="gap-1.5 data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            <ClipboardCheck className="size-3.5" />
            تکمیل / ناقص بودن پرونده
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-5">
          <ThemePresetsSection />
          <FontSettingsSection />
        </TabsContent>

        <TabsContent value="numbering">
          <NumberingSettingsSection initialData={numbering} />
        </TabsContent>

        <TabsContent value="completeness">
          <CompletenessStep1Section initialConfig={completenessConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
