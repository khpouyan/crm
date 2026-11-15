// components/clinic-dashboard/inventory-products-client.tsx
"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import {
  upsertClinicProductAction,
  deleteClinicProductAction,
} from "@/app/clinic-dashboard/(dashboard)/inventory/actions";
import { TablePaginationBar } from "./table-pagination-bar";
import { ExportDataMenu } from "./export-data-menu";
import { TableRowsSkeleton } from "./inventory-skeletons";

interface ProductRow {
  id: string;
  name: string;
  code: string | null;
  unit: string;
  packageUnit: string | null;
  unitsPerPackage: number;
  alertThreshold: number;
  totalStock: number;
}

interface InventoryProductsClientProps {
  products: ProductRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  initialQuery: string;
  canManage: boolean;
  canExport: boolean;
}

export function InventoryProductsClient({
  products,
  totalCount,
  page,
  pageSize,
  initialQuery,
  canManage,
  canExport,
}: InventoryProductsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);

  // فیلدهای فرم کالا (با واحد بسته‌بندی و واحد مصرف)
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("عدد");
  const [packageUnit, setPackageUnit] = useState("");
  const [unitsPerPackage, setUnitsPerPackage] = useState("1");
  const [alertThreshold, setAlertThreshold] = useState("5");

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({ q: searchInput.trim() || undefined, page: "1" });
  };

  const openNewDialog = () => {
    setEditingProduct(null);
    setName("");
    setCode("");
    setUnit("عدد");
    setPackageUnit("");
    setUnitsPerPackage("1");
    setAlertThreshold("5");
    setDialogOpen(true);
  };

  const openEditDialog = (prod: ProductRow) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCode(prod.code ?? "");
    setUnit(prod.unit);
    setPackageUnit(prod.packageUnit ?? "");
    setUnitsPerPackage(String(prod.unitsPerPackage || 1));
    setAlertThreshold(String(prod.alertThreshold ?? 0));
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await upsertClinicProductAction({
      id: editingProduct?.id,
      name,
      code,
      unit,
      packageUnit,
      unitsPerPackage:
        parseFloat(normalizePersianDigits(unitsPerPackage)) || 1,
      alertThreshold: parseFloat(normalizePersianDigits(alertThreshold)) || 0,
    });
    setIsSaving(false);

    if (res.success) {
      toast.success(
        editingProduct ? "کالا با موفقیت ویرایش شد" : "کالای جدید تعریف شد"
      );
      setDialogOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    const res = await deleteClinicProductAction(id);
    setIsSaving(false);
    if (res.success) {
      toast.success("کالا حذف شد");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      {/* هدر */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            تعریف کالا و اقلام مصرفی
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            مدیریت کالاها، واحد بسته‌بندی (جعبه/رول) و واحد مصرف در خدمات
          </p>
        </div>

        <ExportDataMenu entity="INVENTORY_PRODUCTS" canExport={canExport} />
      </div>

      {/* کارت جدول */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4 text-primary" />
            فهرست کالاهای کلینیک
          </CardTitle>

          <form onSubmit={handleSearchSubmit} className="flex w-full gap-2 sm:max-w-xs">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو نام یا کد کالا..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pr-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              جستجو
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            {isPending ? (
              <TableRowsSkeleton rows={pageSize > 10 ? 8 : pageSize} cols={6} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right">نام کالا</TableHead>
                    <TableHead className="text-right">کد کالا</TableHead>
                    <TableHead className="text-right">ساختار بسته‌بندی</TableHead>
                    <TableHead className="text-right">موجودی فعلی</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    {canManage && (
                      <TableHead className="w-24 text-left">عملیات</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        کالایی یافت نشد.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => {
                      const hasPkg =
                        product.packageUnit && product.unitsPerPackage > 1;
                      const fullPackages = hasPkg
                        ? Math.floor(
                            product.totalStock / product.unitsPerPackage
                          )
                        : 0;
                      const isLow = product.totalStock <= product.alertThreshold;

                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {product.code || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {hasPkg ? (
                              <span>
                                هر <strong>{product.packageUnit}</strong> ={" "}
                                {product.unitsPerPackage.toLocaleString("fa-IR")}{" "}
                                {product.unit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                تک‌واحدی ({product.unit})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            <div className="font-semibold">
                              {product.totalStock.toLocaleString("fa-IR")}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                {product.unit}
                              </span>
                            </div>
                            {hasPkg && product.totalStock > 0 && (
                              <div className="text-[11px] text-muted-foreground">
                                معادل {fullPackages.toLocaleString("fa-IR")}{" "}
                                {product.packageUnit}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.totalStock === 0 ? (
                              <Badge variant="destructive">ناموجود</Badge>
                            ) : isLow ? (
                              <Badge
                                variant="outline"
                                className="border-amber-500 text-amber-600"
                              >
                                رو به اتمام
                              </Badge>
                            ) : (
                              <Badge variant="secondary">موجود</Badge>
                            )}
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-left">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => openEditDialog(product)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
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

      {/* دکمه شناور پایین سمت چپ برای باز کردن فرم تعریف کالا */}
      {canManage && (
        <Button
          type="button"
          size="icon"
          onClick={openNewDialog}
          title="تعریف کالای جدید"
          className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
        >
          <Plus className="size-6" />
        </Button>
      )}

      {/* مودال فرم تعریف / ویرایش کالا */}
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
              {editingProduct ? "ویرایش کالا" : "تعریف کالای جدید"}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <form onSubmit={handleSave}>
            <ResponsiveDialogPanel className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>نام کالا / مصرفی *</Label>
                  <Input
                    placeholder="مثلاً: ژل eptq، رول روتختی..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>کد کالا (اختیاری)</Label>
                  <Input
                    placeholder="مثلاً: PRD-101"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
              </div>

              {/* واحد مصرف و واحد بسته‌بندی */}
              <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>واحد مصرف در خدمت (جزء) *</Label>
                    <Input
                      placeholder="مثلاً: سرنگ، برش، عدد، سی‌سی"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>واحد بسته‌بندی / خرید (اختیاری)</Label>
                    <Input
                      placeholder="مثلاً: جعبه، رول، پک"
                      value={packageUnit}
                      onChange={(e) => setPackageUnit(e.target.value)}
                    />
                  </div>
                </div>

                {packageUnit.trim() !== "" && (
                  <div className="space-y-2">
                    <Label>
                      تعداد «{unit || "واحد مصرف"}» داخل هر «{packageUnit}» *
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="مثلاً: 3 برای جعبه ژل یا 10 برای رول روتختی"
                      value={unitsPerPackage}
                      onChange={(e) => setUnitsPerPackage(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  نقطه هشدار اتمام موجودی (بر اساس {unit || "واحد مصرف"})
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                />
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="ml-2 size-4 animate-spin" />}
                {editingProduct ? "ذخیره تغییرات" : "ثبت کالا"}
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
