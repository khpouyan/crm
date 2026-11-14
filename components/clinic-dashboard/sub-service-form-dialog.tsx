// components/clinic-dashboard/sub-service-form-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { TomanIcon } from "@/components/ui/toman-icon";
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
  ResponsiveDialogDescription,
  ResponsiveDialogDesktopOnly,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogPanel,
  ResponsiveDialogPopup,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger
} from "@/components/ui/responsive-dialog";
import {
  upsertSubServiceAction,
  ServiceAttributeItem,
  DefaultProductInput,
} from "@/app/clinic-dashboard/(dashboard)/services/actions";
import { toast } from "sonner";

interface SubServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceTitle: string;
  editingSubService?: {
    id: string;
    title: string;
    price: number;
    attributes: unknown;
    defaultProducts: {
      clinicProduct: { id: string };
      quantity: number;
    }[];
  } | null;
  clinicProducts: { id: string; name: string; unit: string }[];
}

export function SubServiceFormDialog({
  open,
  onOpenChange,
  serviceId,
  serviceTitle,
  editingSubService,
  clinicProducts,
}: SubServiceFormDialogProps) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [attributes, setAttributes] = useState<ServiceAttributeItem[]>([]);
  const [defaultProducts, setDefaultProducts] = useState<DefaultProductInput[]>([]);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editingSubService?.title ?? "");
      setPrice(editingSubService?.price ?? 0);

      const parsedAttrs = Array.isArray(editingSubService?.attributes)
        ? (editingSubService?.attributes as ServiceAttributeItem[])
        : [];
      setAttributes(parsedAttrs);

      const mappedProducts =
        editingSubService?.defaultProducts.map((dp) => ({
          clinicProductId: dp.clinicProduct.id,
          quantity: dp.quantity,
        })) ?? [];
      setDefaultProducts(mappedProducts);
    }
  }, [open, editingSubService]);

  const addAttribute = () => {
    setAttributes((prev) => [...prev, { key: "", value: "" }]);
  };

  const updateAttribute = (index: number, field: "key" | "value", val: string) => {
    setAttributes((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item))
    );
  };

  const removeAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addDefaultProduct = () => {
    if (clinicProducts.length === 0) {
      toast.error("ابتدا در بخش انبار کالا، اقلام مصرفی را تعریف کنید.");
      return;
    }
    setDefaultProducts((prev) => [
      ...prev,
      { clinicProductId: clinicProducts[0].id, quantity: 1 },
    ]);
  };

  const updateDefaultProduct = (
    index: number,
    field: keyof DefaultProductInput,
    val: string | number
  ) => {
    setDefaultProducts((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item))
    );
  };

  const removeDefaultProduct = (index: number) => {
    setDefaultProducts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("عنوان زیرسرویس الزامی است");
      return;
    }
    if (!price || price <= 0) {
      toast.error("وارد کردن قیمت اجباری است");
      return;
    }

    setIsPending(true);
    const res = await upsertSubServiceAction({
      id: editingSubService?.id,
      serviceId,
      title,
      price,
      attributes,
      defaultProducts,
    });
    setIsPending(false);

    if (res.success) {
      toast.success(
        editingSubService ? "زیرسرویس ویرایش شد" : "زیرسرویس جدید اضافه شد"
      );
      onOpenChange(false);
    } else {
      toast.error(res.error || "خطایی رخ داد");
    }
  };

  return (
    
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} drawerPosition="bottom">
      <ResponsiveDialogTrigger className="sr-only" tabIndex={-1} aria-hidden="true"/>
      <ResponsiveDialogPopup className="sm:max-w-xl" >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {editingSubService ? "ویرایش زیرسرویس" : "افزودن زیرسرویس جدید"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            زیرمجموعه خدمت: <strong className="text-foreground">{serviceTitle}</strong>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit}>
          <ResponsiveDialogPanel className="flex flex-col gap-5">
            {/* بخش ۱: نام و قیمت اجباری */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sub-title">نام زیرسرویس *</Label>
                <Input
                  id="sub-title"
                  placeholder="مثلاً: توتال بادی، دست کامل..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="sub-price" className="flex items-center gap-1">
                  تعرفه / قیمت (اجباری) *
                  <TomanIcon className="size-3.5 text-muted-foreground" />
                </Label>
                <PriceInput
                  id="sub-price"
                  value={price}
                  onValueChange={(val) => setPrice(Number(val) || 0)}
                  placeholder="مثلاً: ۱,۲۰۰,۰۰۰"
                />
              </div>
            </div>

            {/* بخش ۲: مشخصه‌های دلخواه */}
            <div className="flex flex-col gap-3 rounded-xl border p-3.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" />
                  مشخصه‌های دلخواه سرویس
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAttribute}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="size-3.5" />
                  افزودن مشخصه
                </Button>
              </div>

              {attributes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  می‌توانید فیلدهای دلخواه مثل «نوع لیزر: کندلا» یا «تعداد جلسات: ۴» اضافه کنید.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {attributes.map((attr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="نام مشخصه (مثلاً: نوع دستگاه)"
                        value={attr.key}
                        onChange={(e) => updateAttribute(idx, "key", e.target.value)}
                        className="h-9 text-sm"
                      />
                      <Input
                        placeholder="مقدار (مثلاً: کندلا)"
                        value={attr.value}
                        onChange={(e) => updateAttribute(idx, "value", e.target.value)}
                        className="h-9 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttribute(idx)}
                        className="size-9 shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* بخش ۳: اقلام مصرفی پیش‌فرض */}
            <div className="flex flex-col gap-3 rounded-xl border p-3.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <Package className="size-4 text-primary" />
                  مصرفی‌های پیش‌فرض (کسر خودکار از انبار)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDefaultProduct}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="size-3.5" />
                  افزودن کالا
                </Button>
              </div>

              {defaultProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  اقلامی مثل روتختی یا ژل که با هر بار انجام این زیرسرویس مصرف می‌شوند را انتخاب کنید.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {defaultProducts.map((item, idx) => {
                    const selectedProd = clinicProducts.find(
                      (p) => p.id === item.clinicProductId
                    );
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={item.clinicProductId}
                          onValueChange={(val) => {
                            if (val) updateDefaultProduct(idx, "clinicProductId", val);
                          }}
                        >
                          <SelectTrigger className="h-9 flex-1 text-sm">
                            <SelectValue placeholder="انتخاب کالا از انبار" />
                          </SelectTrigger>
                          <SelectContent>
                            {clinicProducts.map((prod) => (
                              <SelectItem key={prod.id} value={prod.id}>
                                {prod.name} ({prod.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1.5 w-32">
                          <Input
                            type="number"
                            step="any"
                            min="0.1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateDefaultProduct(
                                idx,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-9 text-sm text-center"
                          />
                          <span className="text-xs text-muted-foreground shrink-0">
                            {selectedProd?.unit || "عدد"}
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDefaultProduct(idx)}
                          className="size-9 shrink-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ResponsiveDialogPanel>

          <ResponsiveDialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
              {editingSubService ? "ذخیره تغییرات" : "ثبت زیرسرویس"}
            </Button>
            <ResponsiveDialogDesktopOnly>
              <ResponsiveDialogClose
                render={
                  <Button type="button" variant="outline" disabled={isPending}>
                    انصراف
                  </Button>
                }
              />
            </ResponsiveDialogDesktopOnly>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogPopup>
    </ResponsiveDialog>
  );
}