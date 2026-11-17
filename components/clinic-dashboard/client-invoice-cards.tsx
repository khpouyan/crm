// components/clinic-dashboard/client-invoice-cards.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Trash2,
  Printer,
  Sparkles,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TomanIcon } from "@/components/ui/toman-icon";
import { formatJalali } from "@/lib/jalali";
import { deleteFullInvoiceAction } from "@/app/clinic-dashboard/(dashboard)/clients/actions";

export interface InvoiceCardServiceLine {
  id: string;
  serviceId: string;
  serviceTitle: string;
  subServiceTitle: string;
  performedAt: string;
  finalPrice: number;
  therapistName: string;
  assistantNames: string[];
  referrerName: string | null;
  description: string | null;
  usedConsumables: {
    id: string;
    productName: string;
    unit: string;
    quantity: number;
  }[];
}

export interface ClientInvoiceCardItem {
  id: string;
  invoiceNumber: number | null;
  totalAmount: number;
  paidAmount: number;
  depositAmount: number;
  depositServiceTitle: string | null;
  status: string; // PAID | PARTIAL | UNPAID | INSTALLMENT
  createdAt: string;
  operatorName: string;
  services: InvoiceCardServiceLine[];
}

interface ClientInvoiceCardsProps {
  clientId: string;
  invoices: ClientInvoiceCardItem[];
  serviceCategories: { value: string; label: string }[];
  canCreateService: boolean;
  canEditService: boolean;
  canDeleteService: boolean;
}

