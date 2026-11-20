// components/clinic-dashboard/service-form-dialog.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Check, Loader2, Package, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import { toast } from "sonner"

interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingService?: {
    id: string
    title: string
    assignedStaff: { id: string }[]
    defaultServiceProducts?: {
      id: string
      quantity: number
      clinicProduct: { id: string; name: string; unit: string }
    }[]
  } | null
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
        quantity: parseFloat(p.quantity),
      }))

    setIsPending(true)
    const res = await upsertServiceAction({
      id: editingService?.id,
      title,
      assignedStaffIds: selectedStaffIds,
      defaultProducts: mappedProducts,
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
      <ResponsiveDialogPopup className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {editingService ? "ویرایش خدمت" : "افزودن خدمت جدید"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            خدمت اصلی دسته‌بندی کلان است؛ مصرفی‌های مشترک این خدمت فقط یک‌بار به
            ازای کل خدمت در فاکتور لحاظ می‌شوند.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit}>
          <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto">
            <div className="px-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="service-title">عنوان خدمت *</FieldLabel>
                  <Input
                    id="service-title"
                    placeholder="مثلاً: لیزر موهای زائد، تزریق بوتاکس..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                </Field>

                {/* بخش کالاهای مصرفی پیش‌فرض در سطح خدمت اصلی */}
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel className="flex items-center gap-1.5">
                      <Package className="size-4 text-primary" />
                      مصرفی دیفالت کل خدمت (اختیاری)
                    </FieldLabel>
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
                  <FieldDescription className="text-[11px]">
                    این اقلام هنگام ثبت فاکتور فقط یک‌بار برای کل خدمت (مثلاً
                    روتختی یکبارمصرف در لیزر) اضافه می‌شوند و با انتخاب چند
                    زیرسرویس تکرار نمی‌شوند.
                  </FieldDescription>

                  {defaultProducts.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {defaultProducts.map((row) => {
                        const selectedProd = clinicProducts.find(
                          (cp) => cp.id === row.clinicProductId
                        )
                        return (
                          <div
                            key={row.uid}
                            className="flex items-center gap-2 rounded-lg border bg-muted/25 p-2"
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
                </Field>

                {/* بخش پرسنل مجاز */}
                <Field>
                  <FieldLabel className="flex items-center gap-1.5">
                    <Users className="size-4 text-muted-foreground" />
                    پرسنل دارای دسترسی اختصاصی به این خدمت
                  </FieldLabel>
                  <FieldDescription className="text-[11px]">
                    افرادی که در مدیریت پرسنل روی «همه خدمات» تنظیم شده‌اند، به
                    صورت خودکار به این خدمت دسترسی دارند.
                  </FieldDescription>

                  <div className="mt-1 max-h-48 divide-y overflow-y-auto rounded-lg border">
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
                </Field>
              </FieldGroup>
            </div>
          </ResponsiveDialogPanel>

          <ResponsiveDialogFooter>
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
