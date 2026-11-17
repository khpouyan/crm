// components/clinic-dashboard/inventory-stock-in-client.tsx
"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Plus,
  ArrowDownLeft,
  Calendar,
  Loader2,
  Trash2,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PriceInput } from "@/components/ui/price-input";
import { TomanIcon } from "@/components/ui/toman-icon";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogDesktopOnly,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogPanel,
  ResponsiveDialogPopup,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatJalaliNumeric } from "@/lib/jalali";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import {
  stockInBatchAction,
  updateProductBatchAction,
  deleteProductBatchAction,
} from "@/app/clinic-dashboard/(dashboard)/inventory/actions";
import {
  InventoryFilterBar,
  InventoryFilterValues,
} from "./inventory-filter-bar";
import { TablePaginationBar } from "./table-pagination-bar";
import { ExportDataMenu } from "./export-data-menu";
import { TableRowsSkeleton } from "./inventory-skeletons";

interface InventoryStockInClientProps {
  batches: any[];
  totalCount: number;
  page: number;
  pageSize: number;
  products: {
    id: string;
    name: string;
    unit: string;
    packageUnit: string | null;
    unitsPerPackage: number;
    unsettledDeficit: number;
  }[];
  services: { id: string; title: string }[];
  subServices: { id: string; title: string; service: { title: string } }[];
  staffs: { id: string; fullName: string; canBeTherapist: boolean }[];
  filters: InventoryFilterValues;
  canExport: boolean;
}

const EXPIRATION_START_MONTH = new Date(2024, 0, 1);
const EXPIRATION_END_MONTH = new Date(2040, 11, 29);