export function ClientInvoiceCards({
  clientId,
  invoices,
  serviceCategories,
  canCreateService,
  canEditService,
  canDeleteService,
}: ClientInvoiceCardsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<"card" | "timeline">("card");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const categoryOptions = useMemo(
    () => [{ value: "ALL", label: "همه بخش‌ها" }, ...serviceCategories],
    [serviceCategories]
  );

  const filteredInvoices = useMemo(() => {
    if (categoryFilter === "ALL") return invoices;
    return invoices.filter((inv) =>
      inv.services.some((s) => s.serviceId === categoryFilter)
    );
  }, [invoices, categoryFilter]);

  function handleDeleteInvoice(inv: ClientInvoiceCardItem) {
    const servicesListText = inv.services
      .map((s) => `${s.serviceTitle} (${s.subServiceTitle})`)
      .join("، ");

    const confirmed = window.confirm(
      `آیا از حذف کامل فاکتور #${inv.invoiceNumber ?? ""} شامل «${servicesListText}» مطمئن هستید؟\nتمام کالاهای مصرفی به انبار بازگردانده شده و تراکنش‌های کیف پول/بیعانه اصلاح می‌شوند.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await deleteFullInvoiceAction(clientId, inv.id);
      if (!res.success) {
        toast.error(res.error || "خطا در حذف فاکتور و سرویس‌ها");
        return;
      }
      toast.success("فاکتور و تمام سرویس‌های زیرمجموعه حذف شدند.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      {/* نوار ابزار فیلتر و تغییر نما */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52">
            <Select
              value={categoryFilter}
              items={categoryOptions}
              onValueChange={(val) => setCategoryFilter(val || "ALL")}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="فیلتر بخش" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs text-muted-foreground">
            تعداد صورت‌حساب‌ها:{" "}
            <strong className="text-foreground">
              {filteredInvoices.length.toLocaleString("fa-IR")}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border bg-background p-1">
          <Button
            type="button"
            variant={viewMode === "card" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid className="size-3.5" />
            کارتی
          </Button>
          <Button
            type="button"
            variant={viewMode === "timeline" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setViewMode("timeline")}
          >
            <List className="size-3.5" />
            تایم‌لاین
          </Button>
        </div>
      </div>

      {/* لیست کارت‌های فاکتور و سرویس */}
      {filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-16 text-center">
          <Sparkles className="mb-3 size-12 text-muted-foreground/50" />
          <p className="text-base font-medium">
            هنوز سرویسی برای این پرونده ثبت نشده است
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            با زدن دکمه + پایین صفحه وارد ویزارد ثبت سرویس و صدور فاکتور شوید.
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "card"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              : "space-y-4"
          }
        >
          {filteredInvoices.map((inv) => {
            const firstSrv = inv.services[0];
            const isMultiService = inv.services.length > 1;
            const uniqueServiceTitles = Array.from(
              new Set(inv.services.map((s) => s.serviceTitle))
            );

            // وضعیت فوتر کارت طبق منطق درخواستی
            const isPaid = inv.status === "PAID";
            const isUnpaidZero =
              inv.status === "UNPAID" && inv.paidAmount === 0;

            const footerConfig = isPaid
              ? {
                  label: "تسویه شده",
                  className: "bg-emerald-600 text-white",
                  badgeClass:
                    "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20",
                  badgeText: "پرداخت شده",
                }
              : isUnpaidZero
              ? {
                  label: "بدون پرداختی",
                  className: "bg-slate-600 text-white",
                  badgeClass:
                    "bg-slate-500/15 text-slate-700 hover:bg-slate-500/20",
                  badgeText: "بدون پرداختی",
                }
              : {
                  label: "تسویه نشده",
                  className: "bg-amber-600 text-white",
                  badgeClass:
                    "bg-amber-500/15 text-amber-700 hover:bg-amber-500/20",
                  badgeText:
                    inv.status === "INSTALLMENT" ? "قسطی" : "پرداخت جزئی",
                };

            return (
              <div
                key={inv.id}
                className="flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-2xs transition-all hover:border-primary/40"
              >
                <div className="space-y-3">
                  {/* هدر کارت */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-foreground">
                        {uniqueServiceTitles.join(" + ") || "صورت‌حساب"}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>فاکتور #{inv.invoiceNumber}</span>
                        {isMultiService && (
                          <Badge variant="secondary" className="text-[10px]">
                            {inv.services.length.toLocaleString("fa-IR")} خدمت
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge className={footerConfig.badgeClass}>
                        {footerConfig.badgeText}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEditService && (
                            <DropdownMenuItem
                              render={
                                <Link
                                  href={`/clinic-dashboard/clients/${clientId}/invoices/${inv.id}/edit`}
                                />
                              }
                            >
                              <Pencil className="ml-2 size-4" />
                              ویرایش فاکتور و سرویس‌ها
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            render={
                              <Link
                                href={`/clinic-dashboard/clients/${clientId}/invoices/${inv.id}/edit?step=3`}
                              />
                            }
                          >
                            <Printer className="ml-2 size-4" />
                            جزئیات و پرینت رسید
                          </DropdownMenuItem>

                          {canDeleteService && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isPending}
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteInvoice(inv)}
                              >
                                <Trash2 className="ml-2 size-4" />
                                حذف کامل
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* جزئیات مشترک یا لیست سرویس‌های کارت */}
                  <div className="space-y-2 border-t pt-2.5 text-xs">
                    {firstSrv && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">درمانگر:</span>
                          <span className="font-medium">
                            {firstSrv.therapistName}
                          </span>
                        </div>

                        {firstSrv.assistantNames.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              دستیار درمان:
                            </span>
                            <span>{firstSrv.assistantNames.join("، ")}</span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-muted-foreground">تاریخ:</span>
                          <span>
                            {formatJalali(new Date(firstSrv.performedAt))}
                          </span>
                        </div>
                      </>
                    )}

                    {/* نمایش ریز خدمات (تک سرویس یا همه سرویس‌های داخل فاکتور) */}
                    <div className="space-y-1 pt-1">
                      <span className="text-muted-foreground">
                        ریز خدمات‌ها:
                      </span>
                      <div className="space-y-1 rounded-lg bg-muted/40 p-2">
                        {inv.services.map((srv) => (
                          <div
                            key={srv.id}
                            className="flex items-center justify-between gap-2 text-[11px]"
                          >
                            <span className="font-medium text-foreground">
                              • {srv.serviceTitle} — {srv.subServiceTitle}
                            </span>
                            <span className="shrink-0 text-muted-foreground">
                              {srv.finalPrice.toLocaleString("fa-IR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {inv.depositAmount > 0 && (
                      <div className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] text-primary">
                        بیعانه ({inv.depositServiceTitle}):{" "}
                        <strong>
                          +{inv.depositAmount.toLocaleString("fa-IR")} تومان
                        </strong>
                      </div>
                    )}

                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>نام ثبت‌کننده:</span>
                      <span>{inv.operatorName}</span>
                    </div>
                  </div>
                </div>

                {/* فوتر رنگی کارت */}
                <div
                  className={`mt-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold ${footerConfig.className}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Receipt className="size-3.5" />
                    {footerConfig.label}
                  </span>
                  <span className="flex items-center gap-1">
                    {inv.totalAmount.toLocaleString("fa-IR")}
                    <TomanIcon className="size-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* دکمه شناور + پایین سمت چپ برای باز کردن صفحه ویزارد تمام‌صفحه */}
      {canCreateService && (
        <Button
          nativeButton={false}
          render={
            <Link href={`/clinic-dashboard/clients/${clientId}/invoices/new`} />
          }
          className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
          title="افزودن سرویس و صدور فاکتور"
        >
          <Plus className="size-6" />
        </Button>
      )}
    </div>
  );
}