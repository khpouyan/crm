// components/clinic-dashboard/inventory-stock-in-client.tsx
"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, ArrowDownLeft, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PriceInput } from "@/components/ui/price-input";
import { TomanIcon } from "@/components/ui/toman-icon";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatJalaliNumeric } from "@/lib/jalali";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { stockInBatchAction } from "@/app/clinic-dashboard/(dashboard)/inventory/actions";
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

  // مودال ثبت ورود کالا
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [entryMode, setEntryMode] = useState<"UNIT" | "PACKAGE">("UNIT");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [exclusiveSubId, setExclusiveSubId] = useState<string>("NONE");
  const [exclusiveTherapistId, setExclusiveTherapistId] =
    useState<string>("NONE");

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
        label: p.packageUnit
          ? `${p.name} (${p.packageUnit} / ${p.unit})`
          : `${p.name} (${p.unit})`,
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

  const handleOpenForm = () => {
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

  const handleProductChange = (val: string | null) => {
    if (!val) return;
    setProductId(val);
    const prod = products.find((p) => p.id === val);
    setEntryMode(
      prod?.packageUnit && prod.unitsPerPackage > 1 ? "PACKAGE" : "UNIT"
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await stockInBatchAction({
      clinicProductId: productId,
      entryMode: hasPackageOption ? entryMode : "UNIT",
      quantity: parseFloat(normalizePersianDigits(quantity)) || 0,
      purchasePrice,
      sellingPrice: sellingPrice > 0 ? sellingPrice : null,
      expirationDate: expirationDate ? expirationDate.toISOString() : null,
      exclusiveSubServiceId:
        exclusiveSubId !== "NONE" ? exclusiveSubId : null,
      exclusiveTherapistId:
        exclusiveTherapistId !== "NONE" ? exclusiveTherapistId : null,
    });
    setIsSaving(false);

    if (res.success) {
      toast.success("ورود کالا و بچ جدید با موفقیت ثبت شد");
      setDialogOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  // پیش‌نمایش محاسبه خودکار بسته به جزء
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

      {/* نوار فیلتر (از تاریخ، تا تاریخ، خدمت، پرسنل) */}
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
              <TableRowsSkeleton rows={pageSize > 10 ? 8 : pageSize} cols={6} />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
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
        onClick={handleOpenForm}
        title="ثبت ورود کالا به انبار"
        className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
      >
        <Plus className="size-6" />
      </Button>

      {/* مودال فرم ثبت ورود کالا */}
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
              ثبت ورود بچ جدید به انبار
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <form onSubmit={handleSubmit}>
            <ResponsiveDialogPanel className="space-y-4">
              <div className="space-y-2">
                <Label>انتخاب کالا *</Label>
                <Select
                  items={productItems}
                  value={productId}
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
              </div>

              {/* انتخاب نحوه ورود (بر اساس بسته یا واحد مصرف) */}
              {hasPackageOption && selectedProduct && (
                <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/20 p-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={entryMode === "PACKAGE" ? "default" : "ghost"}
                    onClick={() => setEntryMode("PACKAGE")}
                  >
                    ورود بر اساس {selectedProduct.packageUnit}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={entryMode === "UNIT" ? "default" : "ghost"}
                    onClick={() => setEntryMode("UNIT")}
                  >
                    ورود بر اساس {selectedProduct.unit}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    تعداد (
                    {hasPackageOption && entryMode === "PACKAGE"
                      ? selectedProduct?.packageUnit
                      : selectedProduct?.unit || "واحد"}
                    ) *
                  </Label>
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
                      <p className="text-[11px] text-primary">
                        معادل {previewTotalUnits.toLocaleString("fa-IR")}{" "}
                        {selectedProduct?.unit} در انبار ثبت می‌شود.
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    تاریخ انقضا (شمسی)
                  </Label>
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    قیمت خرید هر{" "}
                    {hasPackageOption && entryMode === "PACKAGE"
                      ? selectedProduct?.packageUnit
                      : selectedProduct?.unit || "واحد"}{" "}
                    *
                    <TomanIcon className="size-3.5 text-muted-foreground" />
                  </Label>
                  <PriceInput
                    value={purchasePrice}
                    onValueChange={(v) => setPurchasePrice(Number(v) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    قیمت فروش (اختیاری)
                    <TomanIcon className="size-3.5 text-muted-foreground" />
                  </Label>
                  <PriceInput
                    value={sellingPrice}
                    onValueChange={(v) => setSellingPrice(Number(v) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>اختصاص به زیرسرویس خاص (اختیاری)</Label>
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
              </div>

              <div className="space-y-2">
                <Label>اختصاص به درمانگر خاص (اختیاری)</Label>
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
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="ml-2 size-4 animate-spin" />}
                ثبت ورود به انبار
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
    </div>
  );
}