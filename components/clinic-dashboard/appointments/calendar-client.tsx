// components/clinic-dashboard/appointments/calendar-client.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AppointmentBookingSource,
  AppointmentStatus,
  ClinicSpaceType,
  ServiceTimingMode,
} from "@prisma/client"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Edit3,
  Filter,
  LayoutPanelTop,
  MoreVertical,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { DatePicker } from "@/components/ui/date-picker"
import {
  ResponsiveTimePicker,
  ResponsiveTimePickerContent,
  ResponsiveTimePickerTrigger,
  type TimePickerValue,
} from "@/components/ui/time-picker"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  upsertAppointmentAction,
  getAvailableAppointmentSlotsAction,
  updateAppointmentStatusAction,
  deleteAppointmentAction,
  type CreatedClientSummary,
} from "@/app/clinic-dashboard/(dashboard)/calendar/actions"
import {
  ClientCombobox,
  type ClientComboboxItem,
} from "@/components/clinic-dashboard/appointments/client-combobox"
import type { AvailableSlotSuggestion } from "@/lib/scheduling/availability"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"
import { toGregorian, toJalali } from "@/lib/jalali"
import * as persianHolidaysLib from "@/lib/persian-holidays"
import "@/lib/persian-holidays-data"
import { cn } from "@/lib/utils"

export interface AppointmentRecord {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  fileNumber: number | null
  serviceId: string
  serviceTitle: string
  subServiceId: string | null
  subServiceTitle: string | null
  therapistId: string | null
  therapistName: string
  spaceId: string | null
  spaceName: string | null
  createdByName: string
  bookingSource: AppointmentBookingSource
  status: AppointmentStatus
  jalaliDate: string
  arrivalTime: string
  startTime: string
  endTime: string
  blockEndTime: string
  timingMode: ServiceTimingMode
  freeGapMinutes: number
  isManualOverride: boolean
  overrideReason: string | null
  notes: string | null
  cancellationReason: string | null
  createdAtIso: string
}

export interface CalendarServiceOption {
  id: string
  title: string
  subServices: Array<{
    id: string
    title: string
    price: number
  }>
}

export interface CalendarStaffOption {
  id: string
  fullName: string
  jobTitle: string
  hasAllServicesAccess?: boolean
  assignedServiceIds?: string[]
}

export interface CalendarSpaceOption {
  id: string
  name: string
  spaceType: ClinicSpaceType
  allowedServiceIds?: string[]
}

export type CalendarClientOption = ClientComboboxItem

