// components/clinic-dashboard/appointments/staff-schedule-client.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ClinicSpaceType,
  ServiceTimingMode,
  StaffScheduleStatus,
} from "@prisma/client"
import {
  CalendarClock,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  DoorOpen,
  Edit3,
  Hospital,
  Plus,
  Save,
  Ban,
  ShieldCheck,
  Sparkles,
  Split,
  Trash2,
  UserCheck,
  AlertTriangle,
  Lock,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  upsertStaffServiceTimingAction,
  upsertStaffScheduleAction,
  generateBulkStaffSchedulesAction,
  deleteStaffScheduleAction,
} from "@/app/clinic-dashboard/(dashboard)/settings/appointments/staff-schedule/actions"
import * as jalaliLib from "@/lib/jalali"
import * as persianHolidaysLib from "@/lib/persian-holidays"
import "@/lib/persian-holidays-data"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"
import { cn } from "@/lib/utils"

export interface ClinicWorkingDaySummary {
  isClinicHoliday: boolean
  holidayNote: string | null
  shifts: Array<{ startTime: string; endTime: string }>
}

export interface ClinicSpaceOption {
  id: string
  name: string
  spaceType: ClinicSpaceType
  capacity: number
  allowOverlap: boolean
  requiresPrivacy: boolean
  allowedServiceIds: string[]
}

export interface StaffServiceTimingItem {
  serviceId: string
  serviceTitle: string
  isCustomized: boolean
  timingMode: ServiceTimingMode
  prepBeforeMinutes: number
  durationMinutes: number
  stage1Minutes: number
  freeGapMinutes: number
  stage2Minutes: number
  restAfterMinutes: number
  requiresPrivacy: boolean
}

export interface StaffScheduleSlotItem {
  id: string
  jalaliDate: string
  weekday: number
  startTime: string
  endTime: string
  status: StaffScheduleStatus
  blocksClinicBook: boolean
  note: string | null
  isActive: boolean
  space: {
    id: string
    name: string
    spaceType: ClinicSpaceType
  } | null
  allowedServices: Array<{ id: string; title: string }>
}

export interface StaffMemberScheduleProfile {
  id: string
  fullName: string
  jobTitle: string
  specialty: string | null
  isOwner: boolean
  hasAllServicesAccess: boolean
  services: StaffServiceTimingItem[]
  schedules: StaffScheduleSlotItem[]
}

interface StaffScheduleClientProps {
  clinicName: string
  isAdmin: boolean
  currentClinicUserId: string
  staffProfiles: StaffMemberScheduleProfile[]
  spaces: ClinicSpaceOption[]
  workingDaysByJalali: Record<string, ClinicWorkingDaySummary>
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
function toFa(val: number | string): string {
  return String(val).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

const FALLBACK_JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
]

const JALALI_MONTHS: string[] =
  (jalaliLib as { JALALI_MONTHS?: string[]; PERSIAN_MONTHS?: string[] })
    .JALALI_MONTHS ||
  (jalaliLib as { PERSIAN_MONTHS?: string[] }).PERSIAN_MONTHS ||
  FALLBACK_JALALI_MONTHS

const WEEKDAYS: Array<{ index: number; label: string }> = [
  { index: 0, label: "شنبه" },
  { index: 1, label: "یکشنبه" },
  { index: 2, label: "دوشنبه" },
  { index: 3, label: "سه‌شنبه" },
  { index: 4, label: "چهارشنبه" },
  { index: 5, label: "پنج‌شنبه" },
  { index: 6, label: "جمعه" },
]

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function isJalaliLeapYear(jy: number): boolean {
  const fn = (jalaliLib as { isLeapJalaliYear?: (y: number) => boolean })
    .isLeapJalaliYear
  if (typeof fn === "function") return fn(jy)
  const rem = ((((jy - 474) % 2820) + 2820) % 2820)
  return (((rem + 38) * 682) % 2816) < 682
}

function getJalaliMonthDaysCount(jy: number, jm: number): number {
  const fn = (
    jalaliLib as { getJalaliMonthDays?: (y: number, m: number) => number }
  ).getJalaliMonthDays
  if (typeof fn === "function") return fn(jy, jm)
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isJalaliLeapYear(jy) ? 30 : 29
}

function jalaliToGregorianUtc(jy: number, jm: number, jd: number): Date {
  const fn = (
    jalaliLib as {
      jalaliToGregorian?: (y: number, m: number, d: number) => Date
    }
  ).jalaliToGregorian
  if (typeof fn === "function") {
    const res = fn(jy, jm, jd)
    if (res instanceof Date && !Number.isNaN(res.getTime())) {
      return new Date(
        Date.UTC(res.getFullYear(), res.getMonth(), res.getDate(), 0, 0, 0, 0)
      )
    }
  }

  const jyAdj = jy - 979
  const jmAdj = jm - 1
  const jdAdj = jd - 1

  let jDayNo =
    365 * jyAdj +
    Math.floor(jyAdj / 33) * 8 +
    Math.floor(((jyAdj % 33) + 3) / 4)
  const monthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]
  for (let i = 0; i < jmAdj; ++i) {
    jDayNo += monthDays[i]
  }
  jDayNo += jdAdj

  let gDayNo = jDayNo + 79

  let gy = 1600 + 400 * Math.floor(gDayNo / 146097)
  gDayNo = gDayNo % 146097

  let leap = true
  if (gDayNo >= 36525) {
    gDayNo--
    gy += 100 * Math.floor(gDayNo / 36524)
    gDayNo = gDayNo % 36524

    if (gDayNo >= 365) {
      gDayNo++
    } else {
      leap = false
    }
  }

  gy += 4 * Math.floor(gDayNo / 1461)
  gDayNo %= 1461

  if (gDayNo >= 366) {
    leap = false
    gDayNo -= 366
    gy += Math.floor(gDayNo / 365)
    gDayNo = gDayNo % 365
  }

  const gMonthDays = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  let gm = 0
  for (; gm < 12 && gDayNo >= gMonthDays[gm]; gm++) {
    gDayNo -= gMonthDays[gm]
  }
  const gd = gDayNo + 1

  return new Date(Date.UTC(gy, gm, gd, 0, 0, 0, 0))
}

