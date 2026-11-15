// components/clinic-dashboard/inventory-stock-out-client.tsx
"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { TomanIcon } from "@/components/ui/toman-icon";
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
import { stockOutProductAction } from "@/app/clinic-dashboard/(dashboard)/inventory/actions";
import { TablePaginationBar } from "./table-pagination-bar";
import { TableRowsSkeleton } from "./inventory-skeletons";

interface InventoryStockOutClientProps {
  stockOuts: any[];
  totalCount: number;
  page: number;
  pageSize: number;
  products: { id: string; name: string; unit: string; totalStock: number }[];
}

export function InventoryStockOutClient({
  stockOuts,
  totalCount,
  page,
  pageSize,
  products,
}: InventoryStockOutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [reason, setReason] = useState("");

  const productItems = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.name} (موجودی: ${p.totalStock.toLocaleString("fa-IR")} ${p.unit})`,
      })),
    [products]
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

  const handleOpenDialog = () => {
    setProductId(products[0]?.id ?? "");
    setQuantity("");
    setSellingPrice(0);
    setReason("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await stockOutProductAction({
      clinicProductId: productId,
      quantity: parseFloat(normalizePersianDigits(quantity)) || 0,
      sellingPrice: sellingPrice > 0 ? sellingPrice : null,
      reason,
    });
    setIsSaving(false);

    if (res.success) {
      toast.success("خروج کالا از انبار ثبت شد");
      setDialogOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          خروج دستی کالا از انبار
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          ثبت مصرف داخلی، ضایعات یا فروش مستقیم کالاها (کسر خودکار بر اساس نزدیک‌ترین تاریخ انقضا)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpRight className="size-4 text-destructive" />
            تاریخچه خروج دستی کالاها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            {isPending ? (
              <TableRowsSkeleton rows={pageSize > 10 ? 8 : pageSize} cols={5} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right">نام کالا</TableHead>
                    <TableHead className="text-right">مقدار خروجی</TableHead>
                    <TableHead className="text-right">علت / توضیح</TableHead>
                    <TableHead className="text-right">ثبت‌کننده</TableHead>
                    <TableHead className="text-right">تاریخ ثبت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockOuts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        هنوز خروج دستی ثبت نشده است.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockOuts.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.clinicProduct.name}
                        </TableCell>
                        <TableCell className="tabular-nums font-semibold">
                          {row.quantity.toLocaleString("fa-IR")}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {row.clinicProduct.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.reason || "خروج دستی"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.createdBy?.user.fullName || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatJalaliNumeric(new Date(row.createdAt))}
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

      {/* دکمه شناور پایین سمت چپ برای باز کردن فرم خروج کالا */}
      <Button
        type="button"
        size="icon"
        variant="destructive"
        onClick={handleOpenDialog}
        title="ثبت خروج کالا از انبار"
        className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
      >
        <Plus className="size-6" />
      </Button>

      {/* مودال فرم خروج کالا */}
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
        <ResponsiveDialogPopup className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>ثبت خروج کالا از انبار</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <form onSubmit={handleSubmit}>
            <ResponsiveDialogPanel className="space-y-4">
              <div className="space-y-2">
                <Label>انتخاب کالا *</Label>
                <Select
                  items={productItems}
                  value={productId}
                  onValueChange={(v) => v && setProductId(v)}
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

              <div className="space-y-2">
                <Label>مقدار خروجی (واحد مصرف) *</Label>
                <Input
                  type="number"
                  step="any"
                  min="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  قیمت فروش واحد (فقط در صورت فروش مستقیم)
                  <TomanIcon className="size-3.5 text-muted-foreground" />
                </Label>
                <PriceInput
                  value={sellingPrice}
                  onValueChange={(v) => setSellingPrice(Number(v) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>علت خروج</Label>
                <Input
                  placeholder="مثلاً: ضایعات، مصرف عمومی کلینیک، فروش مستقیم..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter>
              <Button type="submit" variant="destructive" disabled={isSaving}>
                {isSaving && <Loader2 className="ml-2 size-4 animate-spin" />}
                تایید و کسر از موجودی
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
