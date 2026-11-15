// components/clinic-dashboard/export-data-menu.tsx
"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, FileJson, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportEntityType } from "@/lib/export/data-export";

interface ExportDataMenuProps {
  entity: ExportEntityType;
  canExport: boolean;
  filters?: {
    from?: string;
    to?: string;
    serviceId?: string;
    staffId?: string;
  };
}

export function ExportDataMenu({
  entity,
  canExport,
  filters,
}: ExportDataMenuProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: "XLSX" | "JSON") => {
    if (!canExport) {
      toast.error(
        "قابلیت خروجی گرفتن روی پلن فعلی شما فعال نیست. برای فعال‌سازی، پلن خود را ارتقا دهید یا ماژول خروجی داده را تهیه کنید."
      );
      return;
    }

    try {
      setIsDownloading(true);
      const params = new URLSearchParams({
        entity,
        format,
      });
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      if (filters?.serviceId) params.set("serviceId", filters.serviceId);
      if (filters?.staffId) params.set("staffId", filters.staffId);

      const res = await fetch(`/api/clinic-dashboard/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "خطا در دریافت خروجی");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "XLSX" ? "xlsx" : "json";
      a.download = `${entity.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        format === "XLSX" ? "فایل اکسل با موفقیت دانلود شد" : "فایل JSON دانلود شد"
      );
    } catch (err: any) {
      toast.error(err?.message || "خطا در خروجی گرفتن");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!canExport) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() =>
          toast.info(
            "خروجی اکسل و JSON مخصوص پلن کلینیک یا ماژول خروجی داده است."
          )
        }
      >
        <Lock className="size-3.5" />
        خروجی
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDownloading}
            className="gap-1.5"
          />
        }
      >
        {isDownloading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        خروجی داده‌ها
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => handleDownload("XLSX")}>
          <FileSpreadsheet className="size-4 text-emerald-600" />
          خروجی اکسل (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("JSON")}>
          <FileJson className="size-4 text-sky-600" />
          خروجی جیسون (.json)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
