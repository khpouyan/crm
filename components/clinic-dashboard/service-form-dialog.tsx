// components/clinic-dashboard/service-form-dialog.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { ServiceTimingMode } from "@prisma/client"
import {
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Package,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
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
import { upsertServiceAction } from "@/app/clinic-dashboard/(dashboard)/services/actions"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"
import { toast } from "sonner"

export interface ServiceTimingSummary {
  timingMode: ServiceTimingMode
  prepBeforeMinutes: number
  durationMinutes: number
  stage1Minutes: number
  freeGapMinutes: number
  stage2Minutes: number
  restAfterMinutes: number
  requiresPrivacy: boolean
}

interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingService?: ({
    id: string
    title: string
    assignedStaff: { id: string }[]
    defaultServiceProducts?: {
      id: string
      quantity: number
      clinicProduct: { id: string; name: string; unit: string }
    }[]
  } & Partial<ServiceTimingSummary>) | null
  activeStaff: {
    id: string
    hasAllServicesAccess?: boolean
    user: { fullName: string | null; phone: string }
    role: { name: string }
  }[]
  clinicProducts: { id: string; name: string; unit: string }[]
}

interface DraftServiceProduct {
  uid: string
  clinicProductId: string
  quantity: string
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  editingService,
  activeStaff,
  clinicProducts,
}: ServiceFormDialogProps) {
  const [title, setTitle] = useState("")
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [defaultProducts, setDefaultProducts] = useState<DraftServiceProduct[]>(
    []
  )

  // وضعیت باز/بسته بودن بخش‌های جمع‌شونده (پیش‌فرض بسته)
  const [isTimingOpen, setIsTimingOpen] = useState(false)
  const [isStaffOpen, setIsStaffOpen] = useState(false)

  // تنظیمات پیش‌فرض زمان‌بندی سرویس
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

  useEffect(() => {
    if (open) {
      setTitle(editingService?.title ?? "")
      setSelectedStaffIds(editingService?.assignedStaff.map((s) => s.id) ?? [])
      setDefaultProducts(
        editingService?.defaultServiceProducts?.map((dp) => ({
          uid: dp.id,
          clinicProductId: dp.clinicProduct.id,
          quantity: String(dp.quantity),
        })) ?? []
      )
      setIsTimingOpen(false)
      setIsStaffOpen(false)
      setTimingMode(editingService?.timingMode ?? ServiceTimingMode.SINGLE_STAGE)
      setPrepBeforeMinutes(String(editingService?.prepBeforeMinutes ?? 0))
      setDurationMinutes(String(editingService?.durationMinutes ?? 30))
      setStage1Minutes(String(editingService?.stage1Minutes ?? 15))
      setFreeGapMinutes(String(editingService?.freeGapMinutes ?? 30))
      setStage2Minutes(String(editingService?.stage2Minutes ?? 15))
      setRestAfterMinutes(String(editingService?.restAfterMinutes ?? 0))
      setRequiresPrivacy(Boolean(editingService?.requiresPrivacy ?? false))
    }
  }, [open, editingService])

  const productSelectItems = useMemo(
    () => [
      { value: "NONE", label: "انتخاب کالا از انبار..." },
      ...clinicProducts.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.unit})`,
      })),
    ],
    [clinicProducts]
  )

  const toggleStaff = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    )
  }

  const handleAddProductRow = () => {
    setDefaultProducts((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        clinicProductId: "NONE",
        quantity: "1",
      },
    ])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("لطفاً عنوان خدمت را وارد کنید")
      return
    }

    const mappedProducts = defaultProducts
      .filter((p) => p.clinicProductId !== "NONE" && parseFloat(p.quantity) > 0)
      .map((p) => ({
        clinicProductId: p.clinicProductId,
        quantity: parseFloat(normalizePersianDigits(p.quantity)) || 0,
      }))

    setIsPending(true)
    const res = await upsertServiceAction({
      id: editingService?.id,
      title,
      assignedStaffIds: selectedStaffIds,
      defaultProducts: mappedProducts,
      timing: {
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
        editingService ? "خدمت با موفقیت ویرایش شد" : "خدمت جدید ایجاد شد"
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
            {editingService ? "ویرایش خدمت" : "افزودن خدمت جدید"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            عنوان، زمان‌بندی پیش‌فرض، مصرفی مشترک و پرسنل مجاز را تعیین کنید.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit}>
          <ResponsiveDialogPanel className="no-scrollbar max-h-[55dvh] overflow-y-auto sm:max-h-[70vh]">
            <div className="px-5 pb-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="service-title">عنوان خدمت *</FieldLabel>
                  <Input
                    id="service-title"
                    placeholder="مثلاً: PRP، تزریق بوتاکس، لیزر موهای زائد..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>

                {/* بخش زمان‌بندی پیش‌فرض سرویس */}
                <div className="rounded-xl border bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Clock className="size-4 text-primary" />
                      <span>زمان‌بندی پیش‌فرض</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setIsTimingOpen((prev) => !prev)}
                      aria-expanded={isTimingOpen}
                    >
                      <SlidersHorizontal className="size-3.5 text-primary" />
                      <span>
                        {isTimingOpen ? "بستن زمان‌بندی" : "تنظیم زمان‌بندی"}
                      </span>
                      <ChevronDown
                        className={`size-3.5 transition-transform ${
                          isTimingOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </div>

                  {isTimingOpen && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      <Field>
                        <FieldLabel>نوع ساختار زمانی سرویس</FieldLabel>
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
                      </Field>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor="srv-prep-before">
                            حضور مراجع قبل از شروع (دقیقه)
                          </FieldLabel>
                          <Input
                            id="srv-prep-before"
                            type="number"
                            min={0}
                            max={240}
                            dir="ltr"
                            className="bg-background"
                            value={prepBeforeMinutes}
                            onChange={(e) =>
                              setPrepBeforeMinutes(e.target.value)
                            }
                          />
                          <FieldDescription className="text-[11px]">
                            مثلاً بی‌حسی یا پذیرش پیش از انجام
                          </FieldDescription>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="srv-rest-after">
                            زمان استراحت / پاکسازی بعد از کار (دقیقه)
                          </FieldLabel>
                          <Input
                            id="srv-rest-after"
                            type="number"
                            min={0}
                            max={180}
                            dir="ltr"
                            className="bg-background"
                            value={restAfterMinutes}
                            onChange={(e) =>
                              setRestAfterMinutes(e.target.value)
                            }
                          />
                        </Field>
                      </div>

                      {timingMode === ServiceTimingMode.SINGLE_STAGE ? (
                        <Field>
                          <FieldLabel htmlFor="srv-duration">
                            مدت انجام سرویس (دقیقه)
                          </FieldLabel>
                          <Input
                            id="srv-duration"
                            type="number"
                            min={5}
                            max={480}
                            dir="ltr"
                            className="bg-background"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(e.target.value)}
                          />
                        </Field>
                      ) : (
                        <div className="space-y-2.5 rounded-lg border border-primary/25 bg-primary/5 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                            <Sparkles className="size-3.5" />
                            مراحل سرویس چندمرحله‌ای (مثلاً PRP)
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Field>
                              <FieldLabel htmlFor="srv-stage1">
                                مرحله ۱ (دقیقه)
                              </FieldLabel>
                              <Input
                                id="srv-stage1"
                                type="number"
                                min={5}
                                max={240}
                                dir="ltr"
                                className="bg-background"
                                value={stage1Minutes}
                                onChange={(e) =>
                                  setStage1Minutes(e.target.value)
                                }
                              />
                              <FieldDescription className="text-[10px]">
                                مثلاً خون‌گیری
                              </FieldDescription>
                            </Field>

                            <Field>
                              <FieldLabel htmlFor="srv-free-gap">
                                تایم آزاد میانی (دقیقه)
                              </FieldLabel>
                              <Input
                                id="srv-free-gap"
                                type="number"
                                min={0}
                                max={360}
                                dir="ltr"
                                className="bg-background"
                                value={freeGapMinutes}
                                onChange={(e) =>
                                  setFreeGapMinutes(e.target.value)
                                }
                              />
                              <FieldDescription className="text-[10px]">
                                رزرو مراجع دیگر در این زمان
                              </FieldDescription>
                            </Field>

                            <Field>
                              <FieldLabel htmlFor="srv-stage2">
                                مرحله ۲ (دقیقه)
                              </FieldLabel>
                              <Input
                                id="srv-stage2"
                                type="number"
                                min={5}
                                max={240}
                                dir="ltr"
                                className="bg-background"
                                value={stage2Minutes}
                                onChange={(e) =>
                                  setStage2Minutes(e.target.value)
                                }
                              />
                              <FieldDescription className="text-[10px]">
                                مثلاً تزریق نهایی
                              </FieldDescription>
                            </Field>
                          </div>
                        </div>
                      )}

                      <Field orientation="horizontal">
                        <Checkbox
                          id="srv-requires-privacy"
                          checked={requiresPrivacy}
                          onCheckedChange={(v) => setRequiresPrivacy(Boolean(v))}
                        />
                        <div className="space-y-0.5">
                          <FieldLabel
                            htmlFor="srv-requires-privacy"
                            className="cursor-pointer font-semibold"
                          >
                            نیازمند فضای خالی / رعایت پرایوسی مراجع
                          </FieldLabel>
                        </div>
                      </Field>
                    </div>
                  )}
                </div>

                {/* بخش کالاهای مصرفی پیش‌فرض */}
                <div className="rounded-xl border bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Package className="size-4 text-primary" />
                      <span>مصرفی دیفالت کل خدمت (اختیاری)</span>
                      {defaultProducts.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px]"
                        >
                          {defaultProducts.length} قلم
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={handleAddProductRow}
                    >
                      <Plus className="size-3.5" />
                      افزودن کالا
                    </Button>
                  </div>

                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    این اقلام هنگام ثبت فاکتور فقط یک‌بار برای کل خدمت اضافه می‌شوند و با انتخاب چند زیرسرویس تکرار نمی‌شوند.
                  </p>

                  {defaultProducts.length > 0 && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      {defaultProducts.map((row) => {
                        const selectedProd = clinicProducts.find(
                          (cp) => cp.id === row.clinicProductId
                        )
                        return (
                          <div
                            key={row.uid}
                            className="flex items-center gap-2 rounded-lg border bg-background p-2"
                          >
                            <div className="flex-1">
                              <SearchableSelect
                                options={productSelectItems}
                                value={row.clinicProductId}
                                placeholder="جستجو و انتخاب کالا از انبار..."
                                emptyText="کالایی با این نام یافت نشد."
                                className="h-8 bg-background text-xs"
                                onValueChange={(val) =>
                                  setDefaultProducts((prev) =>
                                    prev.map((item) =>
                                      item.uid === row.uid
                                        ? {
                                            ...item,
                                            clinicProductId: val || "NONE",
                                          }
                                        : item
                                    )
                                  )
                                }
                              />
                            </div>

                            <Input
                              type="number"
                              step="any"
                              min="0.1"
                              className="h-8 w-20 bg-background text-center text-xs"
                              value={row.quantity}
                              onChange={(e) =>
                                setDefaultProducts((prev) =>
                                  prev.map((item) =>
                                    item.uid === row.uid
                                      ? { ...item, quantity: e.target.value }
                                      : item
                                  )
                                )
                              }
                            />

                            {selectedProd && (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {selectedProd.unit}
                              </span>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-destructive"
                              onClick={() =>
                                setDefaultProducts((prev) =>
                                  prev.filter((item) => item.uid !== row.uid)
                                )
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* بخش پرسنل مجاز */}
                <div className="rounded-xl border bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Users className="size-4 text-muted-foreground" />
                      <span>پرسنل مجاز</span>
                      {selectedStaffIds.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px]"
                        >
                          {selectedStaffIds.length} انتخاب‌شده
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setIsStaffOpen((prev) => !prev)}
                      aria-expanded={isStaffOpen}
                    >
                      <span>
                        {isStaffOpen ? "بستن پرسنل" : "تنظیم پرسنل"}
                      </span>
                      <ChevronDown
                        className={`size-3.5 transition-transform ${
                          isStaffOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </div>

                  {isStaffOpen && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <FieldDescription className="text-[11px]">
                        افرادی که در مدیریت پرسنل روی «همه خدمات» تنظیم شده‌اند، به صورت خودکار به این خدمت دسترسی دارند.
                      </FieldDescription>

                      <div className="no-scrollbar max-h-48 divide-y overflow-y-auto rounded-lg border bg-background">
                        {activeStaff.length === 0 ? (
                          <p className="p-3 text-center text-xs text-muted-foreground">
                            پرسنل فعالی ثبت نشده است.
                          </p>
                        ) : (
                          activeStaff.map((staff) => {
                            const checked = selectedStaffIds.includes(staff.id)
                            return (
                              <label
                                key={staff.id}
                                className="flex cursor-pointer items-center justify-between gap-2 p-2.5 transition-colors hover:bg-muted/50"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleStaff(staff.id)}
                                  />
                                  <div className="min-w-0 text-sm">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="truncate font-medium">
                                        {staff.user.fullName || staff.user.phone}
                                      </span>
                                      {staff.hasAllServicesAccess && (
                                        <Badge
                                          variant="secondary"
                                          className="h-4 px-1.5 text-[10px] font-normal"
                                        >
                                          دسترسی همه خدمات
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {staff.role.name}
                                    </div>
                                  </div>
                                </div>
                                {checked && (
                                  <Check className="size-4 shrink-0 text-primary" />
                                )}
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </FieldGroup>
            </div>
          </ResponsiveDialogPanel>

          <ResponsiveDialogFooter className="sm:rounded-b-2xl">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
              {editingService ? "ذخیره تغییرات" : "ایجاد خدمت"}
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