// components/clinic-dashboard/clients-list-client.tsx
"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Phone,
  FolderOpen,
  FileText,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  CreditCard,
  Wallet,
  Tag,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
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
} from "@/components/ui/responsive-dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { isValidNationalId } from "@/lib/national-id"
import { normalizeIranPhone, isValidIranPhone } from "@/lib/iranian-mobile"

import { DatePicker } from "@/components/ui/date-picker"
import { TablePaginationBar } from "@/components/clinic-dashboard/table-pagination-bar"
import { ExportDataMenu } from "@/components/clinic-dashboard/export-data-menu"
import {
  createClientAction,
  updateClientMetaAction,
  quickUpdateClientAction,
  deleteClientAction,
} from "@/app/clinic-dashboard/(dashboard)/clients/actions"

export interface ClientListItem {
  id: string
  fileNumber: number | null
  fullName: string
  phone: string | null
  nationalId: string | null
  gender: string | null
  tag: string | null
  walletBalance: number
  servicesCount: number
  invoicesCount: number
  walletTransactionsCount: number
  isComplete: boolean
  createdAt: string
}

interface ClientsListClientProps {
  clients: ClientListItem[]
  totalCount: number
  page: number
  pageSize: number
  initialQuery: string
  initialStatus: "ALL" | "INCOMPLETE" | "COMPLETE"
  initialSort: string
  nextSuggestedFileNumber: number
  staffReferrers: { id: string; label: string }[]
  clientReferrers: { id: string; label: string }[]
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
}

const SORT_OPTIONS = [
  { value: "fileNumber_desc", label: "شماره پرونده - نزولی" },
  { value: "fileNumber_asc", label: "شماره پرونده - صعودی" },
  { value: "newest", label: "جدیدترین ثبت" },
  { value: "oldest", label: "قدیمی‌ترین ثبت" },
]

const GENDER_OPTIONS = [
  { value: "FEMALE", label: "خانم" },
  { value: "MALE", label: "آقا" },
]

const REFERRAL_SOURCES = [
  { value: "NONE", label: "انتخاب کنید" },
  { value: "INSTAGRAM", label: "اینستاگرام" },
  { value: "GOOGLE", label: "جستجوی گوگل / وب‌سایت" },
  { value: "FRIEND", label: "معرفی دوستان و آشنایان" },
  { value: "PASSERBY", label: "تابلو و مراجعه حضوری" },
  { value: "SMS", label: "پیامک تبلیغاتی" },
  { value: "OTHER", label: "سایر موارد" },
]

const CLIENT_TAGS = [
  { value: "NONE", label: "بدون برچسب" },
  { value: "VIP", label: "VIP / ویژه" },
  { value: "REGULAR", label: "مراجع ثابت" },
  { value: "SENSITIVE", label: "نیازمند پیگیری خاص" },
  { value: "NEW", label: "مراجع جدید" },
]

