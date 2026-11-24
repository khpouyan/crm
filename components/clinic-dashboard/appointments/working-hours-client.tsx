// components/clinic-dashboard/appointments/working-hours-client.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Infinity as InfinityIcon,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sunrise,
  Sunset,
  Trash2,
  Ban,
  SunMedium,
  SunMoon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  ResponsiveTimePicker,
  ResponsiveTimePickerContent,
  ResponsiveTimePickerTrigger,
  type TimePickerValue,
} from "@/components/ui/time-picker"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  toGregorian,
  toJalali,
  formatJalali,
} from "@/lib/jalali"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"
import {
  upsertClinicWorkingDayAction,
  resetClinicWorkingDayAction,
  applyBulkMonthWorkingHoursAction,
  type ShiftCategory,
  type WorkingShiftInput,
} from "@/app/clinic-dashboard/(dashboard)/settings/appointments/working-hours/actions"
import { cn } from "@/lib/utils"

export interface DayScheduleRecord {
  dateIso: string
  isClinicHoliday: boolean
  holidayNote?: string | null
  shifts: WorkingShiftInput[]
}

export interface OfficialHolidayInfo {
  title: string
  official: boolean
  approximate: boolean
}

interface WorkingHoursClientProps {
  clinicName: string
  initialJy: number
  initialJm: number
  initialRecordsByIso: Record<string, DayScheduleRecord>
  holidaysByIso: Record<string, OfficialHolidayInfo[]>
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
function toFa(val: number | string): string {
  return String(val).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

const SHIFT_MODEL_OPTIONS: {
  value: ShiftCategory
  label: string
  defaultStart: string
  defaultEnd: string
  icon: React.ElementType
  pillClass: string
  textClass: string
}[] = [
  {
    value: "MORNING",
    label: "صبح",
    defaultStart: "09:00",
    defaultEnd: "16:00",
    icon: SunMedium,
    pillClass:
      "border-amber-500/35 bg-amber-500/15 text-amber-800 dark:text-amber-300",
    textClass: "text-amber-700 dark:text-amber-300",
  },
  {
    value: "AFTERNOON",
    label: "بعد از ظهر",
    defaultStart: "16:00",
    defaultEnd: "20:00",
    icon: SunMoon,
    pillClass:
      "border-sky-500/35 bg-sky-500/15 text-sky-800 dark:text-sky-300",
    textClass: "text-sky-700 dark:text-sky-300",
  },
  {
    value: "FULL_DAY",
    label: "یکپارچه",
    defaultStart: "09:00",
    defaultEnd: "18:00",
    icon: Clock,
    pillClass:
      "border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    textClass: "text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "ALL_DAY",
    label: "۲۴ ساعته",
    defaultStart: "00:00",
    defaultEnd: "23:59",
    icon: InfinityIcon,
    pillClass:
      "border-violet-500/35 bg-violet-500/15 text-violet-800 dark:text-violet-300",
    textClass: "text-violet-700 dark:text-violet-300",
  },
  {
    value: "CUSTOM",
    label: "سفارشی",
    defaultStart: "10:00",
    defaultEnd: "14:00",
    icon: SlidersHorizontal,
    pillClass:
      "border-rose-500/35 bg-rose-500/15 text-rose-800 dark:text-rose-300",
    textClass: "text-rose-700 dark:text-rose-300",
  },
]

function getShiftModelMeta(cat: ShiftCategory) {
  return (
    SHIFT_MODEL_OPTIONS.find((m) => m.value === cat) || SHIFT_MODEL_OPTIONS[4]
  )
}

function getShiftModelLabel(cat: ShiftCategory, customLabel?: string): string {
  if (customLabel?.trim()) return customLabel.trim()
  return getShiftModelMeta(cat).label
}

function formatSingleClockCompact(hhmm: string): string {
  const clean = normalizePersianDigits(hhmm || "").trim()
  const match = /^(\d{1,2}):(\d{2})$/.exec(clean)
  if (!match) return toFa(clean)
  const h = Number(match[1])
  const m = Number(match[2])
  if (m === 0) return toFa(h)
  return `${toFa(h)}:${toFa(String(m).padStart(2, "0"))}`
}

function formatCompactShiftRange(
  category: ShiftCategory,
  startTime: string,
  endTime: string
): string {
  if (category === "ALL_DAY") return "۲۴ ساعته"
  return `${formatSingleClockCompact(startTime)} - ${formatSingleClockCompact(
    endTime
  )}`
}

function createShiftByCategory(
  category: ShiftCategory,
  index: number
): WorkingShiftInput {
  const found = getShiftModelMeta(category)
  return {
    id: `shift-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    label: found.label,
    startTime: found.defaultStart,
    endTime: found.defaultEnd,
  }
}

function getJalaliMonthDaysCount(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  const g30 = toGregorian(jy, 12, 30)
  const j30 = toJalali(g30)
  return j30.jy === jy && j30.jm === 12 && j30.jd === 30 ? 30 : 29
}

function toLocalDateIso(gDate: Date): string {
  const y = gDate.getFullYear()
  const m = String(gDate.getMonth() + 1).padStart(2, "0")
  const d = String(gDate.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseTimeString(timeStr: string): TimePickerValue {
  const clean = normalizePersianDigits(timeStr || "").trim()
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(clean)
  if (!match) return { hour: 9, minute: 0 }
  const hour = Math.min(23, Math.max(0, Number(match[1])))
  const minute = Math.min(59, Math.max(0, Number(match[2])))
  return { hour, minute }
}

function normalizeTypedTime(raw: string, fallback: string): string {
  const clean = normalizePersianDigits(raw || "").trim()
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(clean)
  if (!match) return fallback
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return fallback
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

interface ShiftTimeFieldProps {
  pickerKey: string
  label: string
  timeValue: string
  disabled?: boolean
  drawerTitle: string
  onChange: (nextTime: string) => void
}

function ShiftTimeField({
  pickerKey,
  label,
  timeValue,
  disabled = false,
  drawerTitle,
  onChange,
}: ShiftTimeFieldProps) {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState(() => toFa(timeValue))

  React.useEffect(() => {
    setText(toFa(timeValue))
  }, [timeValue, pickerKey])

  const commitTyped = (raw: string) => {
    const normalized = normalizeTypedTime(raw, timeValue)
    onChange(normalized)
    setText(toFa(normalized))
  }

  const parsedValue = React.useMemo(
    () => parseTimeString(timeValue),
    [timeValue]
  )

  return (
    <div className="flex flex-1 items-center gap-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <ResponsiveTimePicker
        open={!disabled && open}
        onOpenChange={(nextOpen) => {
          if (!disabled) setOpen(nextOpen)
        }}
      >
        <InputGroup className="h-9 bg-background">
          <InputGroupInput
            dir="ltr"
            inputMode="numeric"
            disabled={disabled}
            placeholder="۰۹:۰۰"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commitTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitTyped(text)
              }
            }}
            className="text-right text-xs tabular-nums"
          />
          <InputGroupAddon align="inline-end">
            <ResponsiveTimePickerTrigger
              render={
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={`انتخاب ${label}`}
                >
                  <Clock className="size-4" />
                </InputGroupButton>
              }
            />
          </InputGroupAddon>
        </InputGroup>

        <ResponsiveTimePickerContent
          value={parsedValue}
          onValueChange={(next) => {
            const formatted = `${String(next.hour).padStart(2, "0")}:${String(
              next.minute
            ).padStart(2, "0")}`
            onChange(formatted)
            setText(toFa(formatted))
          }}
          hourFormat="24"
          digits="fa"
          drawerTitle={drawerTitle}
          drawerConfirmLabel="تایید ساعت"
          onDrawerConfirm={() => setOpen(false)}
        />
      </ResponsiveTimePicker>
    </div>
  )
}

export function WorkingHoursClient({
  clinicName,
  initialJy,
  initialJm,
  initialRecordsByIso,
  holidaysByIso,
}: WorkingHoursClientProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = React.useState(false)

  const [jy, setJy] = React.useState(initialJy)
  const [jm, setJm] = React.useState(initialJm)
  const [recordsByIso, setRecordsByIso] =
    React.useState<Record<string, DayScheduleRecord>>(initialRecordsByIso)

  React.useEffect(() => {
    setJy(initialJy)
    setJm(initialJm)
    setRecordsByIso(initialRecordsByIso)
  }, [initialJy, initialJm, initialRecordsByIso])

  const [bulkActiveWeekdays, setBulkActiveWeekdays] = React.useState<number[]>([
    0, 1, 2, 3, 4,
  ])
  const [bulkClinicHolidayWeekdays, setBulkClinicHolidayWeekdays] =
    React.useState<number[]>([])
  const [bulkHolidayNote, setBulkHolidayNote] = React.useState("تعطیل کلینیک")
  const [bulkShifts, setBulkShifts] = React.useState<WorkingShiftInput[]>([
    createShiftByCategory("MORNING", 1),
    createShiftByCategory("AFTERNOON", 2),
  ])
  const [bulkOverwrite, setBulkOverwrite] = React.useState(true)

  const [editingDay, setEditingDay] = React.useState<{
    dateIso: string
    jd: number
    weekdayIndex: number
    gDate: Date
    officialHolidays: OfficialHolidayInfo[]
  } | null>(null)

  const [dayIsClinicHoliday, setDayIsClinicHoliday] = React.useState(false)
  const [dayHolidayNote, setDayHolidayNote] = React.useState("")
  const [dayShifts, setDayShifts] = React.useState<WorkingShiftInput[]>([])

  const navigateToMonth = (targetJy: number, targetJm: number) => {
    let nextY = targetJy
    let nextM = targetJm
    if (nextM < 1) {
      nextM = 12
      nextY -= 1
    } else if (nextM > 12) {
      nextM = 1
      nextY += 1
    }
    router.push(
      `/clinic-dashboard/settings/appointments/working-hours?jy=${nextY}&jm=${nextM}`
    )
    router.refresh()
  }

  const monthGridCells = React.useMemo(() => {
    const daysInMonth = getJalaliMonthDaysCount(jy, jm)
    const firstG = toGregorian(jy, jm, 1)
    const firstWeekday = (firstG.getDay() + 1) % 7

    const cells: Array<{
      key: string
      jd: number | null
      gDate: Date | null
      dateIso: string | null
      weekdayIndex: number
    }> = []

    for (let pad = 0; pad < firstWeekday; pad++) {
      cells.push({
        key: `pad-start-${pad}`,
        jd: null,
        gDate: null,
        dateIso: null,
        weekdayIndex: pad,
      })
    }

    for (let jd = 1; jd <= daysInMonth; jd++) {
      const gDate = toGregorian(jy, jm, jd)
      const weekdayIndex = (gDate.getDay() + 1) % 7
      cells.push({
        key: `day-${jy}-${jm}-${jd}`,
        jd,
        gDate,
        dateIso: toLocalDateIso(gDate),
        weekdayIndex,
      })
    }

    while (cells.length % 7 !== 0) {
      const idx = cells.length
      cells.push({
        key: `pad-end-${idx}`,
        jd: null,
        gDate: null,
        dateIso: null,
        weekdayIndex: idx % 7,
      })
    }

    return cells
  }, [jy, jm])

  const openDayModal = (cell: {
    jd: number | null
    gDate: Date | null
    dateIso: string | null
    weekdayIndex: number
  }) => {
    if (!cell.jd || !cell.gDate || !cell.dateIso) return

    const existing = recordsByIso[cell.dateIso]
    const official = holidaysByIso[cell.dateIso] || []

    setEditingDay({
      dateIso: cell.dateIso,
      jd: cell.jd,
      weekdayIndex: cell.weekdayIndex,
      gDate: cell.gDate,
      officialHolidays: official,
    })

    if (existing) {
      setDayIsClinicHoliday(existing.isClinicHoliday)
      setDayHolidayNote(existing.holidayNote || "")
      setDayShifts(
        existing.shifts.length > 0
          ? existing.shifts.map((s, idx) => ({ ...s, id: s.id || `d-${idx}` }))
          : [createShiftByCategory("MORNING", 1)]
      )
    } else {
      setDayIsClinicHoliday(false)
      setDayHolidayNote("")
      setDayShifts(
        bulkShifts.length > 0
          ? bulkShifts.map((s, idx) => ({
              ...s,
              id: `d-${Date.now()}-${idx}`,
            }))
          : [createShiftByCategory("MORNING", 1)]
      )
    }
  }

  const handleToggleBulkWeekday = (wd: number) => {
    setBulkActiveWeekdays((prev) => {
      const exists = prev.includes(wd)
      if (exists) return prev.filter((x) => x !== wd)
      setBulkClinicHolidayWeekdays((hPrev) => hPrev.filter((h) => h !== wd))
      return [...prev, wd].sort()
    })
  }

  const handleToggleBulkClinicHolidayWeekday = (wd: number) => {
    setBulkClinicHolidayWeekdays((prev) => {
      const exists = prev.includes(wd)
      if (exists) return prev.filter((x) => x !== wd)
      setBulkActiveWeekdays((aPrev) => aPrev.filter((a) => a !== wd))
      return [...prev, wd].sort()
    })
  }

  const handleBulkShiftCategoryChange = (
    shiftId: string,
    nextCat: ShiftCategory
  ) => {
    const model = getShiftModelMeta(nextCat)
    setBulkShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              category: nextCat,
              label: model.label,
              startTime:
                nextCat === "ALL_DAY" ? "00:00" : model.defaultStart,
              endTime: nextCat === "ALL_DAY" ? "23:59" : model.defaultEnd,
            }
          : s
      )
    )
  }

  const handleDayShiftCategoryChange = (
    shiftId: string,
    nextCat: ShiftCategory
  ) => {
    const model = getShiftModelMeta(nextCat)
    setDayShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              category: nextCat,
              label: model.label,
              startTime:
                nextCat === "ALL_DAY" ? "00:00" : model.defaultStart,
              endTime: nextCat === "ALL_DAY" ? "23:59" : model.defaultEnd,
            }
          : s
      )
    )
  }

  const handleApplyBulkToMonth = async () => {
    setIsSaving(true)
    try {
      const res = await applyBulkMonthWorkingHoursAction({
        jy,
        jm,
        activeWeekdays: bulkActiveWeekdays,
        clinicHolidayWeekdays: bulkClinicHolidayWeekdays,
        holidayNote: bulkHolidayNote,
        shifts: bulkShifts,
        overwriteExisting: bulkOverwrite,
      })

      if (!res.success) {
        toast.error(res.error || "خطا در اعمال تنظیمات ماهانه")
        return
      }

      toast.success(
        `ساعات کاری ماه ${JALALI_MONTHS[jm - 1]} ${toFa(jy)} برای ${toFa(
          res.updatedCount ?? 0
        )} روز به‌روزرسانی شد.`
      )
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSingleDay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDay) return

    setIsSaving(true)
    try {
      const res = await upsertClinicWorkingDayAction({
        dateIso: editingDay.dateIso,
        isClinicHoliday: dayIsClinicHoliday,
        holidayNote: dayHolidayNote,
        shifts: dayShifts,
      })

      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره ساعات کاری روز")
        return
      }

      setRecordsByIso((prev) => ({
        ...prev,
        [editingDay.dateIso]: {
          dateIso: editingDay.dateIso,
          isClinicHoliday: dayIsClinicHoliday,
          holidayNote: dayIsClinicHoliday
            ? dayHolidayNote.trim() || "تعطیل کلینیک"
            : null,
          shifts: dayIsClinicHoliday ? [] : dayShifts,
        },
      }))

      toast.success("تنظیمات این روز ذخیره شد.")
      setEditingDay(null)
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetSingleDay = async () => {
    if (!editingDay) return

    setIsSaving(true)
    try {
      const res = await resetClinicWorkingDayAction(editingDay.dateIso)
      if (!res.success) {
        toast.error(res.error || "خطا در حذف استثنای روز")
        return
      }

      setRecordsByIso((prev) => {
        const copy = { ...prev }
        delete copy[editingDay.dateIso]
        return copy
      })

      toast.success("استثنای روز حذف شد.")
      setEditingDay(null)
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 md:p-0" dir="rtl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              تنظیم ساعات کاری کلینیک
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              مدیریت تقویم ماهانه ساعات کاری مرکز «{clinicName}»، تعریف شیفت‌ها و تفکیک تعطیلات عمومی و کلینیک
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 rounded-md sm:rounded-lg"
              onClick={() => navigateToMonth(jy, jm - 1)}
              title="ماه قبل"
            >
              <ChevronRight className="size-4" />
            </Button>

            <div className="flex min-w-36 items-center justify-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-semibold sm:rounded-lg">
              <CalendarDays className="size-4 text-primary" />
              <span>
                {JALALI_MONTHS[jm - 1]} {toFa(jy)}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 rounded-md sm:rounded-lg"
              onClick={() => navigateToMonth(jy, jm + 1)}
              title="ماه بعد"
            >
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>

        <Card className="rounded-lg sm:rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              تنظیم گروهی برای کل ماه ({JALALI_MONTHS[jm - 1]} {toFa(jy)})
            </CardTitle>
            <CardDescription className="text-xs">
              روزهای کاری هفته را تیک بزنید، ساعات کاری (صبح، بعد از ظهر، یکپارچه، ۲۴ ساعته یا بازه‌های دلخواه با +) را تعیین کنید و روزهای تعطیل کلینیک را مشخص نمایید
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field>
                  <FieldLabel>روزهای کاری هفته در این ماه</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {JALALI_WEEKDAYS.map((dayName, wd) => {
                      const checked = bulkActiveWeekdays.includes(wd)
                      return (
                        <label
                          key={`work-${wd}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors sm:rounded-lg",
                            checked
                              ? "border-primary bg-primary/10 font-semibold text-primary"
                              : "bg-background hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => handleToggleBulkWeekday(wd)}
                          />
                          <span>{dayName}</span>
                        </label>
                      )
                    })}
                  </div>
                </Field>

                <Field>
                  <FieldLabel>
                    تعطیل هفتگی اختصاصی کلینیک (کل باکس قرمز)
                  </FieldLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    {JALALI_WEEKDAYS.map((dayName, wd) => {
                      const checked = bulkClinicHolidayWeekdays.includes(wd)
                      return (
                        <label
                          key={`hol-${wd}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors sm:rounded-lg",
                            checked
                              ? "border-destructive bg-destructive/15 font-semibold text-destructive"
                              : "bg-background hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              handleToggleBulkClinicHolidayWeekday(wd)
                            }
                          />
                          <span>{dayName}</span>
                        </label>
                      )
                    })}
                  </div>
                  {bulkClinicHolidayWeekdays.length > 0 && (
                    <div className="mt-2 max-w-xs">
                      <Input
                        value={bulkHolidayNote}
                        onChange={(e) => setBulkHolidayNote(e.target.value)}
                        placeholder="عنوان تعطیلی کلینیک (مثلاً: تعطیل هفتگی)"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </Field>
              </div>

              <Field>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <FieldLabel>مدل و بازه‌های ساعات کاری</FieldLabel>
                    <FieldDescription className="text-[11px]">
                      می‌توانید از حالت‌های صبح، بعد از ظهر، یکپارچه، ۲۴ ساعته استفاده کنید یا با «+» بازه‌های متعدد اضافه نمایید
                    </FieldDescription>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setBulkShifts((prev) => [
                        ...prev,
                        createShiftByCategory("CUSTOM", prev.length + 1),
                      ])
                    }
                  >
                    <Plus className="ml-1 size-4" />
                    افزودن بازه زمانی (+)
                  </Button>
                </div>

                <div className="mt-2 space-y-2.5">
                  {bulkShifts.map((shift, idx) => {
                    const isAllDay = shift.category === "ALL_DAY"
                    const meta = getShiftModelMeta(shift.category)
                    const currentModelLabel = getShiftModelLabel(
                      shift.category,
                      shift.label
                    )
                    const ShiftIcon = meta.icon
                    return (
                      <div
                        key={shift.id}
                        className="flex flex-col gap-2.5 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:rounded-xl"
                      >
                        <span className="shrink-0 text-xs font-medium text-muted-foreground sm:w-16">
                          بازه {toFa(idx + 1)}:
                        </span>

                        <div className="w-full sm:w-44">
                          <Select
                            value={shift.category}
                            onValueChange={(val) =>
                              handleBulkShiftCategoryChange(
                                shift.id,
                                (val as ShiftCategory) || "CUSTOM"
                              )
                            }
                          >
                            <SelectTrigger className="h-9 bg-background text-xs">
                              <SelectValue>
                                <span className="inline-flex items-center gap-1.5">
                                  <ShiftIcon
                                    className={cn("size-3.5", meta.textClass)}
                                  />
                                  <span>{currentModelLabel}</span>
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {SHIFT_MODEL_OPTIONS.map((opt) => {
                                const OptIcon = opt.icon
                                return (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <span className="inline-flex items-center gap-1.5">
                                      <OptIcon
                                        className={cn(
                                          "size-3.5",
                                          opt.textClass
                                        )}
                                      />
                                      <span>{opt.label}</span>
                                    </span>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          <ShiftTimeField
                            pickerKey={`bulk-start-${shift.id}`}
                            label="از"
                            timeValue={isAllDay ? "00:00" : shift.startTime}
                            disabled={isAllDay}
                            drawerTitle="انتخاب ساعت شروع"
                            onChange={(nextTime) =>
                              setBulkShifts((prev) =>
                                prev.map((item) =>
                                  item.id === shift.id
                                    ? { ...item, startTime: nextTime }
                                    : item
                                )
                              )
                            }
                          />

                          <ShiftTimeField
                            pickerKey={`bulk-end-${shift.id}`}
                            label="تا"
                            timeValue={isAllDay ? "23:59" : shift.endTime}
                            disabled={isAllDay}
                            drawerTitle="انتخاب ساعت پایان"
                            onChange={(nextTime) =>
                              setBulkShifts((prev) =>
                                prev.map((item) =>
                                  item.id === shift.id
                                    ? { ...item, endTime: nextTime }
                                    : item
                                )
                              )
                            }
                          />
                        </div>

                        {bulkShifts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 self-end text-destructive hover:bg-destructive/10 sm:self-auto"
                            onClick={() =>
                              setBulkShifts((prev) =>
                                prev.filter((item) => item.id !== shift.id)
                              )
                            }
                            title="حذف بازه"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Field>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={bulkOverwrite}
                    onCheckedChange={(v) => setBulkOverwrite(Boolean(v))}
                  />
                  <span>
                    بازنویسی روزهایی که در این ماه قبلاً تنظیم یا استثنا ثبت کرده‌ام
                  </span>
                </label>

                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={handleApplyBulkToMonth}
                >
                  <Save className="ml-2 size-4" />
                  {isSaving ? "در حال اعمال..." : "اعمال روی کل ماه"}
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-3 text-xs sm:rounded-xl">
          <span className="font-semibold text-foreground">راهنمای تقویم:</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-destructive">{toFa(15)}</span>
            <span className="text-muted-foreground">
              تعطیل عمومی و رسمی (فقط عدد تاریخ قرمز)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3.5 rounded-sm border border-destructive bg-destructive/20 sm:rounded" />
            <span className="text-muted-foreground">
              تعطیل خود کلینیک (کل باکس روز قرمز)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5 text-primary" />
            <span>
              برای استثنا یا تغییر ساعت هر روز، روی باکس همان روز کلیک کنید
            </span>
          </div>
        </div>

        {/* تقویم ماهانه با اسکرول عرضی ظریف در موبایل */}
        <Card className="overflow-hidden rounded-lg sm:rounded-xl">
          <CardContent className="p-2 sm:p-4">
            <div className="overflow-x-auto pb-2 [scrollbar-color:hsl(var(--border))_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
              <div className="min-w-[680px] md:min-w-0">
                <div className="grid grid-cols-7 gap-1.5 pb-2 text-center sm:gap-2">
                  {JALALI_WEEKDAYS.map((weekday, idx) => (
                    <div
                      key={weekday}
                      className={cn(
                        "rounded-md bg-muted/70 py-2 text-xs font-bold sm:rounded-lg",
                        idx === 6 && "text-destructive"
                      )}
                    >
                      {weekday}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {monthGridCells.map((cell) => {
                    if (!cell.jd || !cell.dateIso || !cell.gDate) {
                      return (
                        <div
                          key={cell.key}
                          className="min-h-24 rounded-md border border-dashed bg-muted/20 sm:min-h-28 sm:rounded-xl"
                        />
                      )
                    }

                    const dayRecord = recordsByIso[cell.dateIso]
                    const officialList = holidaysByIso[cell.dateIso] || []
                    const isOfficialHoliday =
                      officialList.length > 0 || cell.weekdayIndex === 6
                    const isClinicHoliday = Boolean(dayRecord?.isClinicHoliday)
                    const shifts = !isClinicHoliday
                      ? dayRecord?.shifts || []
                      : []

                    const holidayTooltipText = [
                      ...officialList.map((h) => h.title),
                      cell.weekdayIndex === 6 ? "جمعه" : null,
                      isClinicHoliday
                        ? dayRecord?.holidayNote || "تعطیل کلینیک"
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => openDayModal(cell)}
                        className={cn(
                          "flex min-h-28 flex-col justify-between rounded-md border p-2 text-right transition-all sm:min-h-28 sm:rounded-xl sm:p-2.5",
                          isClinicHoliday
                            ? "border-destructive bg-destructive/15 text-destructive hover:bg-destructive/20"
                            : shifts.length > 0
                            ? "border-border/80 bg-card hover:border-primary hover:shadow-xs"
                            : "bg-card/70 hover:border-muted-foreground/40 hover:bg-muted/30"
                        )}
                      >
                        <div className="flex w-full items-start justify-between gap-1">
                          {holidayTooltipText ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span
                                    className={cn(
                                      "text-sm font-extrabold sm:text-base",
                                      isClinicHoliday || isOfficialHoliday
                                        ? "text-destructive"
                                        : "text-foreground"
                                    )}
                                  >
                                    {toFa(cell.jd)}
                                  </span>
                                }
                              />
                              <TooltipContent
                                side="top"
                                className="max-w-56 text-xs"
                              >
                                {holidayTooltipText}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-sm font-bold text-foreground sm:text-base">
                              {toFa(cell.jd)}
                            </span>
                          )}

                          {isClinicHoliday && (
                            <Badge
                              variant="destructive"
                              className="h-5 px-1.5 text-[10px]"
                            >
                              تعطیل مرکز
                            </Badge>
                          )}
                        </div>

                        <div className="mt-1.5 w-full space-y-1.5">
                          {isClinicHoliday ? (
                            <p className="line-clamp-2 text-[11px] font-medium text-destructive">
                              {dayRecord?.holidayNote || "تعطیل کلینیک"}
                            </p>
                          ) : shifts.length > 0 ? (
                            shifts.map((s) => {
                              const meta = getShiftModelMeta(s.category)
                              const ShiftIcon = meta.icon
                              const shiftTitle = getShiftModelLabel(
                                s.category,
                                s.label
                              )
                              const compactRange = formatCompactShiftRange(
                                s.category,
                                s.startTime,
                                s.endTime
                              )
                              return (
                                <div
                                  key={s.id}
                                  className={cn(
                                    "flex flex-col items-start gap-0.5 rounded border px-1.5 py-1 text-[10px] font-medium md:flex-row md:items-center md:justify-between md:gap-1 md:rounded-md md:py-0.5 md:text-[11px]",
                                    meta.pillClass
                                  )}
                                >
                                  <span className="inline-flex items-center gap-1 font-bold">
                                    <ShiftIcon className="size-3 shrink-0" />
                                    <span>{shiftTitle}:</span>
                                  </span>
                                  <span
                                    dir="ltr"
                                    className="font-mono text-[10px] font-semibold md:truncate md:text-[11px]"
                                  >
                                    {compactRange}
                                  </span>
                                </div>
                              )
                            })
                          ) : (
                            <span className="block text-[10px] text-muted-foreground">
                              بدون ساعت ثبت‌شده
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResponsiveDialog
          open={Boolean(editingDay)}
          onOpenChange={(open) => !open && setEditingDay(null)}
          drawerPosition="bottom"
        >
          <ResponsiveDialogTrigger
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <ResponsiveDialogContent className="sm:max-w-lg">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                {editingDay
                  ? `تنظیم ساعات روز ${formatJalali(editingDay.gDate, {
                      weekday: true,
                    })}`
                  : "تنظیم روز"}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {editingDay?.officialHolidays.length
                  ? `مناسبت رسمی: ${editingDay.officialHolidays
                      .map((h) => h.title)
                      .join("، ")}`
                  : "ساعات کاری این روز یا تعطیل بودن کلینیک را تعیین کنید."}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <form onSubmit={handleSaveSingleDay} className="contents">
              <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto pt-2">
                <div className="px-5">
                  <FieldGroup>
                    <Field orientation="horizontal">
                      <Checkbox
                        id="dayIsClinicHoliday"
                        checked={dayIsClinicHoliday}
                        onCheckedChange={(v) =>
                          setDayIsClinicHoliday(Boolean(v))
                        }
                      />
                      <div className="space-y-0.5">
                        <FieldLabel
                          htmlFor="dayIsClinicHoliday"
                          className="cursor-pointer font-semibold text-destructive"
                        >
                          تعطیل بودن کلینیک در این روز (کل باکس قرمز می‌شود)
                        </FieldLabel>
                        <FieldDescription className="text-[11px]">
                          با فعال بودن این گزینه، کل روز برای کلینیک تعطیل در نظر گرفته می‌شود.
                        </FieldDescription>
                      </div>
                    </Field>

                    {dayIsClinicHoliday ? (
                      <Field>
                        <FieldLabel htmlFor="dayHolidayNote">
                          علت / عنوان تعطیلی کلینیک
                        </FieldLabel>
                        <Input
                          id="dayHolidayNote"
                          value={dayHolidayNote}
                          onChange={(e) => setDayHolidayNote(e.target.value)}
                          placeholder="مثلاً: ضدعفونی و تعمیرات، یا تعطیل اختصاصی"
                        />
                      </Field>
                    ) : (
                      <Field>
                        <div className="flex items-center justify-between gap-2">
                          <FieldLabel>بازه / شیفت‌های این روز</FieldLabel>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() =>
                              setDayShifts((prev) => [
                                ...prev,
                                createShiftByCategory(
                                  "CUSTOM",
                                  prev.length + 1
                                ),
                              ])
                            }
                          >
                            <Plus className="ml-1 size-3.5" />
                            افزودن بازه (+)
                          </Button>
                        </div>

                        <div className="mt-2 space-y-2.5">
                          {dayShifts.map((shift, idx) => {
                            const isAllDay = shift.category === "ALL_DAY"
                            const meta = getShiftModelMeta(shift.category)
                            const currentModelLabel = getShiftModelLabel(
                              shift.category,
                              shift.label
                            )
                            const ShiftIcon = meta.icon
                            return (
                              <div
                                key={shift.id}
                                className="space-y-2.5 rounded-lg border bg-muted/20 p-3 sm:rounded-xl"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold">
                                    بازه {toFa(idx + 1)}
                                  </span>
                                  {dayShifts.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      className="text-destructive"
                                      onClick={() =>
                                        setDayShifts((prev) =>
                                          prev.filter((s) => s.id !== shift.id)
                                        )
                                      }
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  )}
                                </div>

                                <Select
                                  value={shift.category}
                                  onValueChange={(val) =>
                                    handleDayShiftCategoryChange(
                                      shift.id,
                                      (val as ShiftCategory) || "CUSTOM"
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-9 bg-background text-xs">
                                    <SelectValue>
                                      <span className="inline-flex items-center gap-1.5">
                                        <ShiftIcon
                                          className={cn(
                                            "size-3.5",
                                            meta.textClass
                                          )}
                                        />
                                        <span>{currentModelLabel}</span>
                                      </span>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SHIFT_MODEL_OPTIONS.map((opt) => {
                                      const OptIcon = opt.icon
                                      return (
                                        <SelectItem
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          <span className="inline-flex items-center gap-1.5">
                                            <OptIcon
                                              className={cn(
                                                "size-3.5",
                                                opt.textClass
                                              )}
                                            />
                                            <span>{opt.label}</span>
                                          </span>
                                        </SelectItem>
                                      )
                                    })}
                                  </SelectContent>
                                </Select>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                  <ShiftTimeField
                                    pickerKey={`day-start-${shift.id}`}
                                    label="از"
                                    timeValue={
                                      isAllDay ? "00:00" : shift.startTime
                                    }
                                    disabled={isAllDay}
                                    drawerTitle="انتخاب ساعت شروع"
                                    onChange={(nextTime) =>
                                      setDayShifts((prev) =>
                                        prev.map((item) =>
                                          item.id === shift.id
                                            ? { ...item, startTime: nextTime }
                                            : item
                                        )
                                      )
                                    }
                                  />

                                  <ShiftTimeField
                                    pickerKey={`day-end-${shift.id}`}
                                    label="تا"
                                    timeValue={
                                      isAllDay ? "23:59" : shift.endTime
                                    }
                                    disabled={isAllDay}
                                    drawerTitle="انتخاب ساعت پایان"
                                    onChange={(nextTime) =>
                                      setDayShifts((prev) =>
                                        prev.map((item) =>
                                          item.id === shift.id
                                            ? { ...item, endTime: nextTime }
                                            : item
                                        )
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </Field>
                    )}

                    {editingDay && recordsByIso[editingDay.dateIso] && (
                      <Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isSaving}
                          onClick={handleResetSingleDay}
                          className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="ml-1.5 size-3.5" />
                          حذف تنظیم/استثنای ثبت‌شده برای این روز
                        </Button>
                      </Field>
                    )}
                  </FieldGroup>
                </div>
              </ResponsiveDialogPanel>

              <ResponsiveDialogFooter className="gap-2">
                <ResponsiveDialogDesktopOnly>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingDay(null)}
                    disabled={isSaving}
                  >
                    <Ban className="ml-1.5 size-4" />
                    انصراف
                  </Button>
                </ResponsiveDialogDesktopOnly>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  <Save className="ml-1.5 size-4" />
                  {isSaving ? "در حال ذخیره..." : "ذخیره این روز"}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>
    </TooltipProvider>
  )
}