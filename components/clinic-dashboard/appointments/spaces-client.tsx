// components/clinic-dashboard/appointments/spaces-client.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ClinicSpaceType } from "@prisma/client"
import {
  Building2,
  DoorOpen,
  Layers,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wrench,
  Edit3,
  Trash2,
  ArrowLeftRight,
  Ban,
  Save,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogPanel,
  ResponsiveDialogDesktopOnly,
} from "@/components/ui/responsive-dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  upsertClinicSpaceAction,
  moveClinicSpaceTypeAction,
  toggleClinicSpaceRuleAction,
  deleteClinicSpaceAction,
} from "@/app/clinic-dashboard/(dashboard)/settings/appointments/spaces/actions"
import { cn } from "@/lib/utils"

export interface ClinicServiceSummary {
  id: string
  title: string
  subServicesCount: number
}

export interface ClinicSpaceItem {
  id: string
  name: string
  spaceType: ClinicSpaceType
  capacity: number
  allowOverlap: boolean
  requiresPrivacy: boolean
  equipmentNotes: string | null
  description: string | null
  isActive: boolean
  sortOrder: number
  allowedServices: Array<{ id: string; title: string }>
}

interface SpacesKanbanClientProps {
  clinicName: string
  initialSpaces: ClinicSpaceItem[]
  services: ClinicServiceSummary[]
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
function toFa(val: number | string): string {
  return String(val).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

interface KanbanColumnConfig {
  type: ClinicSpaceType
  title: string
  subtitle: string
  badgeLabel: string
  icon: React.ElementType
  headerTone: string
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    type: ClinicSpaceType.ROOM,
    title: "اتاق‌های کلینیک",
    subtitle: "اتاق لیزر، تزریق، مشاوره و معاینه داخل مرکز",
    badgeLabel: "اتاق",
    icon: DoorOpen,
    headerTone: "border-primary/30 bg-primary/5 text-primary",
  },
  {
    type: ClinicSpaceType.MULTI_UNIT,
    title: "فضاهای چندیونیتی / چندتخته",
    subtitle: "اتاق‌های دارای چند یونیت یا صندلی برای حضور هم‌زمان پرسنل",
    badgeLabel: "چندیونیتی",
    icon: Layers,
    headerTone:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    type: ClinicSpaceType.HOSPITAL,
    title: "بیمارستان / اتاق عمل / آنکال",
    subtitle: "مراکز بیمارستانی، اتاق عمل و شیفت‌های آنکال جراحی",
    badgeLabel: "بیمارستان",
    icon: Building2,
    headerTone:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
]

function getSpaceTypeLabel(type: ClinicSpaceType): string {
  return KANBAN_COLUMNS.find((c) => c.type === type)?.badgeLabel || "اتاق"
}

export function SpacesKanbanClient({
  clinicName,
  initialSpaces,
  services,
}: SpacesKanbanClientProps) {
  const router = useRouter()
  const [spaces, setSpaces] = React.useState<ClinicSpaceItem[]>(initialSpaces)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [serviceFilter, setServiceFilter] = React.useState<string>("ALL")
  const [draggedSpaceId, setDraggedSpaceId] = React.useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] =
    React.useState<ClinicSpaceType | null>(null)

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [busySpaceId, setBusySpaceId] = React.useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingSpaceId, setEditingSpaceId] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [spaceType, setSpaceType] = React.useState<ClinicSpaceType>(
    ClinicSpaceType.ROOM
  )
  const [capacity, setCapacity] = React.useState("1")
  const [allowOverlap, setAllowOverlap] = React.useState(false)
  const [requiresPrivacy, setRequiresPrivacy] = React.useState(false)
  const [equipmentNotes, setEquipmentNotes] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [isActive, setIsActive] = React.useState(true)
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([])

  React.useEffect(() => {
    setSpaces(initialSpaces)
  }, [initialSpaces])

  const openCreateDialog = (
    defaultType: ClinicSpaceType = ClinicSpaceType.ROOM
  ) => {
    setEditingSpaceId(null)
    setName("")
    setSpaceType(defaultType)
    setCapacity(defaultType === ClinicSpaceType.MULTI_UNIT ? "2" : "1")
    setAllowOverlap(defaultType === ClinicSpaceType.MULTI_UNIT)
    setRequiresPrivacy(defaultType === ClinicSpaceType.HOSPITAL)
    setEquipmentNotes("")
    setDescription("")
    setIsActive(true)
    setSelectedServiceIds([])
    setDialogOpen(true)
  }

