// components/clinic-dashboard/sub-service-form-dialog.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { ServiceTimingMode } from "@prisma/client"
import { Plus, Trash2, Loader2, Package, Sparkles, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { PriceInput } from "@/components/ui/price-input"
import { TomanIcon } from "@/components/ui/toman-icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog"
import {
  upsertSubServiceAction,
  ServiceAttributeItem,
  DefaultProductInput,
} from "@/app/clinic-dashboard/(dashboard)/services/actions"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"
import { toast } from "sonner"
import { SearchableSelect } from "@/components/ui/searchable-select"

export interface SubServiceTimingData {
  timingMode: ServiceTimingMode | null
  prepBeforeMinutes: number | null
  durationMinutes: number | null
  stage1Minutes: number | null
  freeGapMinutes: number | null
  stage2Minutes: number | null
  restAfterMinutes: number | null
  requiresPrivacy: boolean | null
}

interface SubServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: string
  serviceTitle: string
  editingSubService?: ({
    id: string
    title: string
    price: number
    attributes: unknown
    defaultProducts: {
      clinicProduct: { id: string }
      quantity: number
    }[]
  } & Partial<SubServiceTimingData>) | null
  clinicProducts: { id: string; name: string; unit: string }[]
}

export function SubServiceFormDialog({
  open,
  onOpenChange,
  serviceId,
  serviceTitle,
  editingSubService,
  clinicProducts,
}: SubServiceFormDialogProps) {
  const [title, setTitle] = useState("")
  const [price, setPrice] = useState<number>(0)
  const [attributes, setAttributes] = useState<ServiceAttributeItem[]>([])
  const [defaultProducts, setDefaultProducts] = useState<DefaultProductInput[]>(
    []
  )

  // تنظیم زمان‌بندی اختصاصی زیرسرویس یا ارث‌بری از خدمت اصلی
  const [overrideTiming, setOverrideTiming] = useState(false)
  const [timingMode, setTimingMode] = useState<ServiceTimingMode>(
    ServiceTimingMode.SINGLE_STAGE
  )
  const [prepBeforeMinutes, setPrepBeforeMinutes] = useState("0")
  const [durationMinutes, setDurationMinutes] = useState("30")
  const [stage1Minutes, setStage1Minutes] = useState("15")
  const [freeGapMinutes, setFreeGapMinutes] = useState("30")
  const [stage2Minutes, setStage2Minutes] = useState("15")
  const [restAfterMinutes, setRestAfterMinutes] = useState("0")
  const [requiresPrivacy, setRequiresPrivacy] = useState(false)

  const [isPending, setIsPending] = useState(false)

  const productSelectItems = useMemo(
    () =>
      clinicProducts.map((prod) => ({
        value: prod.id,
        label: `${prod.name} (${prod.unit})`,
      })),
    [clinicProducts]
  )

  useEffect(() => {
    if (open) {
      setTitle(editingSubService?.title ?? "")
      setPrice(editingSubService?.price ?? 0)

      const parsedAttrs = Array.isArray(editingSubService?.attributes)
        ? (editingSubService?.attributes as ServiceAttributeItem[])
        : []
      setAttributes(parsedAttrs)

      const mappedProducts =
        editingSubService?.defaultProducts.map((dp) => ({
          clinicProductId: dp.clinicProduct.id,
          quantity: dp.quantity,
        })) ?? []
      setDefaultProducts(mappedProducts)

      const hasCustom =
        editingSubService?.timingMode !== null &&
        editingSubService?.timingMode !== undefined
      setOverrideTiming(hasCustom)
      setTimingMode(
        editingSubService?.timingMode ?? ServiceTimingMode.SINGLE_STAGE
      )
      setPrepBeforeMinutes(String(editingSubService?.prepBeforeMinutes ?? 0))
      setDurationMinutes(String(editingSubService?.durationMinutes ?? 30))
      setStage1Minutes(String(editingSubService?.stage1Minutes ?? 15))
      setFreeGapMinutes(String(editingSubService?.freeGapMinutes ?? 30))
      setStage2Minutes(String(editingSubService?.stage2Minutes ?? 15))
      setRestAfterMinutes(String(editingSubService?.restAfterMinutes ?? 0))
      setRequiresPrivacy(Boolean(editingSubService?.requiresPrivacy ?? false))
    }
  }, [open, editingSubService])

  const addAttribute = () => {
    setAttributes((prev) => [...prev, { key: "", value: "" }])
  }

  const updateAttribute = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    setAttributes((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: val } : item
      )
    )
  }

  const removeAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, idx) => idx !== index))
  }

  const addDefaultProduct = () => {
    if (clinicProducts.length === 0) {
      toast.error("ابتدا در بخش انبار کالا، اقلام مصرفی را تعریف کنید.")
      return
    }
    setDefaultProducts((prev) => [
      ...prev,
      { clinicProductId: clinicProducts[0].id, quantity: 1 },
    ])
  }

  const updateDefaultProduct = (
    index: number,
    field: keyof DefaultProductInput,
    val: string | number
  ) => {
    setDefaultProducts((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: val } : item
      )
    )
  }

  const removeDefaultProduct = (index: number) => {
    setDefaultProducts((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("عنوان زیرسرویس الزامی است")
      return
    }
    if (!price || price <= 0) {
      toast.error("وارد کردن قیمت اجباری است")
      return
    }

    setIsPending(true)
    const res = await upsertSubServiceAction({
      id: editingSubService?.id,
      serviceId,
      title,
      price,
      attributes,
      defaultProducts,
      timing: {
        overrideTiming,
        timingMode,
        prepBeforeMinutes:
          Number(normalizePersianDigits(prepBeforeMinutes)) || 0,
        durationMinutes: Math.max(
          5,
          Number(normalizePersianDigits(durationMinutes)) || 30
        ),
        stage1Minutes: Math.max(
          5,
          Number(normalizePersianDigits(stage1Minutes)) || 15
        ),
        freeGapMinutes: Math.max(
          0,
          Number(normalizePersianDigits(freeGapMinutes)) || 0
        ),
        stage2Minutes: Math.max(
          5,
          Number(normalizePersianDigits(stage2Minutes)) || 15
        ),
        restAfterMinutes:
          Number(normalizePersianDigits(restAfterMinutes)) || 0,
        requiresPrivacy,
      },
    })
    setIsPending(false)

    if (res.success) {
      toast.success(
        editingSubService ? "زیرسرویس ویرایش شد" : "زیرسرویس جدید اضافه شد"
      )
      onOpenChange(false)
    } else {
      toast.error(res.error || "خطایی رخ داد")
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      drawerPosition="bottom"
    >
      <ResponsiveDialogTrigger
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <ResponsiveDialogPopup className="w-full max-w-none overflow-hidden rounded-t-2xl sm:max-w-xl sm:rounded-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {editingSubService ? "ویرایش زیرسرویس" : "افزودن زیرسرویس جدید"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            زیرمجموعه خدمت:{" "}
            <strong className="text-foreground">{serviceTitle}</strong>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit}>
          <ResponsiveDialogPanel className="no-scrollbar flex max-h-[70vh] flex-col gap-5 overflow-y-auto">
            {/* بخش ۱: نام و قیمت اجباری */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sub-title">نام زیرسرویس *</Label>
                <Input
                  id="sub-title"
                  placeholder="مثلاً: توتال بادی، دست کامل، PRP مو..."
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

            {/* بخش زمان‌بندی زیرسرویس */}
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <Checkbox
                  checked={overrideTiming}
                  onCheckedChange={(v) => setOverrideTiming(Boolean(v))}
                />
                <Clock className="size-4 text-primary" />
                <span>
                  تنظیم زمان‌بندی مستقل برای این زیرسرویس (در غیر این صورت از «{serviceTitle}» ارث می‌برد)
                </span>
              </label>

              {overrideTiming && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <Label>نوع ساختار زمانی زیرسرویس</Label>
                    <Select
                      value={timingMode}
                      onValueChange={(val) =>
                        setTimingMode(
                          (val as ServiceTimingMode) ||
                            ServiceTimingMode.SINGLE_STAGE
                        )
                      }
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue>
                          {timingMode === ServiceTimingMode.SPLIT_STAGE
                            ? "چندمرحله‌ای با تایم آزاد میانی (مثل PRP)"
                            : "تک‌مرحله‌ای استاندارد"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ServiceTimingMode.SINGLE_STAGE}>
                          تک‌مرحله‌ای استاندارد
                        </SelectItem>
                        <SelectItem value={ServiceTimingMode.SPLIT_STAGE}>
                          چندمرحله‌ای با تایم آزاد میانی (مثل PRP)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="sub-prep">حضور قبل از شروع (دقیقه)</Label>
                      <Input
                        id="sub-prep"
                        type="number"
                        min={0}
                        max={240}
                        dir="ltr"
                        className="bg-background"
                        value={prepBeforeMinutes}
                        onChange={(e) => setPrepBeforeMinutes(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="sub-rest">استراحت / پاکسازی (دقیقه)</Label>
                      <Input
                        id="sub-rest"
                        type="number"
                        min={0}
                        max={180}
                        dir="ltr"
                        className="bg-background"
                        value={restAfterMinutes}
                        onChange={(e) => setRestAfterMinutes(e.target.value)}
                      />
                    </div>
                  </div>

                  {timingMode === ServiceTimingMode.SINGLE_STAGE ? (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="sub-duration">مدت انجام (دقیقه)</Label>
                      <Input
                        id="sub-duration"
                        type="number"
                        min={5}
                        max={480}
                        dir="ltr"
                        className="bg-background"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="sub-s1">مرحله ۱ (دقیقه)</Label>
                        <Input
                          id="sub-s1"
                          type="number"
                          min={5}
                          max={240}
                          dir="ltr"
                          className="bg-background"
                          value={stage1Minutes}
                          onChange={(e) => setStage1Minutes(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="sub-gap">تایم آزاد میانی (دقیقه)</Label>
                        <Input
                          id="sub-gap"
                          type="number"
                          min={0}
                          max={360}
                          dir="ltr"
                          className="bg-background"
                          value={freeGapMinutes}
                          onChange={(e) => setFreeGapMinutes(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="sub-s2">مرحله ۲ (دقیقه)</Label>
                        <Input
                          id="sub-s2"
                          type="number"
                          min={5}
                          max={240}
                          dir="ltr"
                          className="bg-background"
                          value={stage2Minutes}
                          onChange={(e) => setStage2Minutes(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                    <Checkbox
                      checked={requiresPrivacy}
                      onCheckedChange={(v) => setRequiresPrivacy(Boolean(v))}
                    />
                    <span>نیازمند فضای خالی / پرایوسی مراجع</span>
                  </label>
                </div>
              )}
            </div>

            {/* بخش ۲: مشخصه‌های دلخواه */}
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3.5">
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
                        onChange={(e) =>
                          updateAttribute(idx, "key", e.target.value)
                        }
                        className="h-9 text-sm"
                      />
                      <Input
                        placeholder="مقدار (مثلاً: کندلا)"
                        value={attr.value}
                        onChange={(e) =>
                          updateAttribute(idx, "value", e.target.value)
                        }
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
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3.5">
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
                    )
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <SearchableSelect
                            options={productSelectItems}
                            value={item.clinicProductId}
                            placeholder="انتخاب کالا از انبار..."
                            onValueChange={(val) => {
                              if (val && val !== "NONE") {
                                updateDefaultProduct(
                                  idx,
                                  "clinicProductId",
                                  val
                                )
                              }
                            }}
                          />
                        </div>

                        <div className="flex w-32 items-center gap-1.5">
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
                            className="h-9 text-center text-sm"
                          />
                          <span className="shrink-0 text-xs text-muted-foreground">
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
                    )
                  })}
                </div>
              )}
            </div>
          </ResponsiveDialogPanel>

          <ResponsiveDialogFooter className="sm:rounded-b-2xl">
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
  )
}