interface CalendarClientProps {
  clinicName: string
  initialJalaliDate: string
  initialView: "daily" | "monthly" | "table" | "logs"
  appointments: AppointmentRecord[]
  services: CalendarServiceOption[]
  staff: CalendarStaffOption[]
  spaces: CalendarSpaceOption[]
  clients: CalendarClientOption[]
  permissions: {
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
  }
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
function toFa(val: number | string): string {
  return String(val).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

const JALALI_MONTH_NAMES = [
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

const WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
]

const STATUS_CONFIG: Record<
  AppointmentStatus,
  {
    label: string
    badgeVariant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  PENDING: { label: "در انتظار تایید", badgeVariant: "secondary" },
  CONFIRMED: { label: "قطعی شده", badgeVariant: "default" },
  IN_PROGRESS: { label: "در حال انجام", badgeVariant: "default" },
  COMPLETED: { label: "انجام شده", badgeVariant: "outline" },
  CANCELED: { label: "لغو / لیست رزرو", badgeVariant: "destructive" },
  NO_SHOW: { label: "عدم حضور", badgeVariant: "destructive" },
}

const HOURS_LIST = Array.from({ length: 16 }, (_, i) =>
  `${String(i + 7).padStart(2, "0")}:00`
)

function getCurrentSystemTimeHHmm(): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function parseHHmmToPickerValue(hhmm: string): TimePickerValue {
  const clean = normalizePersianDigits(hhmm || "").trim()
  const [h, m] = clean.split(":").map(Number)
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  }
}

function normalizeTypedHHmm(raw: string, fallback: string): string {
  const clean = normalizePersianDigits(raw || "").trim()
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(clean)
  if (!match) return fallback
  const h = Number(match[1])
  const m = Number(match[2])
  if (
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    return fallback
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function jalaliStringToDate(jStr: string): Date | null {
  const norm = normalizePersianDigits(jStr || "").trim()
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(norm)
  if (!match) return null
  const jy = Number(match[1])
  const jm = Number(match[2])
  const jd = Number(match[3])
  if (jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > 31) {
    return null
  }
  const g = toGregorian(jy, jm, jd)
  const check = toJalali(g)
  if (check.jy !== jy || check.jm !== jm || check.jd !== jd) return null
  return g
}

function dateToJalaliString(d: Date): string {
  const j = toJalali(d)
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(
    2,
    "0"
  )}`
}

function parseJalaliParts(jStr: string): { jy: number; jm: number; jd: number } {
  const norm = normalizePersianDigits(jStr).trim()
  const [y, m, d] = norm.split(/[/-]/).map(Number)
  const now = toJalali(new Date())
  return {
    jy: y && y >= 1300 && y <= 1500 ? y : now.jy,
    jm: m && m >= 1 && m <= 12 ? m : now.jm,
    jd: d && d >= 1 && d <= 31 ? d : now.jd,
  }
}

function getMonthDaysCount(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  const g30 = toGregorian(jy, 12, 30)
  const j30 = toJalali(g30)
  return j30.jy === jy && j30.jm === 12 && j30.jd === 30 ? 30 : 29
}

function resolveHolidayTitle(gDate: Date): string | null {
  const hLib = persianHolidaysLib as {
    getHolidaysInRange?: (
      start: Date,
      end: Date
    ) => Array<{ date: Date; title?: string; isHoliday?: boolean }>
  }
  if (typeof hLib.getHolidaysInRange === "function") {
    const startOfDay = new Date(
      gDate.getFullYear(),
      gDate.getMonth(),
      gDate.getDate(),
      0,
      0,
      0
    )
    const endOfDay = new Date(
      gDate.getFullYear(),
      gDate.getMonth(),
      gDate.getDate(),
      23,
      59,
      59
    )
    const list = hLib.getHolidaysInRange(startOfDay, endOfDay)
    const found = list.find((item) => item.isHoliday !== false)
    if (found) return found.title || "تعطیل رسمی"
  }
  return null
}

export function CalendarClient({
  clinicName,
  initialJalaliDate,
  initialView,
  appointments,
  services,
  staff,
  spaces,
  clients: initialClients,
  permissions,
}: CalendarClientProps) {
  const router = useRouter()
  const [clientList, setClientList] =
    React.useState<CalendarClientOption[]>(initialClients)

  React.useEffect(() => {
    setClientList(initialClients)
  }, [initialClients])

  const [activeTab, setActiveTab] = React.useState<
    "daily" | "monthly" | "table" | "logs"
  >(initialView)
  const [filtersOpen, setFiltersOpen] = React.useState(true)

  const [inlineWizardOpen, setInlineWizardOpen] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [wizardStep, setWizardStep] = React.useState<1 | 2 | 3>(1)

  const [dialogMode, setDialogMode] = React.useState<
    "create" | "edit" | "reschedule" | "replace_client"
  >("create")
  const [editingAppt, setEditingAppt] = React.useState<AppointmentRecord | null>(
    null
  )

  const [selectedDate, setSelectedDate] = React.useState(
    normalizePersianDigits(initialJalaliDate)
  )
  const [filterServiceId, setFilterServiceId] = React.useState<string>("ALL")
  const [filterSubServiceId, setFilterSubServiceId] =
    React.useState<string>("ALL")
  const [filterTherapistId, setFilterTherapistId] =
    React.useState<string>("ALL")
  const [filterStatus, setFilterStatus] = React.useState<string>("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")

  const [bookingSource, setBookingSource] =
    React.useState<AppointmentBookingSource>(AppointmentBookingSource.MANUAL)
  const [formClientId, setFormClientId] = React.useState<string>("")
  const [quickCreateRowOpen, setQuickCreateRowOpen] = React.useState(false)

  const [formServiceId, setFormServiceId] = React.useState<string>(
    services[0]?.id || ""
  )
  const [formSubServiceId, setFormSubServiceId] = React.useState<string>("NONE")
  const [formTherapistId, setFormTherapistId] = React.useState<string>("NONE")
  const [formSpaceId, setFormSpaceId] = React.useState<string>("NONE")

  const [formDate, setFormDate] = React.useState<string>(
    normalizePersianDigits(initialJalaliDate)
  )
  const [formStartTime, setFormStartTime] = React.useState<string>(() =>
    getCurrentSystemTimeHHmm()
  )
  const [typedTimeText, setTypedTimeText] = React.useState<string>(() =>
    toFa(getCurrentSystemTimeHHmm())
  )
  const [timePickerOpen, setTimePickerOpen] = React.useState(false)

  React.useEffect(() => {
    setTypedTimeText(toFa(formStartTime))
  }, [formStartTime])

  const [formStatus, setFormStatus] = React.useState<AppointmentStatus>(
    AppointmentStatus.CONFIRMED
  )
  const [formNotes, setFormNotes] = React.useState<string>("")

  const [errorReasons, setErrorReasons] = React.useState<string[]>([])
  const [canOverride, setCanOverride] = React.useState(false)
  const [allowOverride, setAllowOverride] = React.useState(false)
  const [overrideReason, setOverrideReason] = React.useState("")

  const [autoSlots, setAutoSlots] = React.useState<AvailableSlotSuggestion[]>([])
  const [autoSummaryReason, setAutoSummaryReason] = React.useState<string | null>(
    null
  )
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const activeFilterService = React.useMemo(
    () => services.find((s) => s.id === filterServiceId) || null,
    [services, filterServiceId]
  )

  const formSelectedService = React.useMemo(
    () => services.find((s) => s.id === formServiceId) || null,
    [services, formServiceId]
  )

  const eligibleStaff = React.useMemo(() => {
    if (!formServiceId) return staff
    return staff.filter(
      (st) =>
        Boolean(st.hasAllServicesAccess) ||
        (st.assignedServiceIds || []).includes(formServiceId)
    )
  }, [staff, formServiceId])

  const eligibleSpaces = React.useMemo(() => {
    if (!formServiceId) return spaces
    return spaces.filter(
      (sp) =>
        !sp.allowedServiceIds ||
        sp.allowedServiceIds.length === 0 ||
        sp.allowedServiceIds.includes(formServiceId)
    )
  }, [spaces, formServiceId])

  React.useEffect(() => {
    if (
      formTherapistId !== "NONE" &&
      !eligibleStaff.some((s) => s.id === formTherapistId)
    ) {
      setFormTherapistId(eligibleStaff[0]?.id || "NONE")
    }
  }, [eligibleStaff, formTherapistId])

  React.useEffect(() => {
    if (
      formSpaceId !== "NONE" &&
      !eligibleSpaces.some((sp) => sp.id === formSpaceId)
    ) {
      setFormSpaceId(eligibleSpaces[0]?.id || "NONE")
    }
  }, [eligibleSpaces, formSpaceId])

  const handleDateChange = (nextJalaliDate: string) => {
    const norm = normalizePersianDigits(nextJalaliDate).trim()
    setSelectedDate(norm)
    const encoded = encodeURIComponent(norm)
    router.push(`/clinic-dashboard/calendar?date=${encoded}&view=${activeTab}`)
    router.refresh()
  }

  const handleResetFilters = () => {
    setFilterServiceId("ALL")
    setFilterSubServiceId("ALL")
    setFilterTherapistId("ALL")
    setFilterStatus("ALL")
    setSearchQuery("")
  }

  const filteredAppointments = React.useMemo(() => {
    const q = normalizePersianDigits(searchQuery).trim().toLowerCase()
    return appointments.filter((appt) => {
      if (filterServiceId !== "ALL" && appt.serviceId !== filterServiceId) {
        return false
      }
      if (
        filterSubServiceId !== "ALL" &&
        appt.subServiceId !== filterSubServiceId
      ) {
        return false
      }
      if (
        filterTherapistId !== "ALL" &&
        appt.therapistId !== filterTherapistId
      ) {
        return false
      }
      if (filterStatus !== "ALL" && appt.status !== filterStatus) {
        return false
      }
      if (q) {
        const fileNumText =
          appt.fileNumber !== null && appt.fileNumber !== undefined
            ? String(appt.fileNumber)
            : ""
        const hay = `${normalizePersianDigits(
          appt.clientName
        )} ${normalizePersianDigits(appt.clientPhone)} ${normalizePersianDigits(
          fileNumText
        )} ${appt.serviceTitle}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [
    appointments,
    filterServiceId,
    filterSubServiceId,
    filterTherapistId,
    filterStatus,
    searchQuery,
  ])

  const dailyAppointments = React.useMemo(() => {
    const normSel = normalizePersianDigits(selectedDate).trim()
    return filteredAppointments.filter(
      (a) => normalizePersianDigits(a.jalaliDate).trim() === normSel
    )
  }, [filteredAppointments, selectedDate])

  const prepareCreateForm = (presetDate?: string, presetTime?: string) => {
    const defaultSrv = services[0]
    const defaultStaff = defaultSrv
      ? staff.filter(
          (st) =>
            Boolean(st.hasAllServicesAccess) ||
            (st.assignedServiceIds || []).includes(defaultSrv.id)
        )
      : staff
    const defaultSpaces = defaultSrv
      ? spaces.filter(
          (sp) =>
            !sp.allowedServiceIds ||
            sp.allowedServiceIds.length === 0 ||
            sp.allowedServiceIds.includes(defaultSrv.id)
        )
      : spaces

    const nowTime = presetTime || getCurrentSystemTimeHHmm()
    setDialogMode("create")
    setEditingAppt(null)
    setWizardStep(1)
    setBookingSource(AppointmentBookingSource.MANUAL)
    setFormClientId("")
    setQuickCreateRowOpen(false)
    setFormServiceId(defaultSrv?.id || "")
    setFormSubServiceId(defaultSrv?.subServices[0]?.id || "NONE")
    setFormTherapistId(defaultStaff[0]?.id || "NONE")
    setFormSpaceId(defaultSpaces[0]?.id || "NONE")
    setFormDate(normalizePersianDigits(presetDate || selectedDate))
    setFormStartTime(nowTime)
    setTypedTimeText(toFa(nowTime))
    setFormStatus(AppointmentStatus.CONFIRMED)
    setFormNotes("")
    setErrorReasons([])
    setCanOverride(false)
    setAllowOverride(false)
    setOverrideReason("")
    setAutoSlots([])
    setAutoSummaryReason(null)
  }

  const openModalWizard = (presetDate?: string, presetTime?: string) => {
    if (!permissions.canCreate) {
      toast.error("شما مجوز ثبت نوبت جدید را ندارید.")
      return
    }
    prepareCreateForm(presetDate, presetTime)
    setDialogOpen(true)
  }

  const openInlineWizard = (presetDate?: string, presetTime?: string) => {
    if (!permissions.canCreate) {
      toast.error("شما مجوز ثبت نوبت جدید را ندارید.")
      return
    }
    prepareCreateForm(presetDate, presetTime)
    setInlineWizardOpen(true)
  }

  const openActionDialog = (
    appt: AppointmentRecord,
    mode: "edit" | "reschedule" | "replace_client"
  ) => {
    if (!permissions.canEdit) {
      toast.error("شما مجوز ویرایش نوبت را ندارید.")
      return
    }
    setDialogMode(mode)
    setEditingAppt(appt)
    setWizardStep(mode === "reschedule" ? 3 : 1)
    setBookingSource(AppointmentBookingSource.MANUAL)
    setFormClientId(appt.clientId)
    setQuickCreateRowOpen(false)
    setFormServiceId(appt.serviceId)
    setFormSubServiceId(appt.subServiceId || "NONE")
    setFormTherapistId(appt.therapistId || "NONE")
    setFormSpaceId(appt.spaceId || "NONE")
    setFormDate(normalizePersianDigits(appt.jalaliDate))
    setFormStartTime(appt.startTime)
    setTypedTimeText(toFa(appt.startTime))
    setFormStatus(appt.status)
    setFormNotes(appt.notes || "")
    setErrorReasons([])
    setCanOverride(false)
    setAllowOverride(false)
    setOverrideReason(appt.overrideReason || "")
    setAutoSlots([])
    setAutoSummaryReason(null)
    setDialogOpen(true)
  }

  const handleLoadAutoSlots = async () => {
    if (!formServiceId) {
      toast.error("ابتدا خدمت را در مرحله دوم انتخاب کنید.")
      return
    }
    setIsLoadingSlots(true)
    setAutoSlots([])
    setAutoSummaryReason(null)
    try {
      const res = await getAvailableAppointmentSlotsAction({
        serviceId: formServiceId,
        subServiceId: formSubServiceId === "NONE" ? null : formSubServiceId,
        therapistId: formTherapistId === "NONE" ? null : formTherapistId,
        spaceId: formSpaceId === "NONE" ? null : formSpaceId,
        dateInput: formDate,
        stepMinutes: 15,
        includeConditionalOnCall: true,
      })

      if (!res.success) {
        toast.error(res.error || "خطا در یافتن زمان‌های آزاد.")
        return
      }

      setAutoSlots(res.slots)
      setAutoSummaryReason(res.summaryReason)
      if (res.slots.length === 0) {
        toast.error(
          res.summaryReason ||
            "در تاریخ انتخاب‌شده بازه آزاد و معتبری یافت نشد."
        )
      } else {
        setFormStartTime(res.slots[0].startTime)
        toast.success(`${toFa(res.slots.length)} بازه آزاد و معتبر پیدا شد.`)
      }
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorReasons([])

    if (!formClientId) {
      toast.error("لطفاً مراجع را انتخاب کنید یا پرونده جدید ثبت نمایید.")
      setWizardStep(1)
      return
    }
    if (!formServiceId) {
      toast.error("لطفاً سرویس را انتخاب کنید.")
      setWizardStep(2)
      return
    }

    const finalTime = normalizeTypedHHmm(typedTimeText, formStartTime)
    setFormStartTime(finalTime)

    setIsSubmitting(true)
    try {
      const res = await upsertAppointmentAction({
        id:
          dialogMode === "edit" ||
          dialogMode === "reschedule" ||
          dialogMode === "replace_client"
            ? editingAppt?.id
            : undefined,
        clientId: formClientId,
        serviceId: formServiceId,
        subServiceId: formSubServiceId === "NONE" ? null : formSubServiceId,
        therapistId: formTherapistId === "NONE" ? null : formTherapistId,
        spaceId: formSpaceId === "NONE" ? null : formSpaceId,
        dateInput: normalizePersianDigits(formDate),
        startTime: finalTime,
        bookingSource,
        status: formStatus,
        allowManualOverride:
          bookingSource === AppointmentBookingSource.MANUAL && allowOverride,
        overrideReason: allowOverride ? overrideReason : undefined,
        notes: formNotes,
      })

      if (!res.success) {
        const reasons =
          res.reasons && res.reasons.length > 0
            ? res.reasons
            : [res.error || "امکان ثبت نوبت وجود ندارد."]
        setErrorReasons(reasons)
        setCanOverride(Boolean(res.canOverrideManually))
        toast.error(reasons[0])
        return
      }

      toast.success(
        dialogMode === "create"
          ? bookingSource === AppointmentBookingSource.AUTO
            ? "نوبت اتوماتیک با موفقیت ثبت شد."
            : "نوبت دستی با موفقیت ثبت شد."
          : "تغییرات نوبت با موفقیت ذخیره شد."
      )
      setDialogOpen(false)
      setInlineWizardOpen(false)
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (
    apptId: string,
    nextStatus: AppointmentStatus
  ) => {
    const res = await updateAppointmentStatusAction({
      appointmentId: apptId,
      status: nextStatus,
      cancellationReason:
        nextStatus === AppointmentStatus.CANCELED
          ? "انتقال به لیست رزرو / لغو توسط پذیرش"
          : undefined,
    })
    if (!res.success) {
      toast.error(res.error || "خطا در تغییر وضعیت نوبت")
      return
    }
    toast.success("وضعیت نوبت به‌روزرسانی شد.")
    router.refresh()
  }

  const handleDeleteAppt = async (apptId: string) => {
    if (!permissions.canDelete) {
      toast.error("شما مجوز حذف نوبت را ندارید.")
      return
    }
    const res = await deleteAppointmentAction(apptId)
    if (!res.success) {
      toast.error(res.error || "خطا در حذف نوبت")
      return
    }
    toast.success("نوبت حذف شد.")
    router.refresh()
  }

  const parsedSel = parseJalaliParts(selectedDate)
  const monthDaysCount = getMonthDaysCount(parsedSel.jy, parsedSel.jm)
  const firstGregorian = toGregorian(parsedSel.jy, parsedSel.jm, 1)
  const firstWeekday = (firstGregorian.getDay() + 1) % 7

  const monthlyCells = React.useMemo(() => {
    const arr: Array<{
      day: number | null
      jalaliStr: string | null
      isFriday: boolean
      holidayTitle: string | null
      items: AppointmentRecord[]
    }> = []

    for (let i = 0; i < firstWeekday; i++) {
      arr.push({
        day: null,
        jalaliStr: null,
        isFriday: false,
        holidayTitle: null,
        items: [],
      })
    }

    for (let d = 1; d <= monthDaysCount; d++) {
      const jStr = `${parsedSel.jy}/${String(parsedSel.jm).padStart(
        2,
        "0"
      )}/${String(d).padStart(2, "0")}`
      const g = toGregorian(parsedSel.jy, parsedSel.jm, d)
      const weekday = (g.getDay() + 1) % 7
      const holidayTitle = resolveHolidayTitle(g)
      const dayItems = filteredAppointments.filter(
        (a) => normalizePersianDigits(a.jalaliDate).trim() === jStr
      )
      arr.push({
        day: d,
        jalaliStr: jStr,
        isFriday: weekday === 6,
        holidayTitle,
        items: dayItems,
      })
    }

    return arr
  }, [
    firstWeekday,
    monthDaysCount,
    parsedSel.jy,
    parsedSel.jm,
    filteredAppointments,
  ])

  const selectedFormDateObj = React.useMemo(
    () => jalaliStringToDate(formDate),
    [formDate]
  )

  const selectedTimePickerValue = React.useMemo(
    () => parseHHmmToPickerValue(formStartTime),
    [formStartTime]
  )

  const renderWizardBody = () => (
    <form onSubmit={handleSubmitAppointment} className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/30 p-2 text-xs">
        <button
          type="button"
          onClick={() => setWizardStep(1)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition-colors",
            wizardStep === 1
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>۱. انتخاب مراجع</span>
        </button>

        <button
          type="button"
          onClick={() => setWizardStep(2)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition-colors",
            wizardStep === 2
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>۲. خدمت و پرسنل/اتاق</span>
        </button>

        <button
          type="button"
          onClick={() => setWizardStep(3)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition-colors",
            wizardStep === 3
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>۳. زمان نوبت</span>
        </button>
      </div>

      {wizardStep === 1 && (
        <div className="space-y-4 rounded-xl border p-4">
          <FieldGroup>
            <Field>
              <FieldLabel>مراجعه‌کننده *</FieldLabel>
              <ClientCombobox
                clients={clientList}
                value={formClientId}
                disabled={dialogMode === "reschedule"}
                quickCreateOpen={quickCreateRowOpen}
                onQuickCreateOpenChange={setQuickCreateRowOpen}
                onChange={(id) => setFormClientId(id)}
                onClientCreated={(created) =>
                  setClientList((prev) => [created, ...prev])
                }
              />
            </Field>
          </FieldGroup>

          <div className="flex justify-end border-t pt-3">
            <Button
              type="button"
              onClick={() => {
                if (!formClientId) {
                  toast.error("لطفاً ابتدا مراجع را انتخاب یا ثبت کنید.")
                  return
                }
                setWizardStep(2)
              }}
            >
              مرحله بعد (انتخاب خدمت)
              <ChevronLeft className="mr-1.5 size-4" />
            </Button>
          </div>
        </div>
      )}

      {wizardStep === 2 && (
        <div className="space-y-4 rounded-xl border p-4">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>خدمت *</FieldLabel>
                <Select
                  value={formServiceId}
                  onValueChange={(v) => {
                    if (!v) return
                    setFormServiceId(v)
                    const found = services.find((s) => s.id === v)
                    setFormSubServiceId(found?.subServices[0]?.id || "NONE")
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue>
                      {formSelectedService?.title || "انتخاب خدمت"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>ریز خدمت (اختیاری)</FieldLabel>
                <Select
                  value={formSubServiceId}
                  onValueChange={(v) => setFormSubServiceId(v || "NONE")}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue>
                      {formSubServiceId === "NONE"
                        ? "بدون زیرسرویس خاص"
                        : formSelectedService?.subServices.find(
                            (sub) => sub.id === formSubServiceId
                          )?.title || "بدون زیرسرویس خاص"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">بدون زیرسرویس خاص</SelectItem>
                    {(formSelectedService?.subServices || []).map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>
                  درمانگر مجاز این خدمت ({toFa(eligibleStaff.length)} نفر)
                </FieldLabel>
                <Select
                  value={formTherapistId}
                  onValueChange={(v) => setFormTherapistId(v || "NONE")}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue>
                      {formTherapistId === "NONE"
                        ? "بدون تعیین درمانگر خاص"
                        : eligibleStaff.find((st) => st.id === formTherapistId)
                            ?.fullName || "انتخاب درمانگر"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">بدون تعیین درمانگر خاص</SelectItem>
                    {eligibleStaff.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.fullName} ({st.jobTitle})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>
                  اتاق / مکان مجاز این خدمت ({toFa(eligibleSpaces.length)} مورد)
                </FieldLabel>
                <Select
                  value={formSpaceId}
                  onValueChange={(v) => setFormSpaceId(v || "NONE")}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue>
                      {formSpaceId === "NONE"
                        ? "بدون تعیین اتاق خاص"
                        : eligibleSpaces.find((sp) => sp.id === formSpaceId)
                            ?.name || "انتخاب اتاق"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">بدون تعیین اتاق خاص</SelectItem>
                    {eligibleSpaces.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>

          <div className="flex items-center justify-between border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWizardStep(1)}
            >
              <ChevronRight className="ml-1.5 size-4" />
              مرحله قبل
            </Button>
            <Button type="button" onClick={() => setWizardStep(3)}>
              مرحله بعد (زمان نوبت)
              <ChevronLeft className="mr-1.5 size-4" />
            </Button>
          </div>
        </div>
      )}

      {wizardStep === 3 && (
        <div className="space-y-4 rounded-xl border p-4">
          {dialogMode === "create" && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setBookingSource(AppointmentBookingSource.MANUAL)
                  setErrorReasons([])
                  setAutoSummaryReason(null)
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors",
                  bookingSource === AppointmentBookingSource.MANUAL
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserCheck className="size-4" />
                رزرو دستی
              </button>
              <button
                type="button"
                onClick={() => {
                  setBookingSource(AppointmentBookingSource.AUTO)
                  setAllowOverride(false)
                  setErrorReasons([])
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors",
                  bookingSource === AppointmentBookingSource.AUTO
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="size-4" />
                رزرو اتوماتیک
              </button>
            </div>
          )}

          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>تاریخ شمسی *</FieldLabel>
                <DatePicker
                  calendarType="shamsi"
                  value={selectedFormDateObj}
                  onValueChange={(d) => {
                    if (d) {
                      setFormDate(normalizePersianDigits(dateToJalaliString(d)))
                    }
                  }}
                  className="w-full"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="appt-keyboard-time">
                  ساعت شروع نوبت (تایپ با کیبورد یا انتخابگر ساعت) *
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id="appt-keyboard-time"
                    dir="ltr"
                    value={typedTimeText}
                    onChange={(e) => setTypedTimeText(e.target.value)}
                    onBlur={(e) => {
                      const norm = normalizeTypedHHmm(
                        e.target.value,
                        formStartTime
                      )
                      setFormStartTime(norm)
                      setTypedTimeText(toFa(norm))
                    }}
                    placeholder="۱۶:۳۰"
                    className="h-9 flex-1 font-mono tabular-nums"
                  />

                  <ResponsiveTimePicker
                    open={timePickerOpen}
                    onOpenChange={setTimePickerOpen}
                  >
                    <ResponsiveTimePickerTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-9 shrink-0"
                          title="انتخاب ساعت با چرخ‌دنده"
                        >
                          <Clock className="size-4" />
                        </Button>
                      }
                    />
                    <ResponsiveTimePickerContent
                      value={selectedTimePickerValue}
                      onValueChange={(tv) => {
                        const next = `${String(tv.hour).padStart(
                          2,
                          "0"
                        )}:${String(tv.minute).padStart(2, "0")}`
                        setFormStartTime(next)
                        setTypedTimeText(toFa(next))
                      }}
                      hourFormat="24"
                      digits="fa"
                      drawerTitle="انتخاب ساعت شروع نوبت"
                      drawerConfirmLabel="تایید ساعت"
                      onDrawerConfirm={() => setTimePickerOpen(false)}
                    />
                  </ResponsiveTimePicker>
                </div>
              </Field>
            </div>

            {bookingSource === AppointmentBookingSource.AUTO && (
              <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-primary">
                    پیشنهاد خودکار زمان‌های آزاد و معتبر روز
                  </span>
                  <Button
                    type="button"
                    size="xs"
                    disabled={isLoadingSlots}
                    onClick={() => void handleLoadAutoSlots()}
                  >
                    <Clock className="ml-1 size-3.5" />
                    {isLoadingSlots ? "در حال بررسی..." : "یافتن زمان آزاد"}
                  </Button>
                </div>

                {autoSlots.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {autoSlots.map((sl) => {
                      const active = formStartTime === sl.startTime
                      return (
                        <button
                          key={`${sl.startTime}-${sl.spaceId || "any"}`}
                          type="button"
                          onClick={() => setFormStartTime(sl.startTime)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors",
                            active
                              ? "border-primary bg-primary font-bold text-primary-foreground"
                              : "bg-background hover:bg-muted"
                          )}
                        >
                          {toFa(sl.startTime)} - {toFa(sl.blockEndTime)}
                          {sl.isConditionalOnCall ? " (آنکال)" : ""}
                        </button>
                      )
                    })}
                  </div>
                )}

                {autoSummaryReason && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{autoSummaryReason}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>وضعیت نوبت</FieldLabel>
                <Select
                  value={formStatus}
                  onValueChange={(v) =>
                    v && setFormStatus(v as AppointmentStatus)
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue>
                      {STATUS_CONFIG[formStatus]?.label || "قطعی شده"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map(
                      (st) => (
                        <SelectItem key={st} value={st}>
                          {STATUS_CONFIG[st].label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="appt-notes-field">
                  توضیحات نوبت (اختیاری)
                </FieldLabel>
                <Input
                  id="appt-notes-field"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="یادداشت پذیرش یا آماده‌سازی..."
                />
              </Field>
            </div>

            {errorReasons.length > 0 && (
              <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive">
                <div className="font-bold">علت محدودیت یا تداخل:</div>
                <ul className="space-y-1">
                  {errorReasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>

                {canOverride &&
                  bookingSource === AppointmentBookingSource.MANUAL && (
                    <div className="mt-2 space-y-2 border-t border-destructive/20 pt-2.5 text-foreground">
                      <label className="flex cursor-pointer items-center gap-2 font-semibold">
                        <Checkbox
                          checked={allowOverride}
                          onCheckedChange={(v) => setAllowOverride(Boolean(v))}
                        />
                        <span>قبول شرایط / ثبت دستی با هماهنگی ویژه</span>
                      </label>
                      {allowOverride && (
                        <div>
                          <label
                            htmlFor="override-reason-input"
                            className="block text-[11px] font-medium text-muted-foreground"
                          >
                            توضیحات هماهنگی (اختیاری)
                          </label>
                          <Textarea
                            id="override-reason-input"
                            rows={2}
                            className="mt-1 bg-background text-xs"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="در صورت تمایل توضیح مختصری بنویسید..."
                          />
                        </div>
                      )}
                    </div>
                  )}
              </div>
            )}
          </FieldGroup>

          <div className="flex items-center justify-between border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWizardStep(2)}
            >
              <ChevronRight className="ml-1.5 size-4" />
              مرحله قبل
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              <CheckCircle2 className="ml-1.5 size-4" />
              {isSubmitting ? "در حال ثبت..." : "ثبت نهایی نوبت"}
            </Button>
          </div>
        </div>
      )}
    </form>
  )

  return (
    <div className="space-y-4 p-4 md:p-0" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {activeTab === "daily" && "روزانه"}
            {activeTab === "monthly" && "ماهانه"}
            {activeTab === "table" && "جدولی"}
            {activeTab === "logs" && "گزارش رخدادها"}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            مدیریت نوبت‌دهی دستی و اتوماتیک ({clinicName})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              openInlineWizard(selectedDate, getCurrentSystemTimeHHmm())
            }
          >
            <LayoutPanelTop className="ml-1.5 size-4 text-primary" />
            ویزارد در صفحه
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              openModalWizard(selectedDate, getCurrentSystemTimeHHmm())
            }
          >
            <Plus className="ml-1.5 size-4" />
            رزرو نوبت دستی
          </Button>
        </div>
      </div>

      {/* پنل فیلترها */}
      <Card>
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <span className="text-sm font-bold">فیلترها</span>
            <Badge variant="secondary" className="text-[11px]">
              فعال
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleResetFilters}
            >
              <X className="ml-1 size-3.5" />
              پاک کردن
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? "بستن" : "باز کردن"}
              {filtersOpen ? (
                <ChevronUp className="mr-1 size-3.5" />
              ) : (
                <ChevronDown className="mr-1 size-3.5" />
              )}
            </Button>
          </div>
        </div>

        {filtersOpen && (
          <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field>
              <FieldLabel>تاریخ (شمسی)</FieldLabel>
              <DatePicker
                calendarType="shamsi"
                value={jalaliStringToDate(selectedDate)}
                onValueChange={(d) => {
                  if (d) handleDateChange(dateToJalaliString(d))
                }}
                className="w-full"
              />
            </Field>

            <Field>
              <FieldLabel>خدمات</FieldLabel>
              <Select
                value={filterServiceId}
                onValueChange={(v) => {
                  setFilterServiceId(v || "ALL")
                  setFilterSubServiceId("ALL")
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue>
                    {filterServiceId === "ALL"
                      ? "انتخاب خدمات"
                      : activeFilterService?.title || "انتخاب خدمات"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه خدمات</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>ریز خدمات‌ها</FieldLabel>
              <Select
                value={filterSubServiceId}
                disabled={filterServiceId === "ALL"}
                onValueChange={(v) => setFilterSubServiceId(v || "ALL")}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue>
                    {filterServiceId === "ALL"
                      ? "ابتدا خدمات را انتخاب کنید"
                      : filterSubServiceId === "ALL"
                      ? "همه ریز خدمات‌ها"
                      : activeFilterService?.subServices.find(
                          (sub) => sub.id === filterSubServiceId
                        )?.title || "انتخاب زیرسرویس"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه ریز خدمات‌ها</SelectItem>
                  {(activeFilterService?.subServices || []).map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>درمانگر</FieldLabel>
              <Select
                value={filterTherapistId}
                onValueChange={(v) => setFilterTherapistId(v || "ALL")}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue>
                    {filterTherapistId === "ALL"
                      ? "انتخاب پرسنل‌ها"
                      : staff.find((st) => st.id === filterTherapistId)
                          ?.fullName || "انتخاب پرسنل‌ها"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه پرسنل</SelectItem>
                  {staff.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>وضعیت نوبت و جستجو</FieldLabel>
              <div className="flex gap-2">
                <Select
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v || "ALL")}
                >
                  <SelectTrigger className="w-32 bg-background">
                    <SelectValue>
                      {filterStatus === "ALL"
                        ? "وضعیت"
                        : STATUS_CONFIG[filterStatus as AppointmentStatus]
                            ?.label || "وضعیت"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
                    {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map(
                      (st) => (
                        <SelectItem key={st} value={st}>
                          {STATUS_CONFIG[st].label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجوی مراجع..."
                    className="pr-8 text-xs"
                  />
                </div>
              </div>
            </Field>
          </CardContent>
        )}
      </Card>

      {/* نمایش ویزارد در صفحه زیر فیلترها */}
      {inlineWizardOpen && (
        <Card className="border-primary/40 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b py-3">
            <CardTitle className="text-sm font-bold">
              ویزارد سه‌مرحله‌ای ثبت نوبت (در صفحه)
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setInlineWizardOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">{renderWizardBody()}</CardContent>
        </Card>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab((v as "daily" | "monthly" | "table" | "logs") || "daily")
        }
        dir="rtl"
        className="space-y-4"
      >
        <TabsList className="grid w-full max-w-2xl grid-cols-4 [&_[data-slot=tabs-indicator]]:hidden">
          <TabsTrigger
            value="daily"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            روزانه
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            ماهانه
          </TabsTrigger>
          <TabsTrigger
            value="table"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            جدولی
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
          >
            گزارش رخدادها
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-2">
          <Card>
            <CardContent className="divide-y p-0">
              {HOURS_LIST.map((hourLabel) => {
                const hourPrefix = hourLabel.slice(0, 2)
                const hourItems = dailyAppointments.filter((a) =>
                  a.startTime.startsWith(hourPrefix)
                )

                return (
                  <div
                    key={hourLabel}
                    className="grid min-h-20 grid-cols-12 items-start gap-2 p-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="col-span-2 sm:col-span-1">
                      <button
                        type="button"
                        onClick={() => openModalWizard(selectedDate, hourLabel)}
                        className="w-full rounded-lg border bg-muted/50 px-2 py-1.5 text-center font-mono text-xs font-semibold hover:border-primary hover:text-primary"
                        title={`ثبت نوبت در ساعت ${toFa(hourLabel)}`}
                      >
                        {toFa(hourLabel)}
                      </button>
                    </div>

                    <div className="col-span-10 flex flex-wrap gap-2.5 sm:col-span-11">
                      {hourItems.map((appt) => {
                        const stCfg = STATUS_CONFIG[appt.status]
                        return (
                          <div
                            key={appt.id}
                            className="w-full max-w-sm rounded-xl border border-primary/30 bg-card p-3 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-bold">
                                  {appt.clientName}
                                  {appt.fileNumber
                                    ? ` - ${toFa(appt.fileNumber)}`
                                    : ""}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span dir="ltr" className="font-mono">
                                    {toFa(appt.startTime)} -{" "}
                                    {toFa(appt.blockEndTime)}
                                  </span>
                                  <span>•</span>
                                  <span>{toFa(appt.clientPhone)}</span>
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                    />
                                  }
                                >
                                  <MoreVertical className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" dir="rtl">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openActionDialog(appt, "reschedule")
                                    }
                                  >
                                    <RefreshCw className="ml-2 size-3.5" />
                                    جابه‌جایی زمان
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openActionDialog(appt, "replace_client")
                                    }
                                  >
                                    <Users className="ml-2 size-3.5" />
                                    جایگزین کردن مراجع‌کننده
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      void handleStatusChange(
                                        appt.id,
                                        AppointmentStatus.CANCELED
                                      )
                                    }
                                  >
                                    <RotateCcw className="ml-2 size-3.5" />
                                    انتقال به لیست رزرو / لغو
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openActionDialog(appt, "edit")
                                    }
                                  >
                                    <Edit3 className="ml-2 size-3.5" />
                                    ویرایش
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => void handleDeleteAppt(appt.id)}
                                  >
                                    <Trash2 className="ml-2 size-3.5" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="mt-2 space-y-1 text-xs">
                              <div className="font-medium">
                                {appt.serviceTitle}
                                {appt.subServiceTitle
                                  ? ` - ${appt.subServiceTitle}`
                                  : ""}
                              </div>
                              <div className="text-muted-foreground">
                                درمانگر: {appt.therapistName}
                                {appt.spaceName
                                  ? ` | مکان: ${appt.spaceName}`
                                  : ""}
                              </div>
                              {appt.timingMode ===
                                ServiceTimingMode.SPLIT_STAGE && (
                                <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                  سرویس چندمرحله‌ای (تایم آزاد میانی:{" "}
                                  {toFa(appt.freeGapMinutes)} دقیقه)
                                </div>
                              )}
                            </div>

                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <Badge variant={stCfg.badgeVariant}>
                                {stCfg.label}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {appt.bookingSource ===
                                AppointmentBookingSource.AUTO
                                  ? "رزرو اتوماتیک"
                                  : "رزرو دستی"}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-bold">
                  {JALALI_MONTH_NAMES[parsedSel.jm - 1]} {toFa(parsedSel.jy)}
                </div>
                <div className="text-xs text-muted-foreground">
                  مجموع نوبت‌های فیلترشده در ماه:{" "}
                  <strong className="text-foreground">
                    {toFa(filteredAppointments.length)}
                  </strong>
                </div>
              </div>

              <div className="mb-2 hidden grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground md:grid">
                {WEEKDAYS.map((w, idx) => (
                  <div
                    key={w}
                    className={cn(
                      "rounded-lg bg-muted/50 py-2",
                      idx === 6 && "text-destructive"
                    )}
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-7">
                {monthlyCells.map((cell, idx) => {
                  if (!cell.day || !cell.jalaliStr) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="hidden min-h-24 rounded-xl border border-dashed bg-muted/10 md:block"
                      />
                    )
                  }

                  const isSelectedDay =
                    normalizePersianDigits(selectedDate).trim() === cell.jalaliStr

                  return (
                    <button
                      key={cell.jalaliStr}
                      type="button"
                      onClick={() => handleDateChange(cell.jalaliStr!)}
                      className={cn(
                        "flex min-h-24 flex-col justify-between rounded-xl border bg-background p-2.5 text-right transition-colors hover:border-primary/50",
                        isSelectedDay && "border-primary ring-1 ring-primary",
                        (cell.isFriday || cell.holidayTitle) &&
                          "border-destructive/30 bg-destructive/5"
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span
                          className={cn(
                            "text-xs font-bold",
                            cell.isFriday || cell.holidayTitle
                              ? "text-destructive"
                              : "text-foreground"
                          )}
                        >
                          {toFa(cell.day)}
                        </span>
                        {cell.items.length > 0 && (
                          <Badge variant="default" className="h-5 text-[10px]">
                            {toFa(cell.items.length)} نوبت
                          </Badge>
                        )}
                      </div>

                      {cell.holidayTitle && (
                        <div className="mt-1 truncate text-[10px] font-medium text-destructive">
                          {cell.holidayTitle}
                        </div>
                      )}

                      <div className="mt-2 space-y-1">
                        {cell.items.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="truncate rounded bg-muted/60 px-1.5 py-0.5 text-[10px]"
                          >
                            {toFa(item.startTime)} — {item.clientName}
                          </div>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              تعداد کل نوبت‌ها:{" "}
              <strong className="text-foreground">
                {toFa(filteredAppointments.length)}
              </strong>
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right">ردیف</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">ساعت</TableHead>
                  <TableHead className="text-right">مراجعه‌کننده</TableHead>
                  <TableHead className="text-right">شماره موبایل</TableHead>
                  <TableHead className="text-right">خدمات</TableHead>
                  <TableHead className="text-right">ریز خدمات</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">درمانگر</TableHead>
                  <TableHead className="text-right">روش ثبت</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      نوبتی با این فیلترها یافت نشد.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appt, index) => {
                    const stCfg = STATUS_CONFIG[appt.status]
                    return (
                      <TableRow key={appt.id}>
                        <TableCell>{toFa(index + 1)}</TableCell>
                        <TableCell dir="ltr" className="text-right font-mono">
                          {toFa(appt.jalaliDate)}
                        </TableCell>
                        <TableCell dir="ltr" className="text-right font-mono">
                          {toFa(appt.startTime)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {appt.clientName}
                          {appt.fileNumber
                            ? ` - ${toFa(appt.fileNumber)}`
                            : ""}
                        </TableCell>
                        <TableCell dir="ltr" className="text-right font-mono">
                          {toFa(appt.clientPhone)}
                        </TableCell>
                        <TableCell>{appt.serviceTitle}</TableCell>
                        <TableCell>
                          {appt.subServiceTitle || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={stCfg.badgeVariant}>
                            {stCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{appt.therapistName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">
                            {appt.bookingSource ===
                            AppointmentBookingSource.AUTO
                              ? "اتوماتیک"
                              : "دستی"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                />
                              }
                            >
                              <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" dir="rtl">
                              <DropdownMenuItem
                                onClick={() =>
                                  openActionDialog(appt, "reschedule")
                                }
                              >
                                <RefreshCw className="ml-2 size-3.5" />
                                جابه‌جایی زمان
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  openActionDialog(appt, "replace_client")
                                }
                              >
                                <Users className="ml-2 size-3.5" />
                                جایگزین کردن مراجع‌کننده
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleStatusChange(
                                    appt.id,
                                    AppointmentStatus.CANCELED
                                  )
                                }
                              >
                                <RotateCcw className="ml-2 size-3.5" />
                                انتقال به لیست رزرو / لغو
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openActionDialog(appt, "edit")}
                              >
                                <Edit3 className="ml-2 size-3.5" />
                                ویرایش
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => void handleDeleteAppt(appt.id)}
                              >
                                <Trash2 className="ml-2 size-3.5" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-3">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">ساعت نوبت</TableHead>
                  <TableHead className="text-right">ثبت‌کننده</TableHead>
                  <TableHead className="text-right">نوع ثبت</TableHead>
                  <TableHead className="text-right">توضیحات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      رخدادی ثبت نشده است.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appt) => (
                    <TableRow key={`log-${appt.id}`}>
                      <TableCell dir="ltr" className="text-right font-mono">
                        {toFa(appt.jalaliDate)}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right font-mono">
                        {toFa(appt.startTime)} - {toFa(appt.blockEndTime)}
                      </TableCell>
                      <TableCell>{appt.createdByName}</TableCell>
                      <TableCell>
                        {appt.bookingSource === AppointmentBookingSource.AUTO
                          ? "نوبت اتوماتیک"
                          : "نوبت دستی"}
                      </TableCell>
                      <TableCell>
                        نوبت برای <strong>{appt.clientName}</strong> در بخش{" "}
                        <strong>{appt.serviceTitle}</strong>
                        {appt.subServiceTitle
                          ? ` (${appt.subServiceTitle})`
                          : ""}{" "}
                        با درمانگر <strong>{appt.therapistName}</strong>.
                        {appt.isManualOverride && appt.overrideReason
                          ? ` [هماهنگی ویژه: ${appt.overrideReason}]`
                          : ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ویزارد هم به‌صورت مودال برای ثبت سریع یا ویرایش/جابه‌جایی/جایگزینی مراجع */}
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
        <ResponsiveDialogContent className="sm:max-w-2xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {dialogMode === "create" && "رزرو نوبت (ویزارد سه‌مرحله‌ای)"}
              {dialogMode === "edit" && "ویرایش نوبت"}
              {dialogMode === "reschedule" && "جابه‌جایی زمان نوبت"}
              {dialogMode === "replace_client" && "جایگزین کردن مراجع‌کننده"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              مراحل انتخاب مراجع، خدمت/پرسنل/اتاق و تعیین زمان نوبت را گام‌به‌گام تکمیل کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogPanel className="no-scrollbar max-h-[72vh] overflow-y-auto pt-2">
            <div className="px-5">{renderWizardBody()}</div>
          </ResponsiveDialogPanel>

          <ResponsiveDialogFooter className="gap-2">
            <ResponsiveDialogDesktopOnly>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setDialogOpen(false)}
              >
                بستن
              </Button>
            </ResponsiveDialogDesktopOnly>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