export function ClientsListClient({
  clients,
  totalCount,
  page,
  pageSize,
  initialQuery,
  initialStatus,
  initialSort,
  nextSuggestedFileNumber,
  staffReferrers,
  clientReferrers,
  canCreate,
  canEdit,
  canDelete,
  canExport,
}: ClientsListClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [viewMode, setViewMode] = useState<"card" | "table">("card")
  const [searchInput, setSearchInput] = useState(initialQuery)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // استیت‌های فرم ایجاد پرونده جدید
  const [fullName, setFullName] = useState("")
  const [fileNumber, setFileNumber] = useState(String(nextSuggestedFileNumber))
  const [gender, setGender] = useState<"FEMALE" | "MALE">("FEMALE")
  const [phone, setPhone] = useState("")
  const [noPhone, setNoPhone] = useState(false)
  const [birthDate, setBirthDate] = useState<Date | null>(null)
  const [nationalId, setNationalId] = useState("")
  const [noNationalId, setNoNationalId] = useState(false)
  const [referralSource, setReferralSource] = useState("NONE")
  const [referrerType, setReferrerType] = useState<"CLIENT" | "STAFF">("CLIENT")
  const [referrerId, setReferrerId] = useState("NONE")
  const [notes, setNotes] = useState("")

  // استیت‌های مودال ویرایش سریع پرونده
  const [editingClient, setEditingClient] = useState<ClientListItem | null>(
    null
  )
  const [editFullName, setEditFullName] = useState("")
  const [editFileNumber, setEditFileNumber] = useState("")
  const [editGender, setEditGender] = useState<"FEMALE" | "MALE">("FEMALE")
  const [editPhone, setEditPhone] = useState("")
  const [editNoPhone, setEditNoPhone] = useState(false)
  const [editNationalId, setEditNationalId] = useState("")

  // استیت مودال اخطار حذف پرونده
  const [deletingClient, setDeletingClient] = useState<ClientListItem | null>(
    null
  )

  function updateQueryParams(
    updates: Record<string, string | null>,
    resetPage = true
  ) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === "ALL") {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })
    if (resetPage) {
      params.set("page", "1")
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function handlePageChange(nextPage: number) {
    updateQueryParams({ page: String(nextPage) }, false)
  }

  function handlePageSizeChange(nextPageSize: number) {
    updateQueryParams({ pageSize: String(nextPageSize), page: "1" }, false)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateQueryParams({ q: searchInput.trim() || null })
  }

  function resetCreateForm() {
    setFullName("")
    setFileNumber(String(nextSuggestedFileNumber))
    setGender("FEMALE")
    setPhone("")
    setNoPhone(false)
    setBirthDate(null)
    setNationalId("")
    setNoNationalId(false)
    setReferralSource("NONE")
    setReferrerType("CLIENT")
    setReferrerId("NONE")
    setNotes("")
  }

  function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await createClientAction({
        fullName,
        fileNumber: fileNumber ? Number(fileNumber) : null,
        gender,
        phone,
        noPhone,
        birthDate: birthDate ? birthDate.toISOString() : null,
        nationalId,
        noNationalId,
        referralSource: referralSource === "NONE" ? undefined : referralSource,
        referrerType: referrerId === "NONE" ? "NONE" : referrerType,
        referrerId: referrerId === "NONE" ? null : referrerId,
        notes,
      })

      if (!res.success) {
        toast.error(res.error || "خطا در ثبت پرونده")
        return
      }

      toast.success("پرونده مراجعه‌کننده با موفقیت ایجاد شد.")
      setIsCreateOpen(false)
      resetCreateForm()
      if (res.clientId) {
        router.push(`/clinic-dashboard/clients/${res.clientId}`)
      }
    })
  }

  function openQuickEditModal(client: ClientListItem) {
    setEditingClient(client)
    setEditFullName(client.fullName === "بدون نام" ? "" : client.fullName)
    setEditFileNumber(client.fileNumber ? String(client.fileNumber) : "")
    setEditGender((client.gender as "FEMALE" | "MALE") || "FEMALE")
    setEditPhone(client.phone || "")
    setEditNoPhone(!client.phone)
    setEditNationalId(client.nationalId || "")
  }

  function handleQuickEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingClient) return

    startTransition(async () => {
      const res = await quickUpdateClientAction({
        clientId: editingClient.id,
        fullName: editFullName,
        fileNumber: editFileNumber ? Number(editFileNumber) : null,
        phone: editPhone,
        noPhone: editNoPhone,
        nationalId: editNationalId,
        gender: editGender,
      })

      if (!res.success) {
        toast.error(res.error || "خطا در ویرایش پرونده")
        return
      }

      toast.success("مشخصات پرونده با موفقیت به‌روزرسانی شد.")
      setEditingClient(null)
      router.refresh()
    })
  }

  function handleConfirmDeleteClient() {
    if (!deletingClient) return

    startTransition(async () => {
      const res = await deleteClientAction(deletingClient.id)
      if (!res.success) {
        toast.error(res.error || "خطا در حذف پرونده")
        return
      }

      toast.success(
        "پرونده حذف شد و در صورت وجود سوابق، موجودی کالاهای مصرفی به انبار بازگردانده شد."
      )
      setDeletingClient(null)
      router.refresh()
    })
  }

  function handleTagChange(clientId: string, newTag: string) {
    startTransition(async () => {
      const res = await updateClientMetaAction(clientId, {
        tag: newTag === "NONE" ? null : newTag,
      })
      if (res.success) {
        toast.success("برچسب پرونده به‌روزرسانی شد.")
      } else {
        toast.error(res.error || "خطا در تغییر برچسب")
      }
    })
  }

  const referrerItems: { value: string; label: string }[] = [
    { value: "NONE", label: "انتخاب کنید" },
    ...(referrerType === "CLIENT"
      ? clientReferrers.map((c) => ({ value: c.id, label: c.label }))
      : staffReferrers.map((s) => ({ value: s.id, label: s.label }))),
  ]

  const deletingHasRecords = Boolean(
    deletingClient &&
    (deletingClient.servicesCount > 0 ||
      deletingClient.invoicesCount > 0 ||
      deletingClient.walletTransactionsCount > 0 ||
      deletingClient.walletBalance > 0)
  )

  const isPhoneInvalid =
    !noPhone && phone.trim() !== "" && !isValidIranPhone(phone)

  const isNationalIdInvalid =
    !noNationalId && nationalId.trim() !== "" && !isValidNationalId(nationalId)

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!noPhone && !isValidIranPhone(phone)) return
    if (!noNationalId && !isValidNationalId(nationalId)) return

    if (!noPhone && phone.trim()) {
      setPhone(normalizeIranPhone(phone))
    }

    handleCreateClient(e)
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      {/* هدر صفحه */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            پرونده‌ها و مراجعین
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مدیریت پرونده مراجعین، ثبت خدمات انجام‌شده، فاکتورها و سوابق پزشکی
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportDataMenu entity="CLIENTS" canExport={canExport} />
          {canCreate && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <UserPlus className="ml-2 size-4" />
              پرونده جدید
            </Button>
          )}
        </div>
      </div>

      {/* نوار فیلتر وضعیت، جستجو، مرتب‌سازی و تغییر نما */}
      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* تب‌های وضعیت تکمیل پرونده */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted p-1">
            {[
              { key: "ALL", label: "همه" },
              { key: "INCOMPLETE", label: "نیاز به تکمیل" },
              { key: "COMPLETE", label: "تکمیل شده" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => updateQueryParams({ status: tab.key })}
                className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  initialStatus === tab.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* مرتب‌سازی و سوییچ نمای کارتی / جدولی */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48">
              <Select
                value={initialSort}
                items={SORT_OPTIONS}
                onValueChange={(val) =>
                  updateQueryParams({ sort: val || "fileNumber_desc" })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="مرتب‌سازی" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center rounded-lg border bg-background p-0.5">
              <Button
                type="button"
                variant={viewMode === "card" ? "default" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("card")}
                title="نمای کارتی"
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "table" ? "default" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("table")}
                title="نمای جدولی"
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* فرم جستجو و آمار تعداد کل */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex w-full max-w-md items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="جستجو نام، کدملی، موبایل یا شماره پرونده..."
                className="pr-9"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={isPending}>
              جستجو
            </Button>
          </form>

          <div className="text-xs text-muted-foreground">
            تعداد کل پرونده‌ها:{" "}
            <span className="font-semibold text-foreground">
              {totalCount.toLocaleString("fa-IR")}
            </span>
          </div>
        </div>
      </div>

      {/* محتوای اصلی: نمای کارتی یا نمای جدولی */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <FolderOpen className="mb-3 size-12 text-muted-foreground/50" />
          <p className="text-base font-medium">پرونده‌ای یافت نشد</p>
          <p className="mt-1 text-xs text-muted-foreground">
            برای ثبت اولین پرونده مراجعه‌کننده روی دکمه «پرونده جدید» کلیک کنید.
          </p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="group overflow-hidden rounded-xl border bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
            >
              {/* هدر آبی کارت مراجع */}
              <div className="flex items-center justify-between bg-primary px-3.5 py-2.5 text-primary-foreground">
                <Link
                  href={`/clinic-dashboard/clients/${client.id}`}
                  className="flex items-center gap-2 truncate font-semibold hover:underline"
                >
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${
                      client.isComplete ? "bg-emerald-300" : "bg-amber-300"
                    }`}
                    title={
                      client.isComplete
                        ? "پرونده تکمیل شده"
                        : "نیاز به تکمیل شماره تماس"
                    }
                  />
                  <span className="truncate text-sm">{client.fullName}</span>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-md p-1 hover:bg-primary-foreground/15">
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/clinic-dashboard/clients/${client.id}`)
                      }
                    >
                      <FolderOpen className="ml-2 size-4" />
                      مشاهده پرونده و خدمات
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/clinic-dashboard/clients/${client.id}/additional-info`
                        )
                      }
                    >
                      <FileText className="ml-2 size-4" />
                      اطلاعات تکمیلی
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/clinic-dashboard/clients/${client.id}/wallet`
                        )
                      }
                    >
                      <Wallet className="ml-2 size-4" />
                      کیف پول
                    </DropdownMenuItem>

                    {canEdit && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openQuickEditModal(client)}
                        >
                          <Pencil className="ml-2 size-4" />
                          ویرایش سریع نام و مشخصات
                        </DropdownMenuItem>
                      </>
                    )}

                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingClient(client)}
                        >
                          <Trash2 className="ml-2 size-4" />
                          حذف پرونده
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* بدنه اطلاعات کارت */}
              <div className="space-y-2.5 p-3.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    موبایل
                  </span>
                  <span
                    className="font-mono font-medium text-foreground"
                    dir="ltr"
                  >
                    {client.phone || "ثبت نشده"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    شماره پرونده
                  </span>
                  <span className="font-semibold text-foreground">
                    {client.fileNumber ?? "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="size-3.5" />
                    تعداد خدمات
                  </span>
                  <Badge variant="secondary" className="text-[11px]">
                    {client.servicesCount.toLocaleString("fa-IR")} سرویس
                  </Badge>
                </div>

                {/* انتخاب برچسب */}
                <div className="pt-1">
                  <Select
                    value={client.tag || "NONE"}
                    items={CLIENT_TAGS}
                    disabled={!canEdit}
                    onValueChange={(val) =>
                      handleTagChange(client.id, val || "NONE")
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Tag className="size-3 text-muted-foreground" />
                        <SelectValue placeholder="انتخاب برچسب" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_TAGS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  render={
                    <Link href={`/clinic-dashboard/clients/${client.id}`} />
                  }
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  className="mt-1 w-full text-xs"
                >
                  ورود به پرونده
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">شماره پرونده</TableHead>
                <TableHead className="text-right">نام و نام خانوادگی</TableHead>
                <TableHead className="text-right">شماره موبایل</TableHead>
                <TableHead className="text-right">کد ملی</TableHead>
                <TableHead className="text-right">وضعیت پرونده</TableHead>
                <TableHead className="text-right">تعداد سرویس</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-semibold">
                    {client.fileNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clinic-dashboard/clients/${client.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {client.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono" dir="ltr">
                    {client.phone || "—"}
                  </TableCell>
                  <TableCell className="font-mono">
                    {client.nationalId || "—"}
                  </TableCell>
                  <TableCell>
                    {client.isComplete ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
                        <CheckCircle2 className="ml-1 size-3" />
                        تکمیل شده
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/50 text-amber-600"
                      >
                        <AlertCircle className="ml-1 size-3" />
                        نیاز به تکمیل
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.servicesCount.toLocaleString("fa-IR")}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        render={
                          <Link
                            href={`/clinic-dashboard/clients/${client.id}`}
                          />
                        }
                        nativeButton={false}
                        size="sm"
                        variant="secondary"
                      >
                        مشاهده پرونده
                      </Button>

                      {canEdit && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          title="ویرایش سریع"
                          onClick={() => openQuickEditModal(client)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}

                      {canDelete && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:text-destructive"
                          title="حذف پرونده"
                          onClick={() => setDeletingClient(client)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* صفحه‌بندی استاندارد */}
      <TablePaginationBar
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        disabled={isPending}
      />

      {/* دکمه شناور + پایین سمت چپ */}
      {canCreate && (
        <Button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
          title="افزودن پرونده جدید"
        >
          <Plus className="size-6" />
        </Button>
      )}

      {/* ========================================== */}
      {/* مودال ایجاد پرونده جدید */}
      {/* ========================================== */}
      <ResponsiveDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        drawerPosition="bottom"
      >
        <ResponsiveDialogTrigger
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>پرونده جدید</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              اطلاعات پایه مراجعه‌کننده را برای تشکیل پرونده جدید وارد کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={onFormSubmit} className="contents">
            <ResponsiveDialogPanel className="no-scrollbar max-h-[65dvh] overflow-y-auto pt-2">
              <div className="px-5">
                <FieldGroup>
                  {/* نام و نام خانوادگی */}
                  <Field>
                    <FieldLabel htmlFor="fullName">نام و نام خانوادگی*</FieldLabel>
                    <Input
                      id="fullName"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder=""
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* شماره تماس + بدون شماره */}
                    <Field data-invalid={isPhoneInvalid || undefined}>
                      <FieldLabel htmlFor="phone">
                        شماره تماس {!noPhone && "*"}
                      </FieldLabel>
                      <Input
                        id="phone"
                        dir="ltr"
                        type="tel"
                        disabled={noPhone}
                        required={!noPhone}
                        aria-invalid={isPhoneInvalid}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={() => {
                          if (!noPhone && phone.trim()) {
                            setPhone(normalizeIranPhone(phone))
                          }
                        }}
                        placeholder="09123456789"
                      />
                      {isPhoneInvalid && (
                        <FieldError>شماره موبایل وارد شده معتبر نیست.</FieldError>
                      )}
                      <Field orientation="horizontal" className="pt-1">
                        <Checkbox
                          id="noPhone"
                          checked={noPhone}
                          onCheckedChange={(checked) => {
                            setNoPhone(Boolean(checked))
                            if (checked) setPhone("")
                          }}
                        />
                        <FieldLabel
                          htmlFor="noPhone"
                          className="cursor-pointer text-xs font-normal"
                        >
                          بدون شماره
                        </FieldLabel>
                      </Field>
                    </Field>

                    {/* کد ملی + فاقد کد ملی */}
                    <Field data-invalid={isNationalIdInvalid || undefined}>
                      <FieldLabel htmlFor="nationalId">
                        کد ملی {!noNationalId && "*"}
                      </FieldLabel>
                      <Input
                        id="nationalId"
                        dir="ltr"
                        maxLength={10}
                        disabled={noNationalId}
                        required={!noNationalId}
                        aria-invalid={isNationalIdInvalid}
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="۱۰ رقم کد ملی"
                      />
                      {isNationalIdInvalid && (
                        <FieldError>کد ملی وارد شده معتبر نیست.</FieldError>
                      )}
                      <Field orientation="horizontal" className="pt-1">
                        <Checkbox
                          id="noNationalId"
                          checked={noNationalId}
                          onCheckedChange={(checked) => {
                            setNoNationalId(Boolean(checked))
                            if (checked) setNationalId("")
                          }}
                        />
                        <FieldLabel
                          htmlFor="noNationalId"
                          className="cursor-pointer text-xs font-normal"
                        >
                          فاقد کد ملی
                        </FieldLabel>
                      </Field>
                    </Field>
                  </div>

                  {/* شماره پرونده و جنسیت */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="fileNumber">شماره پرونده</FieldLabel>
                      <Input
                        id="fileNumber"
                        type="number"
                        value={fileNumber}
                        onChange={(e) => setFileNumber(e.target.value)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="gender">جنسیت *</FieldLabel>
                      <Select
                        value={gender}
                        items={GENDER_OPTIONS}
                        onValueChange={(val) =>
                          setGender((val as "FEMALE" | "MALE") || "FEMALE")
                        }
                      >
                        <SelectTrigger id="gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((g) => (
                            <SelectItem key={g.value} value={g.value}>
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* تاریخ تولد */}
                  <Field>
                    <FieldLabel>تاریخ تولد</FieldLabel>
                    <DatePicker
                      calendarType="shamsi"
                      value={birthDate}
                      onValueChange={setBirthDate}
                      calendarProps={{
                        captionLayout: "dropdown",
                        startMonth: new Date(1940, 0),
                        endMonth: new Date(),
                      }}
                    />
                  </Field>

                  {/* نحوه آشنایی با کلینیک */}
                  <Field>
                    <FieldLabel htmlFor="referralSource">
                      نحوه آشنایی با کلینیک
                    </FieldLabel>
                    <Select
                      value={referralSource}
                      items={REFERRAL_SOURCES}
                      onValueChange={(val) => setReferralSource(val || "NONE")}
                    >
                      <SelectTrigger id="referralSource">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REFERRAL_SOURCES.map((src) => (
                          <SelectItem key={src.value} value={src.value}>
                            {src.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* نوع معرف (مراجعین / همکاران) با جستجوی سریع */}
                  <Field>
                    <FieldLabel>نوع معرف</FieldLabel>
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setReferrerType("CLIENT")
                          setReferrerId("NONE")
                        }}
                        className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                          referrerType === "CLIENT"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground"
                        }`}
                      >
                        مراجعین
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReferrerType("STAFF")
                          setReferrerId("NONE")
                        }}
                        className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                          referrerType === "STAFF"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground"
                        }`}
                      >
                        همکاران
                      </button>
                    </div>

                    <SearchableSelect
                      options={referrerItems}
                      value={referrerId}
                      placeholder={
                        referrerType === "CLIENT"
                          ? "جستجوی نام یا شماره پرونده مراجع..."
                          : "جستجوی نام همکار..."
                      }
                      emptyText="معرفی یافت نشد."
                      onValueChange={(val) => setReferrerId(val || "NONE")}
                    />
                  </Field>

                  {/* توضیحات */}
                  <Field className="pb-2">
                    <FieldLabel htmlFor="notes">توضیحات</FieldLabel>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="توضیحات اختیاری درباره مراجع..."
                    />
                  </Field>
                </FieldGroup>
              </div>
            </ResponsiveDialogPanel>

            <ResponsiveDialogFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={isPending || isPhoneInvalid || isNationalIdInvalid}
              >
                {isPending ? "در حال ثبت..." : "ایجاد پرونده"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ========================================== */}
      {/* مودال ویرایش سریع مشخصات پرونده */}
      {/* ========================================== */}
      <ResponsiveDialog
        open={Boolean(editingClient)}
        onOpenChange={(open) => !open && setEditingClient(null)}
      >
        <ResponsiveDialogTrigger
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              ویرایش سریع مشخصات پرونده
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              نام، شماره پرونده، شماره تماس یا کد ملی مراجع را اصلاح کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleQuickEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>نام و نام خانوادگی *</Label>
              <Input
                required
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>شماره پرونده</Label>
                <Input
                  type="number"
                  value={editFileNumber}
                  onChange={(e) => setEditFileNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>جنسیت</Label>
                <Select
                  value={editGender}
                  items={GENDER_OPTIONS}
                  onValueChange={(v) =>
                    setEditGender((v as "FEMALE" | "MALE") || "FEMALE")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>شماره موبایل</Label>
              <Input
                dir="ltr"
                disabled={editNoPhone}
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="09123456789"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editNoPhone"
                  checked={editNoPhone}
                  onCheckedChange={(checked) => {
                    setEditNoPhone(Boolean(checked))
                    if (checked) setEditPhone("")
                  }}
                />
                <Label htmlFor="editNoPhone" className="cursor-pointer text-xs">
                  بدون شماره
                </Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>کد ملی</Label>
              <Input
                dir="ltr"
                maxLength={10}
                value={editNationalId}
                onChange={(e) => setEditNationalId(e.target.value)}
                placeholder="۱۰ رقم کد ملی"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingClient(null)}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </div>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ========================================== */}
      {/* مودال اخطار هوشمند حذف پرونده */}
      {/* ========================================== */}
      <ResponsiveDialog
        open={Boolean(deletingClient)}
        onOpenChange={(open) => !open && setDeletingClient(null)}
      >
        <ResponsiveDialogTrigger
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <ResponsiveDialogContent className="py-5 sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              حذف پرونده {deletingClient?.fullName}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              آیا از حذف کامل این پرونده اطمینان دارید؟ این عملیات غیرقابل
              بازگشت است.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {deletingClient && (
            <div className="space-y-4 pt-2">
              {deletingHasRecords ? (
                <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive">
                  <p className="font-bold">
                    هشدار مهم: این پرونده دارای سوابق ثبت‌شده در سیستم است!
                  </p>
                  <p>
                    با حذف این پرونده، تمام داده‌های زیر برای همیشه پاک می‌شوند:
                  </p>
                  <ul className="list-inside list-disc space-y-1 font-medium">
                    {deletingClient.servicesCount > 0 && (
                      <li>
                        {deletingClient.servicesCount.toLocaleString("fa-IR")}{" "}
                        سرویس انجام‌شده
                      </li>
                    )}
                    {deletingClient.invoicesCount > 0 && (
                      <li>
                        {deletingClient.invoicesCount.toLocaleString("fa-IR")}{" "}
                        فاکتور و رکورد پرداختی/اقساط
                      </li>
                    )}
                    {deletingClient.walletBalance > 0 && (
                      <li>
                        موجودی کیف پول به مبلغ{" "}
                        {deletingClient.walletBalance.toLocaleString("fa-IR")}{" "}
                        تومان
                      </li>
                    )}
                    <li>
                      تمامی اقلام مصرفی این سرویس‌ها به صورت خودکار به موجودی
                      بچ‌های انبار بازگردانده و اصلاح خواهند شد.
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                  این پرونده فاقد هرگونه سابقه سرویس، فاکتور یا تراکنش مالی است
                  و حذف آن هیچ تغییری در انبار و حسابداری ایجاد نمی‌کند.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeletingClient(null)}
                  disabled={isPending}
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmDeleteClient}
                  disabled={isPending}
                >
                  {isPending
                    ? "در حال حذف و اصلاح انبار..."
                    : "تایید و حذف کامل پرونده"}
                </Button>
              </div>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}