function getHolidayTitleForDate(
  jy: number,
  jm: number,
  jd: number,
  utcDate: Date
): string | null {
  const hLib = persianHolidaysLib as {
    getHolidayForDate?: (
      d: Date
    ) => { title?: string; isHoliday?: boolean } | null
    isPersianHoliday?: (d: Date) => boolean
    getPersianHolidayTitle?: (y: number, m: number, d: number) => string | null
  }

  if (typeof hLib.getPersianHolidayTitle === "function") {
    const title = hLib.getPersianHolidayTitle(jy, jm, jd)
    if (title) return title
  }

  if (typeof hLib.getHolidayForDate === "function") {
    const found = hLib.getHolidayForDate(utcDate)
    if (found && found.isHoliday !== false) {
      return found.title || "تعطیل رسمی"
    }
  }

  if (typeof hLib.isPersianHoliday === "function") {
    if (hLib.isPersianHoliday(utcDate)) {
      return "تعطیل رسمی"
    }
  }

  return null
}

function getCurrentJalaliYearMonth(): { year: number; month: number } {
  const fn = (
    jalaliLib as {
      getCurrentJalaliDate?: () => { year: number; month: number }
    }
  ).getCurrentJalaliDate
  if (typeof fn === "function") {
    const cur = fn()
    if (cur?.year && cur?.month) {
      return { year: cur.year, month: cur.month }
    }
  }

  try {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "numeric",
      timeZone: "Asia/Tehran",
    }).formatToParts(new Date())

    const yearStr = parts.find((p) => p.type === "year")?.value || "1405"
    const monthStr = parts.find((p) => p.type === "month")?.value || "9"
    const normalized = normalizePersianDigits(`${yearStr}/${monthStr}`)
    const [y, m] = normalized.split("/").map(Number)
    if (y >= 1350 && y <= 1480 && m >= 1 && m <= 12) {
      return { year: y, month: m }
    }
  } catch {
    // fallback below
  }
  return { year: 1405, month: 9 }
}

