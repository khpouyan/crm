// components/clinic-dashboard/invoice-wizard/step1-services.tsx
"use client"

import { useState, useMemo , useEffect } from "react"
import {
  Plus,
  Trash2,
  PackagePlus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldAlert,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { PriceInput } from "@/components/ui/price-input"
import { formatJalali } from "@/lib/jalali"
import {
  ResponsiveTimePicker,
  ResponsiveTimePickerContent,
  ResponsiveTimePickerTrigger,
  formatTimePickerValue,
} from "@/components/ui/time-picker"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"
import { toPersianDigits } from "@/lib/persian-date"
import type {
  DraftServiceAccordionBlock,
  DraftSubServiceSelection,
  SelectOption,
  WizardCatalogService,
  WizardProduct,
  WizardTherapistOption,
} from "./types"

interface Step1ServicesProps {
  performedDate: Date | null
  onPerformedDateChange: (d: Date | null) => void
  performedTime: string
  onPerformedTimeChange: (t: string) => void
  therapistId: string
  onTherapistIdChange: (id: string) => void
  assistantId: string
  onAssistantIdChange: (id: string) => void
  referrerType: "NONE" | "STAFF" | "CLIENT"
  onReferrerTypeChange: (t: "NONE" | "STAFF" | "CLIENT") => void
  referrerId: string
  onReferrerIdChange: (id: string) => void

  therapists: WizardTherapistOption[]
  assistants: SelectOption[]
  staffReferrers: SelectOption[]
  clientReferrers: SelectOption[]
  catalogServices: WizardCatalogService[]
  products: WizardProduct[]

  serviceBlocks: DraftServiceAccordionBlock[]
  onServiceBlocksChange: React.Dispatch<
    React.SetStateAction<DraftServiceAccordionBlock[]>
  >
  openBlockUid: string
  onOpenBlockUidChange: (uid: string) => void

  onNextStep: () => void
}



export function createEmptyServiceBlock(): DraftServiceAccordionBlock {
  return {
    uid: crypto.randomUUID(),
    serviceId: "NONE",
    allowMultiSubServices: true,
    selectedSubServices: [],
    expandedSubServiceId: "",
    consumables: [],
    selectedNewProductId: "NONE",
    selectedBatchForNewProduct: "AUTO",
    description: "",
  }
}

export function Step1Services({
  performedDate,
  onPerformedDateChange,
  performedTime,
  onPerformedTimeChange,
  therapistId,
  onTherapistIdChange,
  assistantId,
  onAssistantIdChange,
  referrerType,
  onReferrerTypeChange,
  referrerId,
  onReferrerIdChange,
  therapists,
  assistants,
  staffReferrers,
  clientReferrers,
  catalogServices,
  products,
  serviceBlocks,
  onServiceBlocksChange,
  openBlockUid,
  onOpenBlockUidChange,
  onNextStep,
}: Step1ServicesProps) {
  // فیلتر هوشمند خدمات بر اساس سطح دسترسی درمانگر انتخاب‌شده
  const allowedServices = useMemo(() => {
    if (!therapistId || therapistId === "NONE") return catalogServices
    const therapist = therapists.find((t) => t.id === therapistId)
    if (!therapist || therapist.hasAllServicesAccess) return catalogServices
    return catalogServices.filter((s) =>
      therapist.assignedServiceIds.includes(s.id)
    )
  }, [therapistId, therapists, catalogServices])

  const serviceOptions: SelectOption[] = useMemo(
    () => [
      { value: "NONE", label: "انتخاب خدمت..." },
      ...allowedServices.map((s) => ({ value: s.id, label: s.title })),
    ],
    [allowedServices]
  )

  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [timeText, setTimeText] = useState(() =>
    toPersianDigits(performedTime || "12:00")
  )

  // همگام‌سازی متن با تغییر بیرونی یا انتخاب از چرخنده
  useEffect(() => {
    setTimeText(toPersianDigits(performedTime || "12:00"))
  }, [performedTime])

  const parsedPerformedTime = useMemo(() => {
    const [hh, mm] = (performedTime || "00:00").split(":").map(Number)
    return {
      hour: Number.isFinite(hh) ? hh : 0,
      minute: Number.isFinite(mm) ? mm : 0,
    }
  }, [performedTime])

  function commitTypedTime(rawInput: string) {
    const clean = normalizePersianDigits(rawInput).replace(/[^\d:]/g, "")
    let hh = 0
    let mm = 0

    if (clean.includes(":")) {
      const [hStr, mStr] = clean.split(":")
      hh = parseInt(hStr || "0", 10)
      mm = parseInt(mStr || "0", 10)
    } else if (clean.length <= 2) {
      hh = parseInt(clean || "0", 10)
      mm = 0
    } else {
      const padded = clean.padStart(4, "0").slice(0, 4)
      hh = parseInt(padded.slice(0, 2), 10)
      mm = parseInt(padded.slice(2, 4), 10)
    }

    hh = Number.isFinite(hh) ? Math.min(23, Math.max(0, hh)) : 0
    mm = Number.isFinite(mm) ? Math.min(59, Math.max(0, mm)) : 0

    const formatted = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
    onPerformedTimeChange(formatted)
    setTimeText(toPersianDigits(formatted))
  }

  const therapistOptions: SelectOption[] = useMemo(
    () => [
      { value: "NONE", label: "انتخاب درمانگر..." },
      ...therapists.map((t) => ({ value: t.id, label: t.label })),
    ],
    [therapists]
  )

  const assistantOptions: SelectOption[] = useMemo(
    () => [{ value: "NONE", label: "انتخاب کنید" }, ...assistants],
    [assistants]
  )

  const referrerOptions: SelectOption[] = useMemo(
    () => [
      { value: "NONE", label: "انتخاب معرف..." },
      ...(referrerType === "STAFF"
        ? staffReferrers
        : referrerType === "CLIENT"
          ? clientReferrers
          : []),
    ],
    [referrerType, staffReferrers, clientReferrers]
  )

  const productOptions: SelectOption[] = useMemo(
    () => [
      { value: "NONE", label: "انتخاب کالا از انبار..." },
      ...products.map((p) => ({
        value: p.id,
        label: `${p.name} (موجودی: ${p.totalStock.toLocaleString("fa-IR")} ${p.unit})`,
      })),
    ],
    [products]
  )

  // هنگام تغییر درمانگر، خدماتی که درمانگر به آن‌ها دسترسی ندارد پاک‌سازی می‌شوند
  function handleTherapistChange(newTherapistId: string) {
    onTherapistIdChange(newTherapistId)
    if (!newTherapistId || newTherapistId === "NONE") return

    const therapist = therapists.find((t) => t.id === newTherapistId)
    if (!therapist || therapist.hasAllServicesAccess) return

    let removedCount = 0
    onServiceBlocksChange((prev) =>
      prev.map((block) => {
        if (
          block.serviceId !== "NONE" &&
          !therapist.assignedServiceIds.includes(block.serviceId)
        ) {
          removedCount++
          return createEmptyServiceBlock()
        }
        return block
      })
    )

    if (removedCount > 0) {
      toast.warning(
        "برخی خدمات انتخاب‌شده به دلیل عدم دسترسی درمانگر جدید بازنشانی شدند."
      )
    }
  }

  function updateBlock(
    uid: string,
    updater: (prev: DraftServiceAccordionBlock) => DraftServiceAccordionBlock
  ) {
    onServiceBlocksChange((prev) =>
      prev.map((b) => (b.uid === uid ? updater(b) : b))
    )
  }

  function handleToggleSubService(
    block: DraftServiceAccordionBlock,
    service: WizardCatalogService,
    subId: string
  ) {
    const sub = service.subServices.find((ss) => ss.id === subId)
    if (!sub) return

    const alreadySelected = block.selectedSubServices.some(
      (s) => s.subServiceId === sub.id
    )

    // ساخت مصرفی‌های دیفالت زیرسرویس و خدمت اصلی
    const buildDefaultConsumables = (subIds: string[]) => {
      const map = new Map<
        string,
        {
          clinicProductId: string
          productName: string
          unit: string
          quantity: number
          sellingPrice: number
        }
      >()

      // ۱. مصرفی‌های دیفالت سطح خدمت اصلی (فقط یک‌بار به ازای کل خدمت)
      if (subIds.length > 0) {
        for (const sdp of service.defaultServiceProducts ?? []) {
          const prod = products.find((p) => p.id === sdp.clinicProductId)
          const sp = prod?.batches[0]?.sellingPrice || 0
          const prevItem = map.get(sdp.clinicProductId)
          if (prevItem) {
            prevItem.quantity += sdp.quantity
          } else {
            map.set(sdp.clinicProductId, {
              clinicProductId: sdp.clinicProductId,
              productName: sdp.productName,
              unit: sdp.unit,
              quantity: sdp.quantity,
              sellingPrice: sp,
            })
          }
        }
      }

      // ۲. مصرفی‌های دیفالت اختصاصی هر زیرسرویس انتخاب‌شده
      for (const id of subIds) {
        const targetSub = service.subServices.find((x) => x.id === id)
        if (!targetSub) continue
        for (const dp of targetSub.defaultProducts) {
          const prod = products.find((p) => p.id === dp.clinicProductId)
          const sp = prod?.batches[0]?.sellingPrice || 0
          const prevItem = map.get(dp.clinicProductId)
          if (prevItem) {
            prevItem.quantity += dp.quantity
          } else {
            map.set(dp.clinicProductId, {
              clinicProductId: dp.clinicProductId,
              productName: dp.productName,
              unit: dp.unit,
              quantity: dp.quantity,
              sellingPrice: sp,
            })
          }
        }
      }

      return Array.from(map.values()).map((item) => ({
        uid: crypto.randomUUID(),
        clinicProductId: item.clinicProductId,
        productName: item.productName,
        unit: item.unit,
        preferredBatchId: "AUTO",
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        isDefault: true,
      }))
    }

    if (!block.allowMultiSubServices) {
      // حالت رادیو باتن (تک انتخابی)
      const nextSelected: DraftSubServiceSelection[] = [
        {
          subServiceId: sub.id,
          subServiceTitle: sub.title,
          finalPrice: sub.price,
          attributes: sub.attributes.map((a) => ({ ...a })),
        },
      ]
      const manualConsumables = block.consumables.filter((c) => !c.isDefault)
      updateBlock(block.uid, (b) => ({
        ...b,
        selectedSubServices: nextSelected,
        expandedSubServiceId: sub.id,
        consumables: [
          ...buildDefaultConsumables([sub.id]),
          ...manualConsumables,
        ],
      }))
    } else {
      // حالت چند انتخابی
      const nextSelected = alreadySelected
        ? block.selectedSubServices.filter((s) => s.subServiceId !== sub.id)
        : [
            ...block.selectedSubServices,
            {
              subServiceId: sub.id,
              subServiceTitle: sub.title,
              finalPrice: sub.price,
              attributes: sub.attributes.map((a) => ({ ...a })),
            },
          ]

      const manualConsumables = block.consumables.filter((c) => !c.isDefault)
      updateBlock(block.uid, (b) => ({
        ...b,
        selectedSubServices: nextSelected,
        expandedSubServiceId: alreadySelected ? "" : sub.id,
        consumables: [
          ...buildDefaultConsumables(nextSelected.map((x) => x.subServiceId)),
          ...manualConsumables,
        ],
      }))
    }
  }

  const grandTotalStep1 = useMemo(() => {
    return serviceBlocks.reduce((sum, block) => {
      const subSum = block.selectedSubServices.reduce(
        (s, item) => s + (Number(item.finalPrice) || 0),
        0
      )
      const consSum = block.consumables.reduce(
        (c, item) =>
          c + (Number(item.quantity) || 0) * (Number(item.sellingPrice) || 0),
        0
      )
      return sum + subSum + consSum
    }, 0)
  }, [serviceBlocks])

  function handleValidateAndContinue() {
    if (!performedDate) {
      toast.error("لطفاً تاریخ مراجعه را مشخص کنید.")
      return
    }

    const validBlocks = serviceBlocks.filter(
      (b) => b.serviceId !== "NONE" && b.selectedSubServices.length > 0
    )

    if (validBlocks.length === 0) {
      toast.error("لطفاً حداقل یک خدمت و زیرسرویس را انتخاب کنید.")
      return
    }

    onNextStep()
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pb-16 sm:p-6">
      {/* کارت اول: اطلاعات مشترک مراجعه و درمانگر (بالاتر از انتخاب خدمات) */}
      <div className="rounded-2xl border bg-card p-5 shadow-2xs">
        <h2 className="mb-4 text-base font-bold text-foreground">
          تعریف سرویس و مشخصات مراجعه
        </h2>

        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>تاریخ مراجعه *</FieldLabel>
              <DatePicker
                calendarType="shamsi"
                value={performedDate}
                onValueChange={onPerformedDateChange}
              />
            </Field>

            <Field>
              <FieldLabel>ساعت مراجعه *</FieldLabel>
              <ResponsiveTimePicker
                open={timePickerOpen}
                onOpenChange={setTimePickerOpen}
              >
                <InputGroup>
                  <InputGroupInput
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="۱۴:۳۰"
                    value={timeText}
                    onChange={(e) => setTimeText(e.target.value)}
                    onBlur={(e) => commitTypedTime(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        commitTypedTime(timeText)
                      }
                    }}
                    className="text-right tabular-nums"
                  />
                  <InputGroupAddon align="inline-end">
                    <ResponsiveTimePickerTrigger
                      render={
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label="انتخاب ساعت از لیست"
                        >
                          <Clock className="size-4" />
                        </InputGroupButton>
                      }
                    />
                  </InputGroupAddon>
                </InputGroup>

                <ResponsiveTimePickerContent
                  value={parsedPerformedTime}
                  onValueChange={(next) => {
                    const formatted = `${String(next.hour).padStart(2, "0")}:${String(next.minute).padStart(2, "0")}`
                    onPerformedTimeChange(formatted)
                    setTimeText(toPersianDigits(formatted))
                  }}
                  hourFormat="24"
                  digits="fa"
                  drawerTitle="انتخاب ساعت مراجعه"
                  drawerConfirmLabel="تایید ساعت"
                  onDrawerConfirm={() => setTimePickerOpen(false)}
                />
              </ResponsiveTimePicker>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>درمانگر</FieldLabel>
              <Select
                value={therapistId}
                items={therapistOptions}
                onValueChange={(val) => handleTherapistChange(val || "NONE")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب درمانگر..." />
                </SelectTrigger>
                <SelectContent>
                  {therapistOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {therapistId !== "NONE" &&
                allowedServices.length < catalogServices.length && (
                  <FieldDescription className="flex items-center gap-1 text-xs text-amber-600">
                    <ShieldAlert className="size-3.5 shrink-0" />
                    خدمات نمایش‌داده‌شده بر اساس دسترسی این درمانگر محدود
                    شده‌اند.
                  </FieldDescription>
                )}
            </Field>

            <Field>
              <FieldLabel>دستیار درمان</FieldLabel>
              <Select
                value={assistantId}
                items={assistantOptions}
                onValueChange={(val) => onAssistantIdChange(val || "NONE")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {assistantOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* معرف مراجعه (با جستجوی سریع مراجعین / همکاران) */}
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-muted/40 p-3.5 sm:grid-cols-2">
            <Field>
              <FieldLabel className="text-xs">نوع معرف</FieldLabel>
              <div className="grid grid-cols-3 gap-1 rounded-lg border bg-background p-1">
                {[
                  { key: "NONE", label: "بدون معرف" },
                  { key: "STAFF", label: "همکاران" },
                  { key: "CLIENT", label: "مراجعین" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onReferrerTypeChange(
                        item.key as "NONE" | "STAFF" | "CLIENT"
                      )
                      onReferrerIdChange("NONE")
                    }}
                    className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                      referrerType === item.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field>
              <FieldLabel className="text-xs">انتخاب معرف</FieldLabel>
              <SearchableSelect
                options={referrerOptions}
                value={referrerId}
                disabled={referrerType === "NONE"}
                placeholder={
                  referrerType === "CLIENT"
                    ? "جستجوی نام یا شماره پرونده مراجع..."
                    : referrerType === "STAFF"
                      ? "جستجوی نام همکار..."
                      : "ابتدا نوع معرف را انتخاب کنید"
                }
                emptyText="معرفی با این مشخصات یافت نشد."
                onValueChange={(val) => onReferrerIdChange(val || "NONE")}
              />
            </Field>
          </div>
        </FieldGroup>
      </div>

      {/* آکاردیون‌های انتخاب خدمات و ریزخدمات */}
      <div className="space-y-3">
        {serviceBlocks.map((block, blockIdx) => {
          const isOpen = openBlockUid === block.uid
          const selectedCatalogService = allowedServices.find(
            (s) => s.id === block.serviceId
          )

          const selectedSummaryText =
            block.selectedSubServices.length > 0
              ? block.selectedSubServices
                  .map((s) => s.subServiceTitle)
                  .join(" + ")
              : selectedCatalogService?.title || "انتخاب خدمت جدید"

          const blockTotalPrice =
            block.selectedSubServices.reduce(
              (sum, s) => sum + (Number(s.finalPrice) || 0),
              0
            ) +
            block.consumables.reduce(
              (sum, c) =>
                sum + (Number(c.quantity) || 0) * (Number(c.sellingPrice) || 0),
              0
            )

          const selectedProductObj = products.find(
            (p) => p.id === block.selectedNewProductId
          )

          return (
            <div
              key={block.uid}
              className="overflow-hidden rounded-2xl border bg-card shadow-2xs transition-all"
            >
              {/* هدر آکاردیون خدمت: نمایش نام زیرسرویس و قیمت روی هدر */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpenBlockUidChange(isOpen ? "" : block.uid)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onOpenBlockUidChange(isOpen ? "" : block.uid)
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-3 bg-muted/35 px-4 py-3.5 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center gap-2.5">
                  <Badge variant="secondary" className="font-bold">
                    {(blockIdx + 1).toLocaleString("fa-IR")}
                  </Badge>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {selectedSummaryText}
                    </div>
                    {selectedCatalogService &&
                      block.selectedSubServices.length > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          بخش: {selectedCatalogService.title}
                        </div>
                      )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {blockTotalPrice > 0 && (
                    <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/20">
                      {blockTotalPrice.toLocaleString("fa-IR")} تومان
                    </Badge>
                  )}

                  {serviceBlocks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        onServiceBlocksChange((prev) =>
                          prev.filter((b) => b.uid !== block.uid)
                        )
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}

                  {isOpen ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* محتوای آکاردیون خدمت */}
              {isOpen && (
                <div className="space-y-5 border-t p-5">
                  <FieldGroup>
                    {/* انتخاب خدمت اصلی */}
                    <Field>
                      <FieldLabel>خدمات *</FieldLabel>
                      <SearchableSelect
                        options={serviceOptions}
                        value={block.serviceId}
                        placeholder="جستجو و انتخاب خدمت..."
                        emptyText="خدمتی با این نام یافت نشد."
                        onValueChange={(val) =>
                          updateBlock(block.uid, (b) => ({
                            ...b,
                            serviceId: val || "NONE",
                            selectedSubServices: [],
                            expandedSubServiceId: "",
                            consumables: b.consumables.filter(
                              (c) => !c.isDefault
                            ),
                          }))
                        }
                      />
                    </Field>

                    {/* لیست ریز خدمات با آکاردیون و رادیو باتن / تیک چندتایی */}
                    {selectedCatalogService && (
                      <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground">
                            ریز خدمات‌ها ({selectedCatalogService.title})
                          </span>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`multi-${block.uid}`}
                              checked={block.allowMultiSubServices}
                              onCheckedChange={(checked) =>
                                updateBlock(block.uid, (b) => ({
                                  ...b,
                                  allowMultiSubServices: Boolean(checked),
                                  selectedSubServices:
                                    !checked && b.selectedSubServices.length > 1
                                      ? [b.selectedSubServices[0]]
                                      : b.selectedSubServices,
                                }))
                              }
                            />
                            <label
                              htmlFor={`multi-${block.uid}`}
                              className="cursor-pointer text-xs text-muted-foreground"
                            >
                              امکان انتخاب همزمان چند زیرسرویس
                            </label>
                          </div>
                        </div>

                        {selectedCatalogService.subServices.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            هیچ زیرسرویسی برای این خدمت تعریف نشده است.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {selectedCatalogService.subServices.map((sub) => {
                              const selectedItem =
                                block.selectedSubServices.find(
                                  (s) => s.subServiceId === sub.id
                                )
                              const isSelected = Boolean(selectedItem)
                              const isSubExpanded =
                                isSelected &&
                                (block.allowMultiSubServices ||
                                  block.expandedSubServiceId === sub.id)

                              return (
                                <div
                                  key={sub.id}
                                  className={`overflow-hidden rounded-xl border transition-all ${
                                    isSelected
                                      ? "border-primary bg-background shadow-2xs"
                                      : "bg-background/70 hover:bg-background"
                                  }`}
                                >
                                  {/* هدر آکاردیون زیرسرویس با رادیوباتن/چک‌باکس */}
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      handleToggleSubService(
                                        block,
                                        selectedCatalogService,
                                        sub.id
                                      )
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        handleToggleSubService(
                                          block,
                                          selectedCatalogService,
                                          sub.id
                                        )
                                      }
                                    }}
                                    className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      {block.allowMultiSubServices ? (
                                        isSelected ? (
                                          <CheckSquare className="size-5 text-primary" />
                                        ) : (
                                          <Square className="size-5 text-muted-foreground/50" />
                                        )
                                      ) : isSelected ? (
                                        <CheckCircle2 className="size-5 text-primary" />
                                      ) : (
                                        <Circle className="size-5 text-muted-foreground/50" />
                                      )}
                                      <span className="text-sm font-semibold">
                                        {sub.title}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {(
                                          selectedItem?.finalPrice ?? sub.price
                                        ).toLocaleString("fa-IR")}{" "}
                                        تومان
                                      </span>
                                      {isSubExpanded ? (
                                        <ChevronUp className="size-4 text-primary" />
                                      ) : (
                                        <ChevronDown className="size-4 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>

                                  {/* محتوای آکاردیون زیرسرویس: قیمت + مشخصه‌ها (مثل تعداد جلسات لیزر) */}
                                  {isSubExpanded && selectedItem && (
                                    <div className="space-y-3 border-t bg-muted/20 p-4">
                                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <Field>
                                          <FieldLabel className="text-xs">
                                            قیمت (تومان) *
                                          </FieldLabel>
                                          <PriceInput
                                            locale="fa-IR"
                                            value={selectedItem.finalPrice}
                                            onValueChange={(val) =>
                                              updateBlock(block.uid, (b) => ({
                                                ...b,
                                                selectedSubServices:
                                                  b.selectedSubServices.map(
                                                    (item) =>
                                                      item.subServiceId ===
                                                      sub.id
                                                        ? {
                                                            ...item,
                                                            finalPrice:
                                                              val || 0,
                                                          }
                                                        : item
                                                  ),
                                              }))
                                            }
                                          />
                                        </Field>

                                        {selectedItem.attributes.map(
                                          (attr, attrIdx) => (
                                            <Field
                                              key={`${attr.key}-${attrIdx}`}
                                            >
                                              <FieldLabel className="text-xs">
                                                {attr.key}
                                              </FieldLabel>
                                              <Input
                                                value={attr.value}
                                                onChange={(e) => {
                                                  const nextVal = e.target.value
                                                  updateBlock(
                                                    block.uid,
                                                    (b) => ({
                                                      ...b,
                                                      selectedSubServices:
                                                        b.selectedSubServices.map(
                                                          (item) =>
                                                            item.subServiceId ===
                                                            sub.id
                                                              ? {
                                                                  ...item,
                                                                  attributes:
                                                                    item.attributes.map(
                                                                      (
                                                                        a,
                                                                        idx
                                                                      ) =>
                                                                        idx ===
                                                                        attrIdx
                                                                          ? {
                                                                              ...a,
                                                                              value:
                                                                                nextVal,
                                                                            }
                                                                          : a
                                                                    ),
                                                                }
                                                              : item
                                                        ),
                                                    })
                                                  )
                                                }}
                                              />
                                            </Field>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* کارت کالاهای مصرفی (با جستجوی سریع کالا) */}
                    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <PackagePlus className="size-4 text-primary" />
                        کالا مصرفی
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-8">
                          <SearchableSelect
                            options={productOptions}
                            value={block.selectedNewProductId}
                            placeholder="جستجو و انتخاب کالا از انبار..."
                            emptyText="کالایی با این نام یافت نشد."
                            onValueChange={(val) =>
                              updateBlock(block.uid, (b) => ({
                                ...b,
                                selectedNewProductId: val || "NONE",
                                selectedBatchForNewProduct: "AUTO",
                              }))
                            }
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full"
                            disabled={
                              !selectedProductObj ||
                              block.selectedNewProductId === "NONE"
                            }
                            onClick={() => {
                              if (!selectedProductObj) return
                              const chosenBatch =
                                selectedProductObj.batches.find(
                                  (b) =>
                                    b.id === block.selectedBatchForNewProduct
                                ) || selectedProductObj.batches[0]

                              updateBlock(block.uid, (b) => ({
                                ...b,
                                selectedNewProductId: "NONE",
                                selectedBatchForNewProduct: "AUTO",
                                consumables: [
                                  ...b.consumables,
                                  {
                                    uid: crypto.randomUUID(),
                                    clinicProductId: selectedProductObj.id,
                                    productName: selectedProductObj.name,
                                    unit: selectedProductObj.unit,
                                    preferredBatchId:
                                      b.selectedBatchForNewProduct,
                                    quantity: 1,
                                    sellingPrice:
                                      chosenBatch?.sellingPrice || 0,
                                    isDefault: false,
                                  },
                                ],
                              }))
                            }}
                          >
                            افزودن به لیست
                          </Button>
                        </div>
                      </div>

                      {/* نمایش بچ‌های موجودی کالای انتخاب‌شده */}
                      {selectedProductObj &&
                        selectedProductObj.batches.length > 0 && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {selectedProductObj.batches.map((batch) => (
                              <div
                                key={batch.id}
                                onClick={() =>
                                  updateBlock(block.uid, (b) => ({
                                    ...b,
                                    selectedBatchForNewProduct: batch.id,
                                  }))
                                }
                                className={`cursor-pointer rounded-lg border p-2.5 text-xs transition-all ${
                                  block.selectedBatchForNewProduct === batch.id
                                    ? "border-primary bg-primary/5"
                                    : "bg-background"
                                }`}
                              >
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    تاریخ انقضا:
                                  </span>
                                  <span>
                                    {batch.expirationDate
                                      ? formatJalali(
                                          new Date(batch.expirationDate)
                                        )
                                      : "ندارد"}
                                  </span>
                                </div>
                                <div className="mt-1 flex justify-between">
                                  <span className="text-muted-foreground">
                                    موجودی:
                                  </span>
                                  <strong className="text-emerald-600">
                                    {batch.quantity.toLocaleString("fa-IR")}{" "}
                                    {selectedProductObj.unit}
                                  </strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      {/* لیست اقلام مصرفی اضافه‌شده */}
                      {block.consumables.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {block.consumables.map((cons) => {
                            const prod = products.find(
                              (p) => p.id === cons.clinicProductId
                            )
                            const isLow =
                              (prod?.totalStock ?? 0) < cons.quantity

                            return (
                              <div
                                key={cons.uid}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-2.5 text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    <span>{cons.productName}</span>
                                    {cons.isDefault && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px]"
                                      >
                                        دیفالت
                                      </Badge>
                                    )}
                                  </div>
                                  {isLow && (
                                    <span className="flex items-center gap-1 text-[11px] text-amber-600">
                                      <AlertTriangle className="size-3" />
                                      موجودی کل انبار:{" "}
                                      {(prod?.totalStock ?? 0).toLocaleString(
                                        "fa-IR"
                                      )}{" "}
                                      {cons.unit}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">
                                    قیمت واحد:
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 w-24 text-center text-xs"
                                    value={cons.sellingPrice}
                                    onChange={(e) => {
                                      const sp =
                                        parseInt(e.target.value, 10) || 0
                                      updateBlock(block.uid, (b) => ({
                                        ...b,
                                        consumables: b.consumables.map(
                                          (item) =>
                                            item.uid === cons.uid
                                              ? { ...item, sellingPrice: sp }
                                              : item
                                        ),
                                      }))
                                    }}
                                  />
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    className="h-8 w-16 text-center text-xs"
                                    value={cons.quantity}
                                    onChange={(e) => {
                                      const q = parseFloat(e.target.value) || 0
                                      updateBlock(block.uid, (b) => ({
                                        ...b,
                                        consumables: b.consumables.map(
                                          (item) =>
                                            item.uid === cons.uid
                                              ? { ...item, quantity: q }
                                              : item
                                        ),
                                      }))
                                    }}
                                  />
                                  <span>{cons.unit}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-destructive"
                                    onClick={() =>
                                      updateBlock(block.uid, (b) => ({
                                        ...b,
                                        consumables: b.consumables.filter(
                                          (item) => item.uid !== cons.uid
                                        ),
                                      }))
                                    }
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* باکس توضیحات */}
                    <Field>
                      <FieldLabel className="text-xs">توضیحات</FieldLabel>
                      <Textarea
                        rows={2}
                        placeholder="توضیحات مربوط به این خدمت..."
                        value={block.description}
                        onChange={(e) =>
                          updateBlock(block.uid, (b) => ({
                            ...b,
                            description: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  </FieldGroup>
                </div>
              )}
            </div>
          )
        })}

        {/* دکمه افزودن آکاردیون خدمت جدید */}
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl border-dashed py-5 text-primary hover:bg-primary/5"
          onClick={() => {
            const newBlock = createEmptyServiceBlock()
            onServiceBlocksChange((prev) => [...prev, newBlock])
            onOpenBlockUidChange(newBlock.uid)
          }}
        >
          <Plus className="ml-2 size-4" />
          افزودن خدمت دیگر به این فاکتور
        </Button>
      </div>

      {/* نوار جمع کل و رفتن به مرحله پرداخت */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-2xs sm:flex-row">
        <div className="text-sm">
          جمع کل خدمات انتخاب‌شده:{" "}
          <strong className="text-lg font-extrabold text-primary">
            {grandTotalStep1.toLocaleString("fa-IR")} تومان
          </strong>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={handleValidateAndContinue}
          className="w-full gap-2 sm:w-auto"
        >
          ادامه و ثبت پرداختی
          <ArrowLeft className="size-4" />
        </Button>
      </div>
    </div>
  )
}
