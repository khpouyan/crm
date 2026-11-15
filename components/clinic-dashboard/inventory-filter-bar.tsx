// components/clinic-dashboard/inventory-filter-bar.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface InventoryFilterValues {
  from?: string;
  to?: string;
  serviceId?: string;
  staffId?: string;
}

interface InventoryFilterBarProps {
  services: { id: string; title: string }[];
  staffs: { id: string; fullName: string }[];
  initialValues: InventoryFilterValues;
  onApply: (values: InventoryFilterValues) => void;
  disabled?: boolean;
}

const DEFAULT_START_MONTH = new Date(2016, 0, 1);
const DEFAULT_END_MONTH = new Date(2036, 11, 29);

export function InventoryFilterBar({
  services,
  staffs,
  initialValues,
  onApply,
  disabled = false,
}: InventoryFilterBarProps) {
  const [fromDate, setFromDate] = useState<Date | null>(
    initialValues.from ? new Date(initialValues.from) : null
  );
  const [toDate, setToDate] = useState<Date | null>(
    initialValues.to ? new Date(initialValues.to) : null
  );
  const [serviceId, setServiceId] = useState<string>(
    initialValues.serviceId || "ALL"
  );
  const [staffId, setStaffId] = useState<string>(
    initialValues.staffId || "ALL"
  );

  const serviceItems = useMemo(
    () => [
      { value: "ALL", label: "همه خدمات کلینیک" },
      ...services.map((s) => ({ value: s.id, label: s.title })),
    ],
    [services]
  );

  const staffItems = useMemo(
    () => [
      { value: "ALL", label: "همه پرسنل" },
      ...staffs.map((st) => ({ value: st.id, label: st.fullName })),
    ],
    [staffs]
  );

  const handleApply = () => {
    onApply({
      from: fromDate ? fromDate.toISOString() : undefined,
      to: toDate ? toDate.toISOString() : undefined,
      serviceId: serviceId !== "ALL" ? serviceId : undefined,
      staffId: staffId !== "ALL" ? staffId : undefined,
    });
  };

  const handleReset = () => {
    setFromDate(null);
    setToDate(null);
    setServiceId("ALL");
    setStaffId("ALL");
    onApply({});
  };

  return (
    <div
      className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-3.5 sm:grid-cols-2 lg:grid-cols-5"
      dir="rtl"
    >
      {/* از تاریخ */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">از تاریخ</Label>
        <DatePicker
          calendarType="shamsi"
          value={fromDate}
          onValueChange={setFromDate}
          placeholder="انتخاب تاریخ شروع"
          className="w-full"
          calendarProps={{
            captionLayout: "dropdown",
            startMonth: DEFAULT_START_MONTH,
            endMonth: DEFAULT_END_MONTH,
          }}
        />
      </div>

      {/* تا تاریخ */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">تا تاریخ</Label>
        <DatePicker
          calendarType="shamsi"
          value={toDate}
          onValueChange={setToDate}
          placeholder="انتخاب تاریخ پایان"
          className="w-full"
          calendarProps={{
            captionLayout: "dropdown",
            startMonth: DEFAULT_START_MONTH,
            endMonth: DEFAULT_END_MONTH,
          }}
        />
      </div>

      {/* فیلتر خدمت مرتبط */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">خدمت مرتبط</Label>
        <Select
          items={serviceItems}
          value={serviceId}
          disabled={disabled}
          onValueChange={(v) => v && setServiceId(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {serviceItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* فیلتر پرسنل مرتبط */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">پرسنل مرتبط</Label>
        <Select
          items={staffItems}
          value={staffId}
          disabled={disabled}
          onValueChange={(v) => v && setStaffId(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {staffItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* دکمه‌های اعمال و پاک‌سازی */}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          onClick={handleApply}
          disabled={disabled}
          className="flex-1 gap-1.5"
        >
          <Filter className="size-3.5" />
          اعمال فیلتر
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleReset}
          disabled={disabled}
          title="پاک کردن فیلترها"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}