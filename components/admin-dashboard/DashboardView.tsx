import React from "react";
import { StatsCards } from "./StatsCards";
import { ServerStatusCard } from "./ServerStatusCard";
import { SmsPanelCard } from "./SmsPanelCard";
import { CloudStorageCard } from "./CloudStorageCard";
import { ClinicsDistributionCard } from "./ClinicsDistributionCard";
import { TicketsStatusCard } from "./TicketsStatusCard";

export default function DashboardView() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" dir="rtl">
      {/* ردیف اول: ۴ کارت آماری بالا */}
      <StatsCards />

      {/* ردیف دوم بخش الف: وضعیت سرورها */}
      <ServerStatusCard />

      {/* ردیف دوم بخش ب: دو باکس در کنار هم (پنل پیامک و فضای ذخیره‌ساز) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SmsPanelCard />
        <CloudStorageCard />
      </div>

      {/* ردیف سوم: جدول پراکندگی کلینیک‌ها و وضعیت تیکت‌ها در کنار هم */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ClinicsDistributionCard />
        <TicketsStatusCard />
      </div>
    </div>
  );
}