  const openEditDialog = (space: ClinicSpaceItem) => {
    setEditingSpaceId(space.id)
    setName(space.name)
    setSpaceType(space.spaceType)
    setCapacity(String(space.capacity))
    setAllowOverlap(space.allowOverlap)
    setRequiresPrivacy(space.requiresPrivacy)
    setEquipmentNotes(space.equipmentNotes || "")
    setDescription(space.description || "")
    setIsActive(space.isActive)
    setSelectedServiceIds(space.allowedServices.map((s) => s.id))
    setDialogOpen(true)
  }

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const parsedCapacity = Math.max(1, Number(capacity) || 1)
      const res = await upsertClinicSpaceAction({
        id: editingSpaceId || undefined,
        name,
        spaceType,
        capacity: parsedCapacity,
        allowOverlap,
        requiresPrivacy,
        equipmentNotes,
        description,
        isActive,
        allowedServiceIds: selectedServiceIds,
      })

      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره مکان")
        return
      }

      toast.success(
        editingSpaceId
          ? "تغییرات مکان ذخیره شد."
          : "مکان جدید به کانبان اضافه شد."
      )
      setDialogOpen(false)
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMoveToColumn = async (
    spaceId: string,
    targetType: ClinicSpaceType
  ) => {
    const targetSpace = spaces.find((s) => s.id === spaceId)
    if (!targetSpace || targetSpace.spaceType === targetType) return

    setBusySpaceId(spaceId)
    setSpaces((prev) =>
      prev.map((item) =>
        item.id === spaceId ? { ...item, spaceType: targetType } : item
      )
    )

    try {
      const res = await moveClinicSpaceTypeAction(spaceId, targetType)
      if (!res.success) {
        toast.error(res.error || "خطا در جابه‌جایی مکان")
        setSpaces(initialSpaces)
        return
      }
      toast.success(
        `مکان «${targetSpace.name}» به ستون «${getSpaceTypeLabel(targetType)}» منتقل شد.`
      )
      router.refresh()
    } finally {
      setBusySpaceId(null)
    }
  }

  const handleQuickRuleToggle = async (
    space: ClinicSpaceItem,
    field: "isActive" | "allowOverlap" | "requiresPrivacy"
  ) => {
    const nextVal = !space[field]
    setBusySpaceId(space.id)
    setSpaces((prev) =>
      prev.map((item) =>
        item.id === space.id ? { ...item, [field]: nextVal } : item
      )
    )

    try {
      const res = await toggleClinicSpaceRuleAction(space.id, field, nextVal)
      if (!res.success) {
        toast.error(res.error || "خطا در تغییر وضعیت")
        setSpaces(initialSpaces)
        return
      }
      toast.success("قانون مکان به‌روزرسانی شد.")
      router.refresh()
    } finally {
      setBusySpaceId(null)
    }
  }

  const handleDeleteSpace = async (space: ClinicSpaceItem) => {
    setBusySpaceId(space.id)
    try {
      const res = await deleteClinicSpaceAction(space.id)
      if (!res.success) {
        toast.error(res.error || "خطا در حذف مکان")
        return
      }
      setSpaces((prev) => prev.filter((item) => item.id !== space.id))
      toast.success(`مکان «${space.name}» حذف شد.`)
      router.refresh()
    } finally {
      setBusySpaceId(null)
    }
  }

  const filteredSpaces = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return spaces.filter((sp) => {
      if (serviceFilter !== "ALL") {
        const hasService = sp.allowedServices.some((s) => s.id === serviceFilter)
        if (!hasService) return false
      }

      if (!q) return true

      const inName = sp.name.toLowerCase().includes(q)
      const inEquip = (sp.equipmentNotes || "").toLowerCase().includes(q)
      const inServices = sp.allowedServices.some((s) =>
        s.title.toLowerCase().includes(q)
      )
      return inName || inEquip || inServices
    })
  }, [spaces, searchQuery, serviceFilter])

  return (
    <div className="space-y-6 p-4 md:p-0" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            مدیریت مکان‌ها (نمای کانبان)
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            تعریف اتاق‌ها، فضای چندیونیتی و بیمارستان‌های مرکز «{clinicName}» به همراه سرویس‌های مجاز، ظرفیت، هم‌پوشانی و پرایوسی
          </p>
        </div>

        <Button
          type="button"
          onClick={() => openCreateDialog(ClinicSpaceType.ROOM)}
          className="w-full sm:w-auto"
        >
          <Plus className="ml-1.5 size-4" />
          افزودن مکان جدید
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس نام مکان، سرویس یا تجهیزات..."
                className="pr-9"
              />
            </div>

            <div className="w-full sm:w-60">
              <Select
                value={serviceFilter}
                onValueChange={(val) => setServiceFilter(val || "ALL")}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue>
                    {serviceFilter === "ALL"
                      ? "همه سرویس‌ها"
                      : services.find((s) => s.id === serviceFilter)?.title ||
                        "همه سرویس‌ها"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه سرویس‌ها</SelectItem>
                  {services.map((srv) => (
                    <SelectItem key={srv.id} value={srv.id}>
                      {srv.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {KANBAN_COLUMNS.map((col) => {
          const ColIcon = col.icon
          const colSpaces = filteredSpaces.filter((s) => s.spaceType === col.type)
          const isDropTarget = dragOverColumn === col.type

          return (
            <div
              key={col.type}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragOverColumn !== col.type) {
                  setDragOverColumn(col.type)
                }
              }}
              onDragLeave={() => {
                if (dragOverColumn === col.type) {
                  setDragOverColumn(null)
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverColumn(null)
                const idToMove = draggedSpaceId
                setDraggedSpaceId(null)
                if (idToMove) {
                  void handleMoveToColumn(idToMove, col.type)
                }
              }}
              className={cn(
                "flex min-h-96 flex-col rounded-2xl border bg-muted/25 p-3 transition-colors",
                isDropTarget && "border-primary bg-primary/10"
              )}
            >
              <div
                className={cn(
                  "mb-3 flex items-start justify-between gap-2 rounded-xl border p-3",
                  col.headerTone
                )}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ColIcon className="size-4 shrink-0" />
                    <h2 className="text-sm font-bold">{col.title}</h2>
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[11px]"
                    >
                      {toFa(colSpaces.length)}
                    </Badge>
                  </div>
                  <p className="text-[11px] opacity-80">{col.subtitle}</p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => openCreateDialog(col.type)}
                  title={`افزودن به ${col.title}`}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {colSpaces.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-background/50 p-6 text-center text-xs text-muted-foreground">
                    <p>مکانی در این ستون ثبت نشده است.</p>
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      className="mt-1"
                      onClick={() => openCreateDialog(col.type)}
                    >
                      افزودن اولین {col.badgeLabel}
                    </Button>
                  </div>
                ) : (
                  colSpaces.map((space) => {
                    const isBusy = busySpaceId === space.id
                    return (
                      <Card
                        key={space.id}
                        draggable
                        onDragStart={() => setDraggedSpaceId(space.id)}
                        onDragEnd={() => {
                          setDraggedSpaceId(null)
                          setDragOverColumn(null)
                        }}
                        className={cn(
                          "cursor-grab border transition-all active:cursor-grabbing",
                          !space.isActive && "opacity-65",
                          draggedSpaceId === space.id && "scale-[0.99] opacity-60"
                        )}
                      >
                        <CardHeader className="p-3.5 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <CardTitle className="text-sm font-bold">
                                  {space.name}
                                </CardTitle>
                                {!space.isActive && (
                                  <Badge
                                    variant="outline"
                                    className="h-5 text-[10px] text-muted-foreground"
                                  >
                                    غیرفعال
                                  </Badge>
                                )}
                              </div>
                              {space.description && (
                                <CardDescription className="line-clamp-2 text-xs">
                                  {space.description}
                                </CardDescription>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={isBusy}
                                onClick={() => openEditDialog(space)}
                                title="ویرایش مکان و سرویس‌ها"
                              >
                                <Edit3 className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={isBusy}
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => void handleDeleteSpace(space)}
                                title="حذف مکان"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 p-3.5 pt-1">
                          <div className="flex flex-wrap gap-1.5 text-[11px]">
                            <Badge
                              variant="secondary"
                              className="gap-1 font-normal"
                            >
                              <Users className="size-3" />
                              ظرفیت: {toFa(space.capacity)} هم‌زمان
                            </Badge>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleQuickRuleToggle(space, "allowOverlap")
                              }
                              title="برای تغییر اجازه هم‌پوشانی کلیک کنید"
                            >
                              <Badge
                                variant={
                                  space.allowOverlap ? "default" : "outline"
                                }
                                className="cursor-pointer gap-1 font-normal"
                              >
                                {space.allowOverlap ? (
                                  <CheckCircle2 className="size-3" />
                                ) : (
                                  <XCircle className="size-3" />
                                )}
                                {space.allowOverlap
                                  ? "هم‌پوشانی مجاز"
                                  : "بدون هم‌پوشانی"}
                              </Badge>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleQuickRuleToggle(
                                  space,
                                  "requiresPrivacy"
                                )
                              }
                              title="برای تغییر شرط پرایوسی/اختصاصی کلیک کنید"
                            >
                              <Badge
                                variant={
                                  space.requiresPrivacy
                                    ? "destructive"
                                    : "outline"
                                }
                                className="cursor-pointer gap-1 font-normal"
                              >
                                <ShieldCheck className="size-3" />
                                {space.requiresPrivacy
                                  ? "پرایوسی / تک‌مراجع"
                                  : "پرایوسی اختیاری"}
                              </Badge>
                            </button>
                          </div>

                          {space.equipmentNotes && (
                            <div className="flex items-start gap-1.5 rounded-lg bg-muted/60 p-2 text-[11px] text-muted-foreground">
                              <Wrench className="mt-0.5 size-3.5 shrink-0 text-foreground/70" />
                              <span className="line-clamp-2">
                                {space.equipmentNotes}
                              </span>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <span className="block text-[11px] font-semibold text-muted-foreground">
                              سرویس‌های مجاز در این مکان (
                              {toFa(space.allowedServices.length)}):
                            </span>
                            {space.allowedServices.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {space.allowedServices.map((srv) => (
                                  <Badge
                                    key={srv.id}
                                    variant="outline"
                                    className="bg-background text-[11px] font-normal"
                                  >
                                    {srv.title}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="block text-[11px] text-muted-foreground/80">
                                هنوز سرویسی به این مکان اختصاص داده نشده است.
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 border-t pt-2.5">
                            <div className="flex items-center gap-1">
                              <ArrowLeftRight className="size-3.5 text-muted-foreground" />
                              <Select
                                value={space.spaceType}
                                disabled={isBusy}
                                onValueChange={(val) => {
                                  if (val) {
                                    void handleMoveToColumn(
                                      space.id,
                                      val as ClinicSpaceType
                                    )
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 w-28 bg-background text-[11px]">
                                  <SelectValue>
                                    {getSpaceTypeLabel(space.spaceType)}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {KANBAN_COLUMNS.map((c) => (
                                    <SelectItem key={c.type} value={c.type}>
                                      {c.badgeLabel}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              disabled={isBusy}
                              onClick={() =>
                                void handleQuickRuleToggle(space, "isActive")
                              }
                              className="text-[11px]"
                            >
                              {space.isActive ? "غیرفعال کردن" : "فعال کردن"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={(open) => !isSubmitting && setDialogOpen(open)}
        drawerPosition="bottom"
      >
        <ResponsiveDialogTrigger
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <ResponsiveDialogContent className="sm:max-w-xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editingSpaceId ? "ویرایش مکان نوبت‌دهی" : "افزودن مکان جدید"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              نوع مکان، ظرفیت هم‌زمان، قوانین هم‌پوشانی/پرایوسی و سرویس‌های مجاز در این مکان را مشخص کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSaveSpace} className="contents">
            <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto pt-2">
              <div className="px-5">
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="spaceName">نام مکان *</FieldLabel>
                      <Input
                        id="spaceName"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثلاً: اتاق تزریق ۱، سالن لیزر، بیمارستان عرفان"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="spaceType">
                        نوع مکان در کانبان
                      </FieldLabel>
                      <Select
                        value={spaceType}
                        onValueChange={(val) =>
                          setSpaceType(
                            (val as ClinicSpaceType) || ClinicSpaceType.ROOM
                          )
                        }
                      >
                        <SelectTrigger id="spaceType" className="bg-background">
                          <SelectValue>
                            {getSpaceTypeLabel(spaceType)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {KANBAN_COLUMNS.map((c) => (
                            <SelectItem key={c.type} value={c.type}>
                              {c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="spaceCapacity">
                        ظرفیت هم‌زمان (تعداد یونیت / نوبت هم‌زمان)
                      </FieldLabel>
                      <Input
                        id="spaceCapacity"
                        type="number"
                        min={1}
                        max={50}
                        dir="ltr"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                      />
                      <FieldDescription className="text-[11px]">
                        مثلاً برای اتاق دو یونیته با دو پرسنل مختلف مقدار ۲ قرار دهید.
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="spaceEquipment">
                        تجهیزات و امکانات مکان
                      </FieldLabel>
                      <Input
                        id="spaceEquipment"
                        value={equipmentNotes}
                        onChange={(e) => setEquipmentNotes(e.target.value)}
                        placeholder="مثلاً: دستگاه لیزر الکساندرایت، تخت معاینه"
                      />
                    </Field>
                  </div>

                  <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
                    <Field orientation="horizontal">
                      <Checkbox
                        id="allowOverlap"
                        checked={allowOverlap}
                        onCheckedChange={(v) => setAllowOverlap(Boolean(v))}
                      />
                      <div className="space-y-0.5">
                        <FieldLabel
                          htmlFor="allowOverlap"
                          className="cursor-pointer font-semibold"
                        >
                          امکان هم‌پوشانی زمانی در این مکان
                        </FieldLabel>
                        <FieldDescription className="text-[11px]">
                          در صورت فعال بودن، تا سقف ظرفیت مکان امکان تداخل زمانی بررسی و مدیریت می‌شود.
                        </FieldDescription>
                      </div>
                    </Field>

                    <Field orientation="horizontal">
                      <Checkbox
                        id="requiresPrivacy"
                        checked={requiresPrivacy}
                        onCheckedChange={(v) => setRequiresPrivacy(Boolean(v))}
                      />
                      <div className="space-y-0.5">
                        <FieldLabel
                          htmlFor="requiresPrivacy"
                          className="cursor-pointer font-semibold"
                        >
                          رعایت پرایوسی / نیاز به فضای اختصاصی
                        </FieldLabel>
                        <FieldDescription className="text-[11px]">
                          برای سرویس‌هایی که نیاز به حریم خصوصی یا عدم حضور مراجع هم‌زمان دیگر دارند در اعتبارسنجی نوبت لحاظ می‌شود.
                        </FieldDescription>
                      </div>
                    </Field>

                    <Field orientation="horizontal">
                      <Checkbox
                        id="spaceIsActive"
                        checked={isActive}
                        onCheckedChange={(v) => setIsActive(Boolean(v))}
                      />
                      <FieldLabel
                        htmlFor="spaceIsActive"
                        className="cursor-pointer font-semibold"
                      >
                        مکان فعال و آماده پذیرش نوبت است
                      </FieldLabel>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>
                      سرویس‌های مجاز در این مکان (
                      {toFa(selectedServiceIds.length)} انتخاب‌شده)
                    </FieldLabel>
                    <FieldDescription className="text-[11px]">
                      مشخص کنید کدام خدمات کلینیک می‌توانند در این مکان انجام شوند.
                    </FieldDescription>

                    {services.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                        هنوز سرویسی در کاتالوگ کلینیک ثبت نشده است.
                      </p>
                    ) : (
                      <div className="mt-2 grid max-h-44 grid-cols-1 gap-2 overflow-y-auto rounded-xl border p-2.5 sm:grid-cols-2">
                        {services.map((srv) => {
                          const checked = selectedServiceIds.includes(srv.id)
                          return (
                            <label
                              key={srv.id}
                              className={cn(
                                "flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                                checked
                                  ? "border-primary bg-primary/10 font-medium text-primary"
                                  : "bg-background hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() =>
                                    toggleServiceSelection(srv.id)
                                  }
                                />
                                <span className="truncate">{srv.title}</span>
                              </div>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {toFa(srv.subServicesCount)} زیرسرویس
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="spaceDescription">
                      توضیحات تکمیلی (اختیاری)
                    </FieldLabel>
                    <Textarea
                      id="spaceDescription"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="توضیحات مربوط به نحوه استفاده، شرایط آنکال یا هماهنگی‌های مکان..."
                    />
                  </Field>
                </FieldGroup>
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter className="gap-2">
              <ResponsiveDialogDesktopOnly>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setDialogOpen(false)}
                >
                  <Ban className="ml-1.5 size-4" />
                  انصراف
                </Button>
              </ResponsiveDialogDesktopOnly>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Save className="ml-1.5 size-4" />
                {isSubmitting ? "در حال ذخیره..." : "ذخیره مکان"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}