function formatJalaliKey(jy: number, jm: number, jd: number): string {
  const fn = (
    jalaliLib as {
      formatJalaliDate?: (y: number, m: number, d: number) => string
    }
  ).formatJalaliDate
  if (typeof fn === "function") {
    return normalizePersianDigits(fn(jy, jm, jd))
  }
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`
}

const STATUS_META: Record<
  StaffScheduleStatus,
  {
    label: string
    shortLabel: string
    description: string
    badgeVariant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  IN_CLINIC: {
    label: "حضور در مطب / کلینیک",
    shortLabel: "مطب",
    description: "نوبت‌دهی فعال در کلینیک و مکان انتخاب‌شده",
    badgeVariant: "default",
  },
  ON_CALL: {
    label: "آنکال بیمارستان (حضور مشروط در مطب)",
    shortLabel: "آنکال",
    description:
      "در مطب قابل رزرو است، اما در صورت فراخوان بیمارستان شیفت آنکال اولویت دارد",
    badgeVariant: "secondary",
  },
  RESIDENT: {
    label: "مقیم بیمارستان / مرکز",
    shortLabel: "مقیم",
    description: "الزام حضور در بیمارستان؛ نوبت‌دهی مطب در این بازه بسته است",
    badgeVariant: "destructive",
  },
  HOSPITAL_SHIFT: {
    label: "شیفت بیمارستان (بستن نوبت مطب)",
    shortLabel: "بیمارستان",
    description: "در این بازه پزشک در بیمارستان است و نوبت مطب بسته می‌شود",
    badgeVariant: "destructive",
  },
  DAY_OFF: {
    label: "مرخصی / عدم حضور",
    shortLabel: "مرخصی",
    description: "عدم پذیرش نوبت در این بازه زمانی",
    badgeVariant: "outline",
  },
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  String(h).padStart(2, "0")
)
const MINUTE_OPTIONS = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
]

function SplitTimeSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const [hh, mm] = (value || "09:00").split(":")
  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      <Select
        value={hh || "09"}
        onValueChange={(newH) => onChange(`${newH || "09"}:${mm || "00"}`)}
      >
        <SelectTrigger className="w-20 bg-background">
          <SelectValue>{toFa(hh || "09")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {HOUR_OPTIONS.map((h) => (
            <SelectItem key={h} value={h}>
              {toFa(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="font-bold text-muted-foreground">:</span>
      <Select
        value={mm || "00"}
        onValueChange={(newM) => onChange(`${hh || "09"}:${newM || "00"}`)}
      >
        <SelectTrigger className="w-20 bg-background">
          <SelectValue>{toFa(mm || "00")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MINUTE_OPTIONS.map((m) => (
            <SelectItem key={m} value={m}>
              {toFa(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function StaffScheduleClient({
  clinicName,
  isAdmin,
  currentClinicUserId,
  staffProfiles,
  spaces,
  workingDaysByJalali,
}: StaffScheduleClientProps) {
  const router = useRouter()
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>(() => {
    const self = staffProfiles.find((s) => s.id === currentClinicUserId)
    return self?.id || staffProfiles[0]?.id || ""
  })

  const initialYm = React.useMemo(() => getCurrentJalaliYearMonth(), [])
  const [selectedYear, setSelectedYear] = React.useState<number>(initialYm.year)
  const [selectedMonth, setSelectedMonth] = React.useState<number>(
    initialYm.month
  )

  const activeStaff = React.useMemo(
    () =>
      staffProfiles.find((s) => s.id === selectedStaffId) || staffProfiles[0],
    [staffProfiles, selectedStaffId]
  )

  const [isSaving, setIsSaving] = React.useState(false)

  // --- مودال تنظیم زمان‌بندی سرویس برای پرسنل ---
  const [timingDialogOpen, setTimingDialogOpen] = React.useState(false)
  const [editingService, setEditingService] =
    React.useState<StaffServiceTimingItem | null>(null)
  const [timingMode, setTimingMode] = React.useState<ServiceTimingMode>(
    ServiceTimingMode.SINGLE_STAGE
  )
  const [prepBeforeMinutes, setPrepBeforeMinutes] = React.useState("0")
  const [durationMinutes, setDurationMinutes] = React.useState("30")
  const [stage1Minutes, setStage1Minutes] = React.useState("15")
  const [freeGapMinutes, setFreeGapMinutes] = React.useState("30")
  const [stage2Minutes, setStage2Minutes] = React.useState("15")
  const [restAfterMinutes, setRestAfterMinutes] = React.useState("0")
  const [serviceRequiresPrivacy, setServiceRequiresPrivacy] =
    React.useState(false)

  // --- مودال افزودن / ویرایش شیفت در یک روز شمسی خاص ---
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false)
  const [editingScheduleId, setEditingScheduleId] = React.useState<string | null>(
    null
  )
  const [targetJalaliDate, setTargetJalaliDate] = React.useState<string>("")
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("17:00")
  const [scheduleStatus, setScheduleStatus] =
    React.useState<StaffScheduleStatus>(StaffScheduleStatus.IN_CLINIC)
  const [spaceId, setSpaceId] = React.useState<string>("NONE")
  const [blocksClinicBook, setBlocksClinicBook] = React.useState(false)
  const [scheduleNote, setScheduleNote] = React.useState("")
  const [scheduleIsActive, setScheduleIsActive] = React.useState(true)
  const [scheduleServiceIds, setScheduleServiceIds] = React.useState<string[]>(
    []
  )

  // --- مودال تولید بازه‌ای / چندماهه / سالانه ---
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false)
  const [bulkFromDate, setBulkFromDate] = React.useState<string>("")
  const [bulkToDate, setBulkToDate] = React.useState<string>("")
  const [bulkWeekdays, setBulkWeekdays] = React.useState<number[]>([0, 2])
  const [bulkStartTime, setBulkStartTime] = React.useState("09:00")
  const [bulkEndTime, setBulkEndTime] = React.useState("17:00")
  const [bulkStatus, setBulkStatus] = React.useState<StaffScheduleStatus>(
    StaffScheduleStatus.IN_CLINIC
  )
  const [bulkSpaceId, setBulkSpaceId] = React.useState<string>("NONE")
  const [bulkBlocksClinic, setBulkBlocksClinic] = React.useState(false)
  const [bulkNote, setBulkNote] = React.useState("")
  const [bulkServiceIds, setBulkServiceIds] = React.useState<string[]>([])
  const [bulkReplaceExisting, setBulkReplaceExisting] = React.useState(false)

  const monthPrefix = `${selectedYear}/${String(selectedMonth).padStart(2, "0")}/`

  const calendarCells = React.useMemo(() => {
    const daysCount = getJalaliMonthDaysCount(selectedYear, selectedMonth)
    const firstUtc = jalaliToGregorianUtc(selectedYear, selectedMonth, 1)
    const firstWeekday = (firstUtc.getUTCDay() + 1) % 7

    const cells: Array<{
      key: string | null
      day: number | null
      weekday: number | null
      holidayTitle: string | null
      clinicDay: ClinicWorkingDaySummary | undefined
      isDayBlockedForStaff: boolean
      slots: StaffScheduleSlotItem[]
    }> = []

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({
        key: null,
        day: null,
        weekday: null,
        holidayTitle: null,
        clinicDay: undefined,
        isDayBlockedForStaff: true,
        slots: [],
      })
    }

    const monthSlots = (activeStaff?.schedules || []).filter((s) =>
      normalizePersianDigits(s.jalaliDate).startsWith(monthPrefix)
    )

    for (let d = 1; d <= daysCount; d++) {
      const key = formatJalaliKey(selectedYear, selectedMonth, d)
      const utc = jalaliToGregorianUtc(selectedYear, selectedMonth, d)
      const weekday = (utc.getUTCDay() + 1) % 7
      const holidayTitle = getHolidayTitleForDate(
        selectedYear,
        selectedMonth,
        d,
        utc
      )
      const clinicDay = workingDaysByJalali[key]
      const isDayBlockedForStaff =
        !clinicDay ||
        clinicDay.isClinicHoliday ||
        clinicDay.shifts.length === 0

      const daySlots = monthSlots.filter(
        (s) => normalizePersianDigits(s.jalaliDate) === key
      )
      cells.push({
        key,
        day: d,
        weekday,
        holidayTitle,
        clinicDay,
        isDayBlockedForStaff,
        slots: daySlots,
      })
    }

    return cells
  }, [
    selectedYear,
    selectedMonth,
    activeStaff,
    monthPrefix,
    workingDaysByJalali,
  ])

  const selectedDayPolicy = React.useMemo(() => {
    const normKey = normalizePersianDigits(targetJalaliDate).trim()
    return workingDaysByJalali[normKey]
  }, [workingDaysByJalali, targetJalaliDate])

  if (!activeStaff) {
    return (
      <div className="p-4 md:p-0" dir="rtl">
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            هیچ پرسنل فعالی برای تنظیم زمان‌بندی یافت نشد.
          </CardContent>
        </Card>
      </div>
    )
  }

  const handlePrevMonth = () => {
    if (selectedMonth > 1) {
      setSelectedMonth((m) => m - 1)
    } else {
      setSelectedYear((y) => y - 1)
      setSelectedMonth(12)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth < 12) {
      setSelectedMonth((m) => m + 1)
    } else {
      setSelectedYear((y) => y + 1)
      setSelectedMonth(1)
    }
  }

  const handleGoCurrentMonth = () => {
    const cur = getCurrentJalaliYearMonth()
    setSelectedYear(cur.year)
    setSelectedMonth(cur.month)
  }

  const openEditServiceTiming = (srv: StaffServiceTimingItem) => {
    setEditingService(srv)
    setTimingMode(srv.timingMode)
    setPrepBeforeMinutes(String(srv.prepBeforeMinutes))
    setDurationMinutes(String(srv.durationMinutes))
    setStage1Minutes(String(srv.stage1Minutes))
    setFreeGapMinutes(String(srv.freeGapMinutes || 30))
    setStage2Minutes(String(srv.stage2Minutes))
    setRestAfterMinutes(String(srv.restAfterMinutes))
    setServiceRequiresPrivacy(srv.requiresPrivacy)
    setTimingDialogOpen(true)
  }

  const handleSaveServiceTiming = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingService) return
    setIsSaving(true)
    try {
      const res = await upsertStaffServiceTimingAction({
        clinicUserId: activeStaff.id,
        serviceId: editingService.serviceId,
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
        requiresPrivacy: serviceRequiresPrivacy,
      })

      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره زمان‌بندی سرویس")
        return
      }

      toast.success(
        `زمان‌بندی سرویس «${editingService.serviceTitle}» برای ${activeStaff.fullName} ذخیره شد.`
      )
      setTimingDialogOpen(false)
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const openCreateScheduleForDate = (jalaliDate: string) => {
    const normDate = normalizePersianDigits(jalaliDate)
    const dayPol = workingDaysByJalali[normDate]
    if (!dayPol || dayPol.isClinicHoliday || dayPol.shifts.length === 0) {
      toast.error(
        `در تاریخ ${toFa(normDate)} کلینیک تعطیل است یا ساعات کاری آن در «ساعات کاری کلینیک» ثبت نشده است.`
      )
      return
    }

    const firstShift = dayPol.shifts[0]
    setEditingScheduleId(null)
    setTargetJalaliDate(normDate)
    setStartTime(firstShift.startTime)
    setEndTime(firstShift.endTime)
    setScheduleStatus(StaffScheduleStatus.IN_CLINIC)
    setSpaceId(spaces[0]?.id || "NONE")
    setBlocksClinicBook(false)
    setScheduleNote("")
    setScheduleIsActive(true)
    setScheduleServiceIds(activeStaff.services.map((s) => s.serviceId))
    setScheduleDialogOpen(true)
  }

  const openEditSchedule = (slot: StaffScheduleSlotItem) => {
    setEditingScheduleId(slot.id)
    setTargetJalaliDate(normalizePersianDigits(slot.jalaliDate))
    setStartTime(slot.startTime)
    setEndTime(slot.endTime)
    setScheduleStatus(slot.status)
    setSpaceId(slot.space?.id || "NONE")
    setBlocksClinicBook(slot.blocksClinicBook)
    setScheduleNote(slot.note || "")
    setScheduleIsActive(slot.isActive)
    setScheduleServiceIds(slot.allowedServices.map((s) => s.id))
    setScheduleDialogOpen(true)
  }

  const toggleScheduleService = (srvId: string) => {
    setScheduleServiceIds((prev) =>
      prev.includes(srvId)
        ? prev.filter((id) => id !== srvId)
        : [...prev, srvId]
    )
  }

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    const normDate = normalizePersianDigits(targetJalaliDate).trim()
    const dayPol = workingDaysByJalali[normDate]

    if (!dayPol || dayPol.isClinicHoliday || dayPol.shifts.length === 0) {
      toast.error(
        "امکان ثبت شیفت در روز تعطیل کلینیک یا روزی که ساعات کاری کلینیک در آن تعریف نشده وجود ندارد."
      )
      return
    }

    const reqStart = timeToMinutes(startTime)
    const reqEnd = timeToMinutes(endTime)
    if (reqStart >= reqEnd) {
      toast.error("ساعت پایان باید بعد از ساعت شروع باشد.")
      return
    }

    const insideClinicShift = dayPol.shifts.some(
      (sh) =>
        reqStart >= timeToMinutes(sh.startTime) &&
        reqEnd <= timeToMinutes(sh.endTime)
    )

    if (!insideClinicShift) {
      const allowedStr = dayPol.shifts
        .map((s) => `${s.startTime} تا ${s.endTime}`)
        .join(" و ")
      toast.error(
        `بازه انتخاب‌شده خارج از ساعات کاری کلینیک در این روز است. بازه‌های مجاز کلینیک: ${toFa(
          allowedStr
        )}`
      )
      return
    }

    setIsSaving(true)
    try {
      const res = await upsertStaffScheduleAction({
        id: editingScheduleId || undefined,
        clinicUserId: activeStaff.id,
        spaceId: spaceId === "NONE" ? null : spaceId,
        jalaliDate: normDate,
        startTime,
        endTime,
        status: scheduleStatus,
        blocksClinicBook,
        note: scheduleNote,
        isActive: scheduleIsActive,
        allowedServiceIds: scheduleServiceIds,
      })

      if (!res.success) {
        toast.error(res.error || "خطا در ثبت برنامه حضور")
        return
      }

      toast.success("برنامه حضور روزانه ذخیره شد.")
      setScheduleDialogOpen(false)
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const openBulkGeneratorDialog = () => {
    const lastDay = getJalaliMonthDaysCount(selectedYear, selectedMonth)
    setBulkFromDate(formatJalaliKey(selectedYear, selectedMonth, 1))
    setBulkToDate(formatJalaliKey(selectedYear, selectedMonth, lastDay))
    setBulkWeekdays([0, 2])
    setBulkStartTime("09:00")
    setBulkEndTime("17:00")
    setBulkStatus(StaffScheduleStatus.IN_CLINIC)
    setBulkSpaceId(spaces[0]?.id || "NONE")
    setBulkBlocksClinic(false)
    setBulkNote("")
    setBulkServiceIds(activeStaff.services.map((s) => s.serviceId))
    setBulkReplaceExisting(false)
    setBulkDialogOpen(true)
  }

  const toggleBulkWeekday = (dayIdx: number) => {
    setBulkWeekdays((prev) =>
      prev.includes(dayIdx)
        ? prev.filter((d) => d !== dayIdx)
        : [...prev, dayIdx]
    )
  }

  const toggleBulkService = (srvId: string) => {
    setBulkServiceIds((prev) =>
      prev.includes(srvId)
        ? prev.filter((id) => id !== srvId)
        : [...prev, srvId]
    )
  }

  const handleGenerateBulk = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await generateBulkStaffSchedulesAction({
        clinicUserId: activeStaff.id,
        fromJalaliDate: normalizePersianDigits(bulkFromDate),
        toJalaliDate: normalizePersianDigits(bulkToDate),
        weekdays: bulkWeekdays,
        spaceId: bulkSpaceId === "NONE" ? null : bulkSpaceId,
        startTime: bulkStartTime,
        endTime: bulkEndTime,
        status: bulkStatus,
        blocksClinicBook: bulkBlocksClinic,
        note: bulkNote,
        allowedServiceIds: bulkServiceIds,
        replaceOnTargetDays: bulkReplaceExisting,
      })

      if (!res.success) {
        toast.error(res.error || "خطا در تولید برنامه بازه‌ای")
        return
      }

      const skippedMsg =
        res.skippedCount && res.skippedCount > 0
          ? ` (${toFa(res.skippedCount)} روز به دلیل تعطیلی یا خارج بودن از ساعات کاری کلینیک اعمال نشد)`
          : ""

      toast.success(
        `برنامه حضور برای ${toFa(
          res.createdCount || 0
        )} روز در بازه انتخاب‌شده ایجاد شد.${skippedMsg}`
      )
      setBulkDialogOpen(false)
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSchedule = async (slotId: string) => {
    setIsSaving(true)
    try {
      const res = await deleteStaffScheduleAction(slotId)
      if (!res.success) {
        toast.error(res.error || "خطا در حذف شیفت")
        return
      }
      toast.success("بازه حضور حذف شد.")
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const monthSlotsCount = calendarCells.reduce(
    (acc, cell) => acc + cell.slots.length,
    0
  )

  return (
    <div className="space-y-6 p-4 md:p-0" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            زمان‌بندی ماهانه، مکان و سرویس‌های پرسنل
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            ثبت حضور، آنکال، مقیم و شیفت بیمارستان صرفاً در روزها و ساعات کاری مجاز کلینیک ({clinicName})
          </p>
        </div>

        {isAdmin && staffProfiles.length > 0 && (
          <div className="w-full sm:w-72">
            <Select
              value={activeStaff.id}
              onValueChange={(val) => val && setSelectedStaffId(val)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue>
                  {activeStaff.fullName} ({activeStaff.jobTitle})
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {staffProfiles.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName} — {member.jobTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserCheck className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold">{activeStaff.fullName}</h2>
                <Badge variant="secondary">{activeStaff.jobTitle}</Badge>
                {activeStaff.specialty && (
                  <Badge variant="outline">{activeStaff.specialty}</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                سرویس‌های مجاز:{" "}
                <strong className="text-foreground">
                  {toFa(activeStaff.services.length)} سرویس
                </strong>{" "}
                | شیفت‌های ثبت‌شده در{" "}
                <strong className="text-foreground">
                  {JALALI_MONTHS[selectedMonth - 1]} {toFa(selectedYear)}
                </strong>
                :{" "}
                <strong className="text-foreground">
                  {toFa(monthSlotsCount)} مورد
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={openBulkGeneratorDialog}
              className="w-full sm:w-auto"
            >
              <CalendarRange className="ml-1.5 size-4" />
              اعمال بازه‌ای / چندماهه / سالانه
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="schedules" dir="rtl" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 [&_[data-slot=tabs-indicator]]:hidden">
          <TabsTrigger
            value="schedules"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            <CalendarClock className="ml-1.5 size-4" />
            تقویم حضور ماهانه و آنکال
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            <Clock className="ml-1.5 size-4" />
            زمان‌بندی سرویس‌های مجاز
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={handlePrevMonth}
                  title="ماه قبل"
                >
                  <ChevronRight className="size-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <Select
                    value={String(selectedMonth)}
                    onValueChange={(v) => setSelectedMonth(Number(v ?? 1))}
                  >
                    <SelectTrigger className="w-32 bg-background">
                      <SelectValue>
                        {JALALI_MONTHS[selectedMonth - 1]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {JALALI_MONTHS.map((mName, idx) => (
                        <SelectItem key={mName} value={String(idx + 1)}>
                          {mName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(selectedYear)}
                    onValueChange={(v) =>
                      setSelectedYear(Number(v ?? initialYm.year))
                    }
                  >
                    <SelectTrigger className="w-24 bg-background">
                      <SelectValue>{toFa(selectedYear)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        initialYm.year - 1,
                        initialYm.year,
                        initialYm.year + 1,
                        initialYm.year + 2,
                      ].map((yr) => (
                        <SelectItem key={yr} value={String(yr)}>
                          {toFa(yr)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={handleNextMonth}
                  title="ماه بعد"
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleGoCurrentMonth}
              >
                برو به ماه جاری
              </Button>
            </CardHeader>

            <CardContent className="p-3 sm:p-4">
              <div className="mb-2 hidden grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground md:grid">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w.index}
                    className={cn(
                      "rounded-lg bg-muted/50 py-2",
                      w.index === 6 && "text-destructive"
                    )}
                  >
                    {w.label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-7">
                {calendarCells.map((cell, idx) => {
                  if (!cell.day || !cell.key) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="hidden min-h-32 rounded-xl border border-dashed bg-muted/10 md:block"
                      />
                    )
                  }

                  const isFriday = cell.weekday === 6
                  const isOfficialHoliday = Boolean(cell.holidayTitle)
                  const dayLabel =
                    WEEKDAYS.find((w) => w.index === cell.weekday)?.label || ""

                  return (
                    <div
                      key={cell.key}
                      className={cn(
                        "flex min-h-32 flex-col justify-between rounded-xl border bg-background p-2.5 transition-colors",
                        cell.isDayBlockedForStaff
                          ? "border-destructive/30 bg-destructive/5"
                          : "hover:border-primary/40"
                      )}
                    >
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                                isFriday ||
                                  isOfficialHoliday ||
                                  cell.isDayBlockedForStaff
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-primary/10 text-primary"
                              )}
                            >
                              {toFa(cell.day)}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground md:hidden">
                              {dayLabel}
                            </span>
                          </div>

                          {!cell.isDayBlockedForStaff ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                openCreateScheduleForDate(cell.key!)
                              }
                              title={`ثبت شیفت برای ${toFa(cell.key)}`}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          ) : (
                            <span
                              className="inline-flex items-center text-destructive/80"
                              title="تعطیل یا فاقد ساعت کاری ثبت‌شده در کلینیک"
                            >
                              <Lock className="size-3.5" />
                            </span>
                          )}
                        </div>

                        {cell.holidayTitle && (
                          <div className="mb-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                            {cell.holidayTitle}
                          </div>
                        )}

                        {!cell.clinicDay ? (
                          <div className="mb-1.5 rounded-md bg-muted px-1.5 py-1 text-[10px] text-muted-foreground">
                            ساعت کاری کلینیک ثبت نشده
                          </div>
                        ) : cell.clinicDay.isClinicHoliday ? (
                          <div className="mb-1.5 rounded-md bg-destructive/10 px-1.5 py-1 text-[10px] font-medium text-destructive">
                            تعطیل کلینیک{" "}
                            {cell.clinicDay.holidayNote
                              ? `(${cell.clinicDay.holidayNote})`
                              : ""}
                          </div>
                        ) : cell.clinicDay.shifts.length > 0 ? (
                          <div className="mb-1.5 space-y-0.5 rounded-md bg-emerald-500/10 px-1.5 py-1 text-[10px] text-emerald-800 dark:text-emerald-300">
                            <div className="font-semibold">ساعت کلینیک:</div>
                            {cell.clinicDay.shifts.map((sh, sIdx) => (
                              <div key={sIdx} dir="ltr" className="font-mono">
                                {toFa(sh.startTime)} - {toFa(sh.endTime)}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="space-y-1.5">
                          {cell.slots.map((slot) => {
                            const meta = STATUS_META[slot.status]
                            return (
                              <div
                                key={slot.id}
                                className="space-y-1 rounded-lg border bg-muted/35 p-1.5 text-[11px]"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <Badge
                                    variant={meta.badgeVariant}
                                    className="h-4 px-1.5 text-[10px]"
                                  >
                                    {meta.shortLabel}
                                  </Badge>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => openEditSchedule(slot)}
                                      className="rounded p-0.5 hover:bg-background"
                                      title="ویرایش"
                                    >
                                      <Edit3 className="size-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() =>
                                        void handleDeleteSchedule(slot.id)
                                      }
                                      className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                                      title="حذف"
                                    >
                                      <Trash2 className="size-3" />
                                    </button>
                                  </div>
                                </div>

                                <div
                                  dir="ltr"
                                  className="font-mono text-[10px] font-semibold"
                                >
                                  {toFa(slot.startTime)} - {toFa(slot.endTime)}
                                </div>

                                {slot.space && (
                                  <div className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                                    {slot.space.spaceType ===
                                    ClinicSpaceType.HOSPITAL ? (
                                      <Hospital className="size-3 shrink-0 text-emerald-600" />
                                    ) : (
                                      <DoorOpen className="size-3 shrink-0 text-primary" />
                                    )}
                                    <span className="truncate">
                                      {slot.space.name}
                                    </span>
                                  </div>
                                )}

                                {slot.blocksClinicBook && (
                                  <div className="flex items-center gap-0.5 text-[10px] font-medium text-destructive">
                                    <AlertTriangle className="size-2.5 shrink-0" />
                                    <span>نوبت مطب بسته</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          {activeStaff.services.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                هنوز هیچ سرویسی به این پرسنل اختصاص داده نشده است. ابتدا از بخش «مدیریت پرسنل» خدمات مجاز این فرد را مشخص کنید.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeStaff.services.map((srv) => {
                const isSplit =
                  srv.timingMode === ServiceTimingMode.SPLIT_STAGE
                const totalCycleMinutes = isSplit
                  ? srv.prepBeforeMinutes +
                    srv.stage1Minutes +
                    srv.freeGapMinutes +
                    srv.stage2Minutes +
                    srv.restAfterMinutes
                  : srv.prepBeforeMinutes +
                    srv.durationMinutes +
                    srv.restAfterMinutes

                return (
                  <Card key={srv.serviceId} className="flex flex-col">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-bold">
                            {srv.serviceTitle}
                          </CardTitle>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant={isSplit ? "default" : "secondary"}
                              className="gap-1 text-[11px]"
                            >
                              {isSplit ? (
                                <>
                                  <Split className="size-3" />
                                  چندمرحله‌ای (دارای تایم آزاد میانی)
                                </>
                              ) : (
                                <>
                                  <Clock className="size-3" />
                                  تک‌مرحله‌ای استاندارد
                                </>
                              )}
                            </Badge>
                            {srv.isCustomized && (
                              <Badge variant="outline" className="text-[11px]">
                                شخصی‌سازی‌شده
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => openEditServiceTiming(srv)}
                        >
                          <Edit3 className="ml-1 size-3.5" />
                          تنظیم زمان
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-2.5 p-4 pt-2 text-xs">
                      <div className="space-y-1.5 rounded-xl border bg-muted/20 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            حضور مراجع قبل از شروع:
                          </span>
                          <span className="font-semibold">
                            {toFa(srv.prepBeforeMinutes)} دقیقه
                          </span>
                        </div>

                        {isSplit ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                مرحله ۱ (مثلاً خون‌گیری):
                              </span>
                              <span className="font-semibold">
                                {toFa(srv.stage1Minutes)} دقیقه
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                              <span className="flex items-center gap-1 font-medium">
                                <Sparkles className="size-3" />
                                تایم آزاد میانی (قابل رزرو برای دیگران):
                              </span>
                              <span className="font-bold">
                                {toFa(srv.freeGapMinutes)} دقیقه
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                مرحله ۲ (مثلاً تزریق نهایی):
                              </span>
                              <span className="font-semibold">
                                {toFa(srv.stage2Minutes)} دقیقه
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              مدت انجام سرویس:
                            </span>
                            <span className="font-semibold">
                              {toFa(srv.durationMinutes)} دقیقه
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t pt-1.5">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Coffee className="size-3" />
                            زمان استراحت / پاکسازی:
                          </span>
                          <span className="font-semibold">
                            {toFa(srv.restAfterMinutes)} دقیقه
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>کل بازه چرخه نوبت:</span>
                        <strong className="text-foreground">
                          {toFa(totalCycleMinutes)} دقیقه
                        </strong>
                      </div>

                      {srv.requiresPrivacy && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                          <ShieldCheck className="size-3.5 shrink-0" />
                          نیازمند فضای خالی / رعایت کامل پرایوسی مراجع
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* مودال تنظیم زمان‌بندی سرویس */}
      <ResponsiveDialog
        open={timingDialogOpen}
        onOpenChange={(open) => !isSaving && setTimingDialogOpen(open)}
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
              تنظیم زمان‌بندی «{editingService?.serviceTitle}»
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              مدت انجام سرویس، زمان حضور مراجع قبل از شروع، استراحت و در صورت نیاز تایم آزاد میانی (مانند PRP) را مشخص کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSaveServiceTiming} className="contents">
            <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto pt-2">
              <div className="px-5">
                <FieldGroup>
                  <Field>
                    <FieldLabel>مدل زمان‌بندی سرویس</FieldLabel>
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

                  <Field>
                    <FieldLabel htmlFor="prepBefore">
                      زمان حضور مراجع قبل از شروع (دقیقه)
                    </FieldLabel>
                    <Input
                      id="prepBefore"
                      type="number"
                      min={0}
                      max={240}
                      dir="ltr"
                      value={prepBeforeMinutes}
                      onChange={(e) => setPrepBeforeMinutes(e.target.value)}
                    />
                  </Field>

                  {timingMode === ServiceTimingMode.SINGLE_STAGE ? (
                    <Field>
                      <FieldLabel htmlFor="durationMin">
                        مدت انجام سرویس (دقیقه)
                      </FieldLabel>
                      <Input
                        id="durationMin"
                        type="number"
                        min={5}
                        max={480}
                        dir="ltr"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                      />
                    </Field>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                      <p className="text-xs font-bold text-primary">
                        تنظیمات مراحل سرویس و تایم آزاد میانی
                      </p>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field>
                          <FieldLabel htmlFor="stage1Min">
                            مرحله ۱ (دقیقه)
                          </FieldLabel>
                          <Input
                            id="stage1Min"
                            type="number"
                            min={5}
                            max={240}
                            dir="ltr"
                            value={stage1Minutes}
                            onChange={(e) => setStage1Minutes(e.target.value)}
                          />
                          <FieldDescription className="text-[10px]">
                            مثلاً خون‌گیری
                          </FieldDescription>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="freeGapMin">
                            تایم آزاد میانی (دقیقه)
                          </FieldLabel>
                          <Input
                            id="freeGapMin"
                            type="number"
                            min={0}
                            max={360}
                            dir="ltr"
                            value={freeGapMinutes}
                            onChange={(e) => setFreeGapMinutes(e.target.value)}
                          />
                          <FieldDescription className="text-[10px]">
                            قابل رزرو برای مراجع دیگر
                          </FieldDescription>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="stage2Min">
                            مرحله ۲ (دقیقه)
                          </FieldLabel>
                          <Input
                            id="stage2Min"
                            type="number"
                            min={5}
                            max={240}
                            dir="ltr"
                            value={stage2Minutes}
                            onChange={(e) => setStage2Minutes(e.target.value)}
                          />
                          <FieldDescription className="text-[10px]">
                            مثلاً تزریق نهایی
                          </FieldDescription>
                        </Field>
                      </div>
                    </div>
                  )}

                  <Field>
                    <FieldLabel htmlFor="restAfter">
                      زمان استراحت / پاکسازی بعد از سرویس (دقیقه)
                    </FieldLabel>
                    <Input
                      id="restAfter"
                      type="number"
                      min={0}
                      max={180}
                      dir="ltr"
                      value={restAfterMinutes}
                      onChange={(e) => setRestAfterMinutes(e.target.value)}
                    />
                  </Field>

                  <Field orientation="horizontal">
                    <Checkbox
                      id="srvPrivacy"
                      checked={serviceRequiresPrivacy}
                      onCheckedChange={(v) =>
                        setServiceRequiresPrivacy(Boolean(v))
                      }
                    />
                    <div className="space-y-0.5">
                      <FieldLabel
                        htmlFor="srvPrivacy"
                        className="cursor-pointer font-semibold"
                      >
                        این سرویس نیازمند اتاق خالی / رعایت پرایوسی است
                      </FieldLabel>
                    </div>
                  </Field>
                </FieldGroup>
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter className="gap-2">
              <ResponsiveDialogDesktopOnly>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => setTimingDialogOpen(false)}
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
                {isSaving ? "در حال ذخیره..." : "ذخیره زمان‌بندی"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* مودال ثبت / ویرایش شیفت در یک روز شمسی مشخص */}
      <ResponsiveDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => !isSaving && setScheduleDialogOpen(open)}
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
              {editingScheduleId
                ? "ویرایش برنامه حضور روزانه"
                : "ثبت برنامه حضور در روز شمسی"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              ساعات حضور پرسنل باید داخل بازه‌های کاریِ تعریف‌شده کلینیک در این تاریخ باشد.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSaveSchedule} className="contents">
            <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto pt-2">
              <div className="px-5">
                <FieldGroup>
                  {selectedDayPolicy &&
                    !selectedDayPolicy.isClinicHoliday &&
                    selectedDayPolicy.shifts.length > 0 && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200">
                        <span className="font-bold">
                          بازه‌های کاری مجاز کلینیک در {toFa(targetJalaliDate)}:
                        </span>{" "}
                        <span dir="ltr" className="font-mono font-semibold">
                          {toFa(
                            selectedDayPolicy.shifts
                              .map((s) => `${s.startTime} - ${s.endTime}`)
                              .join(" | ")
                          )}
                        </span>
                      </div>
                    )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="jDateInput">
                        تاریخ شمسی (YYYY/MM/DD)
                      </FieldLabel>
                      <Input
                        id="jDateInput"
                        dir="ltr"
                        required
                        value={targetJalaliDate}
                        onChange={(e) => setTargetJalaliDate(e.target.value)}
                        placeholder="1405/09/05"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>مکان (اتاق / یونیت / بیمارستان)</FieldLabel>
                      <Select
                        value={spaceId}
                        onValueChange={(val) => setSpaceId(val || "NONE")}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue>
                            {spaceId === "NONE"
                              ? "بدون اتصال به مکان خاص"
                              : spaces.find((s) => s.id === spaceId)?.name ||
                                "انتخاب مکان"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">
                            بدون اتصال به مکان خاص
                          </SelectItem>
                          {spaces.map((sp) => (
                            <SelectItem key={sp.id} value={sp.id}>
                              {sp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>ساعت شروع</FieldLabel>
                      <SplitTimeSelect
                        value={startTime}
                        onChange={setStartTime}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>ساعت پایان</FieldLabel>
                      <SplitTimeSelect value={endTime} onChange={setEndTime} />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>وضعیت حضور پرسنل</FieldLabel>
                    <Select
                      value={scheduleStatus}
                      onValueChange={(val) => {
                        const next =
                          (val as StaffScheduleStatus) ||
                          StaffScheduleStatus.IN_CLINIC
                        setScheduleStatus(next)
                        if (
                          next === StaffScheduleStatus.HOSPITAL_SHIFT ||
                          next === StaffScheduleStatus.RESIDENT ||
                          next === StaffScheduleStatus.DAY_OFF
                        ) {
                          setBlocksClinicBook(true)
                        } else if (next === StaffScheduleStatus.IN_CLINIC) {
                          setBlocksClinicBook(false)
                        }
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue>
                          {STATUS_META[scheduleStatus].label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(STATUS_META) as StaffScheduleStatus[]
                        ).map((st) => (
                          <SelectItem key={st} value={st}>
                            {STATUS_META[st].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription className="text-[11px]">
                      {STATUS_META[scheduleStatus].description}
                    </FieldDescription>
                  </Field>

                  <Field orientation="horizontal">
                    <Checkbox
                      id="blocksClinic"
                      checked={blocksClinicBook}
                      onCheckedChange={(v) => setBlocksClinicBook(Boolean(v))}
                    />
                    <div className="space-y-0.5">
                      <FieldLabel
                        htmlFor="blocksClinic"
                        className="cursor-pointer font-semibold"
                      >
                        بستن نوبت‌دهی مطب در این بازه زمانی
                      </FieldLabel>
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>
                      سرویس‌های قابل انجام در این شیفت و مکان (
                      {toFa(scheduleServiceIds.length)} انتخاب‌شده)
                    </FieldLabel>
                    <div className="mt-1.5 grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-xl border p-2.5 sm:grid-cols-2">
                      {activeStaff.services.map((srv) => {
                        const checked = scheduleServiceIds.includes(
                          srv.serviceId
                        )
                        return (
                          <label
                            key={srv.serviceId}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                              checked
                                ? "border-primary bg-primary/10 font-medium text-primary"
                                : "bg-background hover:bg-muted/50"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                toggleScheduleService(srv.serviceId)
                              }
                            />
                            <span className="truncate">{srv.serviceTitle}</span>
                          </label>
                        )
                      })}
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="schNote">
                      توضیحات شیفت / آنکال (اختیاری)
                    </FieldLabel>
                    <Textarea
                      id="schNote"
                      rows={2}
                      value={scheduleNote}
                      onChange={(e) => setScheduleNote(e.target.value)}
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
                  disabled={isSaving}
                  onClick={() => setScheduleDialogOpen(false)}
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
                {isSaving ? "در حال ذخیره..." : "ذخیره برنامه حضور"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* مودال اعمال بازه‌ای / چندماهه / سالانه */}
      <ResponsiveDialog
        open={bulkDialogOpen}
        onOpenChange={(open) => !isSaving && setBulkDialogOpen(open)}
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
              اعمال بازه‌ای / چندماهه / سالانه برنامه حضور
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              فقط در روزها و ساعات کاریِ فعال کلینیک ثبت می‌شود؛ روزهای تعطیل کلینیک یا ساعات خارج از ساعت کاری کلینیک اعمال نخواهند شد.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleGenerateBulk} className="contents">
            <ResponsiveDialogPanel className="no-scrollbar max-h-[70vh] overflow-y-auto pt-2">
              <div className="px-5">
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="bulkFrom">
                        از تاریخ شمسی (YYYY/MM/DD)
                      </FieldLabel>
                      <Input
                        id="bulkFrom"
                        dir="ltr"
                        required
                        value={bulkFromDate}
                        onChange={(e) => setBulkFromDate(e.target.value)}
                        placeholder="1405/09/01"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="bulkTo">
                        تا تاریخ شمسی (YYYY/MM/DD)
                      </FieldLabel>
                      <Input
                        id="bulkTo"
                        dir="ltr"
                        required
                        value={bulkToDate}
                        onChange={(e) => setBulkToDate(e.target.value)}
                        placeholder="1405/12/29"
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>روزهای هفته در این بازه</FieldLabel>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((d) => {
                        const checked = bulkWeekdays.includes(d.index)
                        return (
                          <button
                            key={d.index}
                            type="button"
                            onClick={() => toggleBulkWeekday(d.index)}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "bg-background hover:bg-muted"
                            )}
                          >
                            {d.label}
                          </button>
                        )
                      })}
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>ساعت شروع</FieldLabel>
                      <SplitTimeSelect
                        value={bulkStartTime}
                        onChange={setBulkStartTime}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>ساعت پایان</FieldLabel>
                      <SplitTimeSelect
                        value={bulkEndTime}
                        onChange={setBulkEndTime}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>وضعیت حضور</FieldLabel>
                      <Select
                        value={bulkStatus}
                        onValueChange={(val) => {
                          const next =
                            (val as StaffScheduleStatus) ||
                            StaffScheduleStatus.IN_CLINIC
                          setBulkStatus(next)
                          if (
                            next === StaffScheduleStatus.HOSPITAL_SHIFT ||
                            next === StaffScheduleStatus.RESIDENT ||
                            next === StaffScheduleStatus.DAY_OFF
                          ) {
                            setBulkBlocksClinic(true)
                          } else if (next === StaffScheduleStatus.IN_CLINIC) {
                            setBulkBlocksClinic(false)
                          }
                        }}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue>
                            {STATUS_META[bulkStatus].label}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.keys(STATUS_META) as StaffScheduleStatus[]
                          ).map((st) => (
                            <SelectItem key={st} value={st}>
                              {STATUS_META[st].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel>مکان متصل</FieldLabel>
                      <Select
                        value={bulkSpaceId}
                        onValueChange={(val) => setBulkSpaceId(val || "NONE")}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue>
                            {bulkSpaceId === "NONE"
                              ? "بدون اتصال به مکان خاص"
                              : spaces.find((s) => s.id === bulkSpaceId)
                                  ?.name || "انتخاب مکان"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">
                            بدون اتصال به مکان خاص
                          </SelectItem>
                          {spaces.map((sp) => (
                            <SelectItem key={sp.id} value={sp.id}>
                              {sp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field orientation="horizontal">
                    <Checkbox
                      id="bulkBlocksClinic"
                      checked={bulkBlocksClinic}
                      onCheckedChange={(v) => setBulkBlocksClinic(Boolean(v))}
                    />
                    <FieldLabel
                      htmlFor="bulkBlocksClinic"
                      className="cursor-pointer font-semibold"
                    >
                      بستن نوبت‌دهی مطب در این بازه زمانی
                    </FieldLabel>
                  </Field>

                  <Field orientation="horizontal">
                    <Checkbox
                      id="bulkReplace"
                      checked={bulkReplaceExisting}
                      onCheckedChange={(v) => setBulkReplaceExisting(Boolean(v))}
                    />
                    <div className="space-y-0.5">
                      <FieldLabel
                        htmlFor="bulkReplace"
                        className="cursor-pointer font-semibold"
                      >
                        جایگزینی برنامه‌های قبلی در روزهای انتخاب‌شده
                      </FieldLabel>
                      <FieldDescription className="text-[11px]">
                        در صورت فعال بودن، شیفت‌های قبلی همان روزها در بازه پاک شده و الگوی جدید جایگزین می‌شود.
                      </FieldDescription>
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>
                      سرویس‌های مجاز ({toFa(bulkServiceIds.length)} انتخاب‌شده)
                    </FieldLabel>
                    <div className="mt-1.5 grid max-h-36 grid-cols-1 gap-2 overflow-y-auto rounded-xl border p-2.5 sm:grid-cols-2">
                      {activeStaff.services.map((srv) => {
                        const checked = bulkServiceIds.includes(srv.serviceId)
                        return (
                          <label
                            key={srv.serviceId}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                              checked
                                ? "border-primary bg-primary/10 font-medium text-primary"
                                : "bg-background hover:bg-muted/50"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                toggleBulkService(srv.serviceId)
                              }
                            />
                            <span className="truncate">{srv.serviceTitle}</span>
                          </label>
                        )
                      })}
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="bulkNote">
                      یادداشت بازه (اختیاری)
                    </FieldLabel>
                    <Input
                      id="bulkNote"
                      value={bulkNote}
                      onChange={(e) => setBulkNote(e.target.value)}
                      placeholder="مثلاً: برنامه فصلی یا شیفت آنکال بیمارستان"
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
                  disabled={isSaving}
                  onClick={() => setBulkDialogOpen(false)}
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
                <CalendarRange className="ml-1.5 size-4" />
                {isSaving ? "در حال تولید..." : "تولید برنامه در بازه"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}