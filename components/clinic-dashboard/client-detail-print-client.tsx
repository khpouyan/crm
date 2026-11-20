"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatJalali } from "@/lib/jalali";
import { MEDICAL_CONDITIONS } from "@/components/clinic-dashboard/client-medical-file-client";

interface ClientDetailPrintClientProps {
  clinicName: string;
  managerName: string;
  client: {
    fileNumber: number | null;
    fullName: string;
    phone: string;
    nationalId: string;
    gender: string;
    birthDate: string | null;
    notes: string | null;
    createdAt: string;
  };
  medicalConditions: string[];
  medicalNotes: string | null;
  services: {
    id: string;
    serviceTitle: string;
    subServiceTitle: string;
    therapistName: string;
    performedAt: string;
    finalPrice: number;
    description: string | null;
    invoiceNumber: number | null;
    invoiceStatus: string;
  }[];
}

export function ClientDetailPrintClient({
  clinicName,
  managerName,
  client,
  medicalConditions,
  medicalNotes,
  services,
}: ClientDetailPrintClientProps) {
  const [showClinic, setShowClinic] = useState(true);
  const [showClient, setShowClient] = useState(true);
  const [showMedical, setShowMedical] = useState(true);
  const [showServices, setShowServices] = useState(true);

  const conditionLabels = medicalConditions.map(
    (key) => MEDICAL_CONDITIONS.find((c) => c.key === key)?.label || key
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* تنظیمات انتخاب بخش‌های پرینت */}
      <div className="space-y-4 rounded-xl border bg-card p-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-bold">انتخاب بخش‌های پرینت</span>
          <Button
            type="button"
            onClick={() => window.print()}
            className="gap-2"
          >
            <Printer className="size-4" />
            پرینت گزارش پرونده
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={showClinic}
              onCheckedChange={(v) => setShowClinic(Boolean(v))}
            />
            <Label className="cursor-pointer">مشخصات کلینیک</Label>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={showClient}
              onCheckedChange={(v) => setShowClient(Boolean(v))}
            />
            <Label className="cursor-pointer">اطلاعات مراجعه‌کننده</Label>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={showMedical}
              onCheckedChange={(v) => setShowMedical(Boolean(v))}
            />
            <Label className="cursor-pointer">سوابق پزشکی</Label>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={showServices}
              onCheckedChange={(v) => setShowServices(Boolean(v))}
            />
            <Label className="cursor-pointer">سوابق خدمات</Label>
          </label>
        </div>
      </div>

      {/* برگه پیش‌نمایش پرینت */}
      <div className="space-y-6 rounded-xl border bg-card p-6 shadow-2xs print:border-none print:p-6 print:shadow-none">
        <div className="border-b pb-4 text-center">
          <h2 className="text-xl font-bold">جزئیات پرونده مراجعه‌کننده</h2>
          <p className="mt-1 text-sm font-semibold text-primary">
            {client.fullName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            تاریخ ساخت پرونده: {formatJalali(new Date(client.createdAt))}
          </p>
        </div>

        {showClinic && (
          <div className="space-y-2">
            <h3 className="border-r-4 border-primary pr-2 text-sm font-bold">
              مشخصات کلینیک
            </h3>
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-3">
              <div>
                <span className="text-muted-foreground">نام کلینیک: </span>
                <strong>{clinicName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">اپراتور گزارش‌گیر: </span>
                <strong>{managerName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">شماره پرونده: </span>
                <strong>{client.fileNumber ?? "—"}</strong>
              </div>
            </div>
          </div>
        )}

        {showClient && (
          <div className="space-y-2">
            <h3 className="border-r-4 border-primary pr-2 text-sm font-bold">
              مشخصات مراجعه‌کننده
            </h3>
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-3">
              <div>
                <span className="text-muted-foreground">نام و نام خانوادگی: </span>
                <strong>{client.fullName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">کد ملی: </span>
                <strong className="font-mono">{client.nationalId}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">شماره تماس: </span>
                <strong dir="ltr" className="font-mono">
                  {client.phone}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">جنسیت: </span>
                <strong>{client.gender}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">تاریخ تولد: </span>
                <strong>
                  {client.birthDate
                    ? formatJalali(new Date(client.birthDate))
                    : "—"}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">توضیحات: </span>
                <strong>{client.notes || "—"}</strong>
              </div>
            </div>
          </div>
        )}

        {showMedical && (
          <div className="space-y-2">
            <h3 className="border-r-4 border-primary pr-2 text-sm font-bold">
              پرونده پزشکی مراجعه‌کننده
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              {conditionLabels.length === 0 && !medicalNotes ? (
                <p className="text-muted-foreground">
                  اطلاعات پزشکی ثبت نشده است.
                </p>
              ) : (
                <div className="space-y-2">
                  {conditionLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {conditionLabels.map((lbl) => (
                        <Badge key={lbl} variant="secondary">
                          {lbl}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {medicalNotes && <p>{medicalNotes}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {showServices && (
          <div className="space-y-3">
            <h3 className="border-r-4 border-primary pr-2 text-sm font-bold">
              سوابق خدمات انجام‌شده
            </h3>
            {services.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                سابقه‌ای ثبت نشده است.
              </p>
            ) : (
              <div className="space-y-2.5">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="rounded-lg border p-3 text-xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                      <span>
                        {srv.serviceTitle} — {srv.subServiceTitle}
                      </span>
                      <span>{srv.finalPrice.toLocaleString("fa-IR")} تومان</span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                      <span>درمانگر: {srv.therapistName}</span>
                      <span>
                        تاریخ: {formatJalali(new Date(srv.performedAt))}
                      </span>
                      {srv.invoiceNumber && (
                        <span>شماره فاکتور: #{srv.invoiceNumber}</span>
                      )}
                    </div>
                    {srv.description && (
                      <p className="text-muted-foreground">
                        توضیحات: {srv.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}