export function InventoryStockInClient({
  batches,
  totalCount,
  page,
  pageSize,
  products,
  services,
  subServices,
  staffs,
  filters,
  canExport,
}: InventoryStockInClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  // مودال ثبت / ویرایش ورود کالا
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [entryMode, setEntryMode] = useState<"UNIT" | "PACKAGE">("UNIT");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [exclusiveSubId, setExclusiveSubId] = useState<string>("NONE");
  const [exclusiveTherapistId, setExclusiveTherapistId] =
    useState<string>("NONE");

  // دیالوگ تایید حذف رکورد ورود کالا
  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    batchId: string;
    productName: string;
    hasUsageWarning: boolean;
    consumedFromBatch: number;
    unit: string;
  } | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const hasPackageOption = Boolean(
    selectedProduct?.packageUnit && selectedProduct.unitsPerPackage > 1
  );

  const productItems = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.packageUnit ? `${p.name} (${p.packageUnit} / ${p.unit})` : `${p.name} (${p.unit})`}${
          p.unsettledDeficit > 0
            ? ` — کسری: ${p.unsettledDeficit.toLocaleString("fa-IR")} ${p.unit}`
            : ""
        }`,
      })),
    [products]
  );

  const subServiceItems = useMemo(
    () => [
      { value: "NONE", label: "عمومی (همه خدمات)" },
      ...subServices.map((s) => ({
        value: s.id,
        label: `${s.service.title} - ${s.title}`,
      })),
    ],
    [subServices]
  );

  const therapistItems = useMemo(
    () => [
      { value: "NONE", label: "عمومی (همه درمانگران)" },
      ...staffs
        .filter((s) => s.canBeTherapist)
        .map((t) => ({ value: t.id, label: t.fullName })),
    ],
    [staffs]
  );

  const updateUrlParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // باز کردن فرم ثبت جدید
  const handleOpenNewForm = () => {
    setEditingBatch(null);
    const firstProd = products[0];
    setProductId(firstProd?.id ?? "");
    setEntryMode(
      firstProd?.packageUnit && firstProd.unitsPerPackage > 1
        ? "PACKAGE"
        : "UNIT"
    );
    setQuantity("");
    setPurchasePrice(0);
    setSellingPrice(0);
    setExpirationDate(null);
    setExclusiveSubId("NONE");
    setExclusiveTherapistId("NONE");
    setDialogOpen(true);
  };

  // باز کردن فرم ویرایش بچ انتخاب‌شده
  const handleOpenEditForm = (batch: any) => {
    setEditingBatch(batch);
    const initialUnitQty =
      batch.initialQuantity > 0 ? batch.initialQuantity : batch.quantity;

    setProductId(batch.clinicProductId);
    setEntryMode("UNIT");
    setQuantity(String(initialUnitQty));
    setPurchasePrice(batch.purchasePrice);
    setSellingPrice(batch.sellingPrice ?? 0);
    setExpirationDate(
      batch.expirationDate ? new Date(batch.expirationDate) : null
    );
    setExclusiveSubId(batch.exclusiveSubServiceId || "NONE");
    setExclusiveTherapistId(batch.exclusiveTherapistId || "NONE");
    setDialogOpen(true);
  };

  const handleProductChange = (val: string | null) => {
    if (!val || editingBatch) return;
    setProductId(val);
    const prod = products.find((p) => p.id === val);
    setEntryMode(
      prod?.packageUnit && prod.unitsPerPackage > 1 ? "PACKAGE" : "UNIT"
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const parsedQty = parseFloat(normalizePersianDigits(quantity)) || 0;
    const payload = {
      entryMode: hasPackageOption ? entryMode : ("UNIT" as const),
      quantity: parsedQty,
      purchasePrice,
      sellingPrice: sellingPrice > 0 ? sellingPrice : null,
      expirationDate: expirationDate ? expirationDate.toISOString() : null,
      exclusiveSubServiceId:
        exclusiveSubId !== "NONE" ? exclusiveSubId : null,
      exclusiveTherapistId:
        exclusiveTherapistId !== "NONE" ? exclusiveTherapistId : null,
    };

    if (editingBatch) {
      const res = await updateProductBatchAction({
        batchId: editingBatch.id,
        ...payload,
      });
      setIsSaving(false);

      if (res.success) {
        toast.success("تغییرات رکورد ورود کالا با موفقیت ذخیره شد");
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
      return;
    }

    const res = await stockInBatchAction({
      clinicProductId: productId,
      ...payload,
    });
    setIsSaving(false);

    if (res.success) {
      if (res.settledQuantity && res.settledQuantity > 0) {
        toast.success(
          `ورود کالا ثبت شد و ${res.settledQuantity.toLocaleString("fa-IR")} ${res.unit || ""} از کسری خدمات قبلی (${(res.settledServicesCount ?? 0).toLocaleString("fa-IR")} سرویس) به صورت خودکار تسویه گردید.`
        );
      } else {
        toast.success("ورود کالا و بچ جدید با موفقیت ثبت شد");
      }
      setDialogOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  // کلیک روی دکمه حذف هر ردیف
  const handleRequestDeleteBatch = (batch: any) => {
    const initialQty =
      batch.initialQuantity > 0 ? batch.initialQuantity : batch.quantity;
    const consumedFromBatch = Math.max(0, initialQty - batch.quantity);
    const usedInServicesCount = batch.clinicProduct?._count?.usedInServices ?? 0;
    const hasUsageWarning = consumedFromBatch > 0 || usedInServicesCount > 0;

    setDeleteDialogState({
      open: true,
      batchId: batch.id,
      productName: batch.clinicProduct.name,
      hasUsageWarning,
      consumedFromBatch,
      unit: batch.clinicProduct.unit,
    });
  };

  const handleConfirmDeleteBatch = async () => {
    if (!deleteDialogState) return;
    const target = deleteDialogState;
    setDeleteDialogState(null);

    setIsSaving(true);
    const res = await deleteProductBatchAction(target.batchId, true);
    setIsSaving(false);

    if (res.success) {
      toast.success("رکورد ورود کالا با موفقیت حذف شد");
      router.refresh();
    } else {
      toast.error(res.error || "خطا در حذف رکورد");
    }
  };

  const previewTotalUnits = useMemo(() => {
    const q = parseFloat(normalizePersianDigits(quantity)) || 0;
    if (
      hasPackageOption &&
      entryMode === "PACKAGE" &&
      selectedProduct?.unitsPerPackage
    ) {
      return q * selectedProduct.unitsPerPackage;
    }
    return q;
  }, [quantity, hasPackageOption, entryMode, selectedProduct]);

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      {/* هدر */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            ورود کالا به انبار
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            لیست بچ‌های واردشده به انبار همراه با قیمت خرید، تاریخ انقضا و محدودیت مصرف
          </p>
        </div>

        <ExportDataMenu
          entity="INVENTORY_BATCHES"
          canExport={canExport}
          filters={filters}
        />
      </div>

      {/* نوار فیلتر */}
      <InventoryFilterBar
        services={services}
        staffs={staffs}
        initialValues={filters}
        disabled={isPending}
        onApply={(vals) =>
          updateUrlParams({
            from: vals.from,
            to: vals.to,
            serviceId: vals.serviceId,
            staffId: vals.staffId,
            page: "1",
          })
        }
      />

      {/* جدول بچ‌ها */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownLeft className="size-4 text-primary" />
            تاریخچه بچ‌های واردشده
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            {isPending ? (
              <TableRowsSkeleton rows={pageSize > 10 ? 8 : pageSize} cols={7} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right">کالا</TableHead>
                    <TableHead className="text-right">موجودی بچ</TableHead>
                    <TableHead className="text-right">قیمت خرید واحد</TableHead>
                    <TableHead className="text-right">تاریخ ثبت</TableHead>
                    <TableHead className="text-right">انقضا</TableHead>
                    <TableHead className="text-right">تخصیص</TableHead>
                    <TableHead className="w-24 text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        رکوردی مطابق فیلترهای انتخابی یافت نشد.
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          {b.clinicProduct.name}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          <span className="font-semibold">
                            {b.quantity.toLocaleString("fa-IR")}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">
                            {b.clinicProduct.unit}
                          </span>
                          {b.initialQuantity > 0 &&
                            b.initialQuantity !== b.quantity && (
                              <span className="block text-[11px] text-muted-foreground">
                                از {b.initialQuantity.toLocaleString("fa-IR")}{" "}
                                {b.clinicProduct.unit} اولیه
                              </span>
                            )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {b.purchasePrice.toLocaleString("fa-IR")}{" "}
                          <span className="text-[11px] text-muted-foreground">
                            تومان
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatJalaliNumeric(new Date(b.createdAt))}
                        </TableCell>
                        <TableCell className="text-xs">
                          {b.expirationDate
                            ? formatJalaliNumeric(new Date(b.expirationDate))
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {b.exclusiveSubService || b.exclusiveTherapist ? (
                            <Badge variant="outline">
                              {b.exclusiveSubService?.title ||
                                b.exclusiveTherapist?.user.fullName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">عمومی</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isSaving}
                              onClick={() => handleOpenEditForm(b)}
                              title="ویرایش رکورد ورود"
                              className="size-8"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isSaving}
                              onClick={() => handleRequestDeleteBatch(b)}
                              title="حذف رکورد ورود"
                              className="size-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          <TablePaginationBar
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            disabled={isPending}
            onPageChange={(nextPage) =>
              updateUrlParams({ page: String(nextPage) })
            }
            onPageSizeChange={(nextSize) =>
              updateUrlParams({ pageSize: String(nextSize), page: "1" })
            }
          />
        </CardContent>
      </Card>

      {/* دکمه شناور پایین سمت چپ برای باز کردن فرم ورود کالا */}
      <Button
        type="button"
        size="icon"
        onClick={handleOpenNewForm}
        title="ثبت ورود کالا به انبار"
        className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
      >
        <Plus className="size-6" />
      </Button>

      {/* مودال فرم ثبت / ویرایش ورود کالا */}
      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        drawerPosition="bottom"
      >
        <ResponsiveDialogTrigger
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <ResponsiveDialogPopup className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editingBatch
                ? `ویرایش ورود کالا: ${editingBatch.clinicProduct.name}`
                : "ثبت ورود بچ جدید به انبار"}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSubmit}>
            <ResponsiveDialogPanel>
              
                <FieldGroup>
                  <Field>
                    <FieldLabel>انتخاب کالا *</FieldLabel>
                    <Select
                      items={productItems}
                      value={productId}
                      disabled={Boolean(editingBatch)}
                      onValueChange={handleProductChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="انتخاب کالا..." />
                      </SelectTrigger>
                      <SelectContent>
                        {productItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!editingBatch &&
                      selectedProduct &&
                      selectedProduct.unsettledDeficit > 0 && (
                        <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                          <span>
                            این کالا دارای{" "}
                            <strong>
                              {selectedProduct.unsettledDeficit.toLocaleString("fa-IR")}{" "}
                              {selectedProduct.unit}
                            </strong>{" "}
                            کسری ثبت‌شده از خدمات قبلی است که بلافاصله پس از ثبت ورود کالا از این بچ کسر و تسویه می‌شود.
                          </span>
                        </div>
                      )}
                  </Field>

                  {hasPackageOption && selectedProduct && (
                    <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/20 p-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={entryMode === "PACKAGE" ? "default" : "ghost"}
                        onClick={() => setEntryMode("PACKAGE")}
                      >
                        بر اساس {selectedProduct.packageUnit}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={entryMode === "UNIT" ? "default" : "ghost"}
                        onClick={() => setEntryMode("UNIT")}
                      >
                        بر اساس {selectedProduct.unit}
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>
                        {editingBatch ? "تعداد کل اولیه" : "تعداد"} (
                        {hasPackageOption && entryMode === "PACKAGE"
                          ? selectedProduct?.packageUnit
                          : selectedProduct?.unit || "واحد"}
                        ) *
                      </FieldLabel>
                      <Input
                        type="number"
                        step="any"
                        min="0.1"
                        placeholder="مثلاً: 5"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                      {hasPackageOption &&
                        entryMode === "PACKAGE" &&
                        previewTotalUnits > 0 && (
                          <FieldDescription className="text-[11px] text-primary">
                            معادل {previewTotalUnits.toLocaleString("fa-IR")}{" "}
                            {selectedProduct?.unit} ثبت می‌شود.
                          </FieldDescription>
                        )}
                    </Field>

                    <Field>
                      <FieldLabel className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        تاریخ انقضا (شمسی)
                      </FieldLabel>
                      <DatePicker
                        calendarType="shamsi"
                        value={expirationDate}
                        onValueChange={setExpirationDate}
                        placeholder="انتخاب تاریخ انقضا"
                        className="w-full"
                        calendarProps={{
                          captionLayout: "dropdown",
                          startMonth: EXPIRATION_START_MONTH,
                          endMonth: EXPIRATION_END_MONTH,
                        }}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel className="flex items-center gap-1">
                        قیمت خرید هر{" "}
                        {hasPackageOption && entryMode === "PACKAGE"
                          ? selectedProduct?.packageUnit
                          : selectedProduct?.unit || "واحد"}{" "}
                        *
                        <TomanIcon className="size-3.5 text-muted-foreground" />
                      </FieldLabel>
                      <PriceInput
                        value={purchasePrice}
                        defaultValue={0}
                        onValueChange={(v) => setPurchasePrice(Number(v) || 0)}
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel className="flex items-center gap-1">
                        قیمت فروش (اختیاری)
                        <TomanIcon className="size-3.5 text-muted-foreground" />
                      </FieldLabel>
                      <PriceInput
                        value={sellingPrice}
                        defaultValue={0}
                        onValueChange={(v) => setSellingPrice(Number(v) || 0)}
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>اختصاص به زیرسرویس خاص (اختیاری)</FieldLabel>
                    <Select
                      items={subServiceItems}
                      value={exclusiveSubId}
                      onValueChange={(v) => v && setExclusiveSubId(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {subServiceItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel>اختصاص به درمانگر خاص (اختیاری)</FieldLabel>
                    <Select
                      items={therapistItems}
                      value={exclusiveTherapistId}
                      onValueChange={(v) => v && setExclusiveTherapistId(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {therapistItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="ml-2 size-4 animate-spin" />}
                {editingBatch ? "ذخیره تغییرات" : "ثبت ورود به انبار"}
              </Button>
              <ResponsiveDialogDesktopOnly>
                <ResponsiveDialogClose
                  render={
                    <Button type="button" variant="outline">
                      انصراف
                    </Button>
                  }
                />
              </ResponsiveDialogDesktopOnly>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogPopup>
      </ResponsiveDialog>

      {/* AlertDialog تایید حذف رکورد ورود کالا (با هشدار مصرفی در خدمات) */}
      <AlertDialog
        open={Boolean(deleteDialogState?.open)}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogState(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteDialogState?.hasUsageWarning && (
                <AlertTriangle className="size-5 text-destructive" />
              )}
              حذف رکورد ورود کالا به انبار
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 leading-relaxed">
              {deleteDialogState?.hasUsageWarning ? (
                <>
                  <span className="block font-semibold text-destructive">
                    هشدار: کالای «{deleteDialogState.productName}» دارای مصرفی
                    استفاده‌شده در خدمات یا انبار است
                    {deleteDialogState.consumedFromBatch > 0 &&
                      ` (${deleteDialogState.consumedFromBatch.toLocaleString("fa-IR")} ${deleteDialogState.unit} از این بچ مصرف شده است)`}
                    .
                  </span>
                  <span className="block">
                    در صورت حذف این رکورد، اطلاعات و موجودی این بچ به‌طور کامل
                    از بین می‌رود و ممکن است در محاسبه موجودی انبار مغایرت ایجاد
                    شود. آیا از حذف آن مطمئن هستید؟
                  </span>
                </>
              ) : (
                <span>
                  آیا از حذف رکورد ورود کالای{" "}
                  <strong>«{deleteDialogState?.productName}»</strong> مطمئن
                  هستید؟ این عملیات قابل بازگشت نیست.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={handleConfirmDeleteBatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDialogState?.hasUsageWarning
                ? "بله، با وجود مصرفی حذف شود"
                : "تایید و حذف"}
            </AlertDialogAction>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}