// components/clinic-dashboard/appointments/client-combobox.tsx
"use client"

import * as React from "react"
import {
  Check,
  ChevronsUpDown,
  Search,
  UserPlus,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  quickCreateClientAction,
  type CreatedClientSummary,
} from "@/app/clinic-dashboard/(dashboard)/calendar/actions"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"
import { cn } from "@/lib/utils"

export interface ClientComboboxItem {
  id: string
  fullName: string
  phone: string
  nationalId?: string | null
  nickname?: string | null
  fileNumber?: number | null
}

interface ClientComboboxProps {
  clients: ClientComboboxItem[]
  value: string
  disabled?: boolean
  onChange: (clientId: string) => void
  onClientCreated?: (client: CreatedClientSummary) => void
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
function toFa(val: number | string): string {
  return String(val).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

export function ClientCombobox({
  clients,
  value,
  disabled = false,
  onChange,
  onClientCreated,
}: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  // فرم ثبت سریع پرونده مراجع در صورت عدم وجود
  const [creatingNew, setCreatingNew] = React.useState(false)
  const [newFullName, setNewFullName] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [newNationalId, setNewNationalId] = React.useState("")
  const [newNickname, setNewNickname] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)

  const selectedClient = React.useMemo(
    () => clients.find((c) => c.id === value) || null,
    [clients, value]
  )

  // تشخیص نام‌های هم‌نام برای نمایش خودکار نام مستعار در صورت وجود مشابه
  const duplicateNameSet = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of clients) {
      const key = (c.fullName || "").trim().toLowerCase()
      if (!key) continue
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    const dups = new Set<string>()
    for (const [key, count] of counts.entries()) {
      if (count > 1) dups.add(key)
    }
    return dups
  }, [clients])

  const filteredClients = React.useMemo(() => {
    const q = normalizePersianDigits(query).trim().toLowerCase()
    if (!q) return clients.slice(0, 20)
    return clients
      .filter((c) => {
        const name = (c.fullName || "").toLowerCase()
        const nick = (c.nickname || "").toLowerCase()
        const phone = normalizePersianDigits(c.phone || "")
        const natId = normalizePersianDigits(c.nationalId || "")
        const fileNo = normalizePersianDigits(String(c.fileNumber ?? ""))
        return (
          name.includes(q) ||
          nick.includes(q) ||
          phone.includes(q) ||
          natId.includes(q) ||
          fileNo.includes(q)
        )
      })
      .slice(0, 25)
  }, [clients, query])

  const openQuickCreateWithPrefill = () => {
    const trimmed = normalizePersianDigits(query).trim()
    setCreateError(null)
    if (/^\d{10}$/.test(trimmed)) {
      setNewNationalId(trimmed)
      setNewPhone("")
      setNewFullName("")
    } else if (/^09\d{9}$/.test(trimmed) || /^9\d{9}$/.test(trimmed)) {
      setNewPhone(trimmed.startsWith("9") ? `0${trimmed}` : trimmed)
      setNewNationalId("")
      setNewFullName("")
    } else {
      setNewFullName(query.trim())
      setNewPhone("")
      setNewNationalId("")
    }
    setNewNickname("")
    setCreatingNew(true)
  }

  const handleCreateClient = async () => {
    setCreateError(null)
    if (!newFullName.trim()) {
      setCreateError("علت: وارد کردن نام و نام خانوادگی مراجع الزامی است.")
      return
    }

    setIsCreating(true)
    try {
      const res = await quickCreateClientAction({
        fullName: newFullName.trim(),
        phone: normalizePersianDigits(newPhone).trim() || null,
        nationalId: normalizePersianDigits(newNationalId).trim() || null,
        nickname: newNickname.trim() || null,
      })

      if (!res.success || !res.client) {
        const msg = res.error || "علت: امکان ثبت پرونده مراجع وجود ندارد."
        setCreateError(msg)
        toast.error(msg)
        return
      }

      onClientCreated?.(res.client)
      onChange(res.client.id)
      setCreatingNew(false)
      setOpen(false)
      setQuery("")
      toast.success(`پرونده مراجع «${res.client.fullName}» ایجاد و انتخاب شد.`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-2" dir="rtl">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => !prev)
          setCreatingNew(false)
          setCreateError(null)
        }}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-right text-sm transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-primary ring-1 ring-primary"
        )}
      >
        <div className="min-w-0 flex-1">
          {selectedClient ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-semibold">
                {selectedClient.fullName}
              </span>
              {selectedClient.nickname && (
                <Badge variant="secondary" className="h-5 text-[10px]">
                  نام مستعار: {selectedClient.nickname}
                </Badge>
              )}
              {selectedClient.phone && (
                <span
                  dir="ltr"
                  className="font-mono text-xs text-muted-foreground"
                >
                  {toFa(selectedClient.phone)}
                </span>
              )}
              {selectedClient.nationalId && (
                <span
                  dir="ltr"
                  className="font-mono text-[11px] text-muted-foreground"
                >
                  ({toFa(selectedClient.nationalId)})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">
              جستجو با کد ملی، شماره تماس، نام یا نام مستعار...
            </span>
          )}
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && !disabled && (
        <div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
          {!creatingNew ? (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="کد ملی، شماره موبایل یا نام و نام خانوادگی را وارد کنید..."
                  className="pr-9 text-xs"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="max-h-52 space-y-1 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                    مراجعی با این مشخصات پیدا نشد. می‌توانید در همین فرم پرونده جدید ثبت کنید.
                  </div>
                ) : (
                  filteredClients.map((client) => {
                    const isSelected = client.id === value
                    const hasDuplicateName = duplicateNameSet.has(
                      (client.fullName || "").trim().toLowerCase()
                    )

                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          onChange(client.id)
                          setOpen(false)
                          setCreateError(null)
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-right text-xs transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 font-semibold text-primary"
                            : "bg-background hover:bg-muted/60"
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold">
                              {client.fullName}
                            </span>
                            {(client.nickname || hasDuplicateName) && (
                              <Badge
                                variant={
                                  client.nickname ? "secondary" : "outline"
                                }
                                className="h-4 px-1.5 text-[10px]"
                              >
                                {client.nickname
                                  ? `نام مستعار: ${client.nickname}`
                                  : "هم‌نام (بدون نام مستعار)"}
                              </Badge>
                            )}
                            {client.fileNumber !== null &&
                              client.fileNumber !== undefined && (
                                <span className="text-[10px] text-muted-foreground">
                                  پرونده #{toFa(client.fileNumber)}
                                </span>
                              )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            <span>
                              موبایل:{" "}
                              <strong dir="ltr" className="font-mono">
                                {client.phone
                                  ? toFa(client.phone)
                                  : "ثبت نشده"}
                              </strong>
                            </span>
                            <span>
                              کد ملی:{" "}
                              <strong dir="ltr" className="font-mono">
                                {client.nationalId
                                  ? toFa(client.nationalId)
                                  : "ثبت نشده"}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="size-4 shrink-0 text-primary" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={openQuickCreateWithPrefill}
                >
                  <UserPlus className="ml-1 size-3.5 text-primary" />
                  ثبت پرونده جدید برای مراجع
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setOpen(false)}
                >
                  بستن
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">
                  ثبت سریع پرونده مراجع جدید
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingNew(false)
                    setCreateError(null)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  بازگشت به لیست
                </button>
              </div>

              <FieldGroup>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="qc-fullname">
                      نام و نام خانوادگی *
                    </FieldLabel>
                    <Input
                      id="qc-fullname"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="مثلاً: سارا محمدی"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="qc-nickname">
                      نام مستعار (برای تشخیص هم‌نام‌ها)
                    </FieldLabel>
                    <Input
                      id="qc-nickname"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      placeholder="مثلاً: سارا لیزر / سارا تهران"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="qc-phone">شماره تماس</FieldLabel>
                    <Input
                      id="qc-phone"
                      dir="ltr"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="09123456789"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="qc-nationalid">کد ملی</FieldLabel>
                    <Input
                      id="qc-nationalid"
                      dir="ltr"
                      maxLength={10}
                      value={newNationalId}
                      onChange={(e) => setNewNationalId(e.target.value)}
                      placeholder="0012345678"
                    />
                    <FieldDescription className="text-[10px]">
                      تکراری بودن کد ملی/موبایل فقط در پرونده‌های این کلینیک بررسی می‌شود.
                    </FieldDescription>
                  </Field>
                </div>
              </FieldGroup>

              {createError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={isCreating}
                  onClick={() => setCreatingNew(false)}
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  size="xs"
                  disabled={isCreating}
                  onClick={() => void handleCreateClient()}
                >
                  {isCreating ? "در حال ثبت پرونده..." : "ثبت پرونده و انتخاب"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}