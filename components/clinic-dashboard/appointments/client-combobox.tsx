// components/clinic-dashboard/appointments/client-combobox.tsx
"use client"

import * as React from "react"
import { AlertTriangle, Check, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  quickCreateClientAction,
  type CreatedClientSummary,
} from "@/app/clinic-dashboard/(dashboard)/calendar/actions"
import { isValidNationalId } from "@/lib/national-id"
import { normalizeIranPhone, isValidIranPhone } from "@/lib/iranian-mobile"
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
  quickCreateOpen?: boolean
  onQuickCreateOpenChange?: (open: boolean) => void
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
  quickCreateOpen: controlledQuickOpen,
  onQuickCreateOpenChange,
}: ClientComboboxProps) {
  const [searchText, setSearchText] = React.useState("")
  const deferredSearch = React.useDeferredValue(searchText)

  const [internalQuickOpen, setInternalQuickOpen] = React.useState(false)
  const isQuickOpen = controlledQuickOpen ?? internalQuickOpen
  const setQuickOpen = (next: boolean) => {
    if (controlledQuickOpen === undefined) {
      setInternalQuickOpen(next)
    }
    onQuickCreateOpenChange?.(next)
  }

  const [newFullName, setNewFullName] = React.useState("")
  const [newNickname, setNewNickname] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [noPhone, setNoPhone] = React.useState(false)
  const [newNationalId, setNewNationalId] = React.useState("")
  const [noNationalId, setNoNationalId] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)

  const selectedClient = React.useMemo(
    () => clients.find((c) => c.id === value) || null,
    [clients, value]
  )

  React.useEffect(() => {
    if (selectedClient && !searchText) {
      const nickPart = selectedClient.nickname
        ? ` (${selectedClient.nickname})`
        : ""
      setSearchText(
        `${selectedClient.fullName}${nickPart}${
          selectedClient.phone ? ` - ${toFa(selectedClient.phone)}` : ""
        }`
      )
    }
  }, [selectedClient, searchText])

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

  const visibleClients = React.useMemo(() => {
    const q = normalizePersianDigits(deferredSearch).trim().toLowerCase()
    if (!q) return clients.slice(0, 20)
    const matches: ClientComboboxItem[] = []
    for (const c of clients) {
      const name = (c.fullName || "").toLowerCase()
      const nick = (c.nickname || "").toLowerCase()
      const phone = normalizePersianDigits(c.phone || "")
      const natId = normalizePersianDigits(c.nationalId || "")
      const fileNo = normalizePersianDigits(String(c.fileNumber ?? ""))
      if (
        name.includes(q) ||
        nick.includes(q) ||
        phone.includes(q) ||
        natId.includes(q) ||
        fileNo.includes(q)
      ) {
        matches.push(c)
        if (matches.length >= 25) break
      }
    }
    return matches
  }, [clients, deferredSearch])

  // بررسی نام مشابه در پرونده‌های کلینیک
  const matchingClients = React.useMemo(() => {
    const targetName = newFullName.trim().toLowerCase()
    if (!targetName) return []
    return clients.filter(
      (c) => (c.fullName || "").trim().toLowerCase() === targetName
    )
  }, [clients, newFullName])

  const hasDuplicateName = matchingClients.length > 0

  const normalizedPhoneForCheck = React.useMemo(
    () => normalizeIranPhone(newPhone),
    [newPhone]
  )
  const cleanNationalIdForCheck = React.useMemo(
    () => normalizePersianDigits(newNationalId).replace(/\D/g, ""),
    [newNationalId]
  )

  const isPhoneInvalid = React.useMemo(() => {
    if (noPhone) return false
    if (!newPhone.trim()) return false
    return !isValidIranPhone(newPhone)
  }, [noPhone, newPhone])

  const isNationalIdInvalid = React.useMemo(() => {
    if (noNationalId) return false
    if (!cleanNationalIdForCheck) return false
    return !isValidNationalId(cleanNationalIdForCheck)
  }, [noNationalId, cleanNationalIdForCheck])

  const duplicatePhoneClient = React.useMemo(() => {
    if (noPhone || !normalizedPhoneForCheck) return null
    return (
      clients.find(
        (c) =>
          c.phone && normalizeIranPhone(c.phone) === normalizedPhoneForCheck
      ) || null
    )
  }, [clients, noPhone, normalizedPhoneForCheck])

  const duplicateNationalIdClient = React.useMemo(() => {
    if (noNationalId || !cleanNationalIdForCheck) return null
    return (
      clients.find(
        (c) =>
          c.nationalId &&
          normalizePersianDigits(c.nationalId).replace(/\D/g, "") ===
            cleanNationalIdForCheck
      ) || null
    )
  }, [clients, noNationalId, cleanNationalIdForCheck])

  const handleOpenQuickCreate = () => {
    const trimmed = normalizePersianDigits(searchText).trim()
    setCreateError(null)
    setNoPhone(false)
    setNoNationalId(false)
    if (/^\d{10}$/.test(trimmed)) {
      setNewNationalId(trimmed)
      setNewPhone("")
      setNewFullName("")
    } else if (/^09\d{9}$/.test(trimmed) || /^9\d{9}$/.test(trimmed)) {
      setNewPhone(normalizeIranPhone(trimmed))
      setNewNationalId("")
      setNewFullName("")
    } else {
      setNewFullName(searchText.trim())
      setNewPhone("")
      setNewNationalId("")
    }
    setNewNickname("")
    setQuickOpen(true)
  }

  const handleCreateClient = async (options?: {
    skipPhone?: boolean
    skipNationalId?: boolean
  }) => {
    setCreateError(null)
    if (!newFullName.trim()) {
      setCreateError("علت: وارد کردن نام و نام خانوادگی مراجع الزامی است.")
      return
    }

    const effectiveNoPhone = options?.skipPhone ? true : noPhone
    const effectiveNoNatId = options?.skipNationalId ? true : noNationalId

    if (!effectiveNoPhone && newPhone.trim() && !isValidIranPhone(newPhone)) {
      setCreateError("شماره موبایل وارد شده معتبر نیست.")
      return
    }

    if (
      !effectiveNoNatId &&
      cleanNationalIdForCheck &&
      !isValidNationalId(cleanNationalIdForCheck)
    ) {
      setCreateError("کد ملی وارد شده معتبر نیست.")
      return
    }

    const finalPhone = effectiveNoPhone
      ? null
      : newPhone.trim()
      ? normalizeIranPhone(newPhone)
      : null

    const finalNationalId = effectiveNoNatId
      ? null
      : cleanNationalIdForCheck || null

    setIsCreating(true)
    try {
      const res = await quickCreateClientAction({
        fullName: newFullName.trim(),
        phone: finalPhone,
        nationalId: finalNationalId,
        nickname: hasDuplicateName ? newNickname.trim() || null : null,
      })

      if (!res.success || !res.client) {
        const msg = res.error || "علت: امکان ثبت پرونده مراجع وجود ندارد."
        setCreateError(msg)
        toast.error(msg)
        return
      }

      onClientCreated?.(res.client)
      onChange(res.client.id)
      const nickPart = res.client.nickname ? ` (${res.client.nickname})` : ""
      setSearchText(
        `${res.client.fullName}${nickPart}${
          res.client.phone ? ` - ${toFa(res.client.phone)}` : ""
        }`
      )
      setQuickOpen(false)
      toast.success(`پرونده مراجع «${res.client.fullName}» ایجاد و انتخاب شد.`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-2.5" dir="rtl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Combobox
              value={selectedClient}
              disabled={disabled}
              onValueChange={(nextClient) => {
                if (nextClient) {
                  onChange(nextClient.id)
                  const nickPart = nextClient.nickname
                    ? ` (${nextClient.nickname})`
                    : ""
                  setSearchText(
                    `${nextClient.fullName}${nickPart}${
                      nextClient.phone ? ` - ${toFa(nextClient.phone)}` : ""
                    }`
                  )
                } else {
                  onChange("")
                  setSearchText("")
                }
              }}
            >
              <ComboboxInputGroup className="h-10 bg-background">
                <ComboboxInput
                  disabled={disabled}
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value)
                    if (value) onChange("")
                  }}
                  placeholder="تایپ کنید: کد ملی، شماره تماس، نام یا نام مستعار..."
                />
                {searchText && !disabled && (
                  <ComboboxClear
                    onClick={() => {
                      setSearchText("")
                      onChange("")
                    }}
                  />
                )}
                <ComboboxIcon />
              </ComboboxInputGroup>

              <ComboboxContent align="start">
                <ComboboxList>
                  {visibleClients.length === 0 ? (
                    <ComboboxEmpty className="py-4 text-xs">
                      مراجعی با این مشخصات یافت نشد. از دکمه «ثبت مراجع جدید» پرونده بسازید.
                    </ComboboxEmpty>
                  ) : (
                    visibleClients.map((client) => {
                      const hasDupInList = duplicateNameSet.has(
                        (client.fullName || "").trim().toLowerCase()
                      )
                      return (
                        <ComboboxItem
                          key={client.id}
                          value={client}
                          className="py-2 text-xs"
                        >
                          <div className="flex w-full flex-col gap-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-foreground">
                                {client.fullName}
                              </span>
                              {(client.nickname || hasDupInList) && (
                                <Badge
                                  variant={
                                    client.nickname ? "secondary" : "outline"
                                  }
                                  className="h-4 px-1.5 text-[10px]"
                                >
                                  {client.nickname
                                    ? `نام مستعار: ${client.nickname}`
                                    : "هم‌نام"}
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
                        </ComboboxItem>
                      )
                    })
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {!disabled && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      isQuickOpen
                        ? setQuickOpen(false)
                        : handleOpenQuickCreate()
                    }
                    className="h-10 shrink-0"
                  />
                }
              >
                {isQuickOpen ? (
                  <>
                    <X className="ml-1.5 size-4" />
                    بستن ثبت سریع
                  </>
                ) : (
                  <>
                    <UserPlus className="ml-1.5 size-4 text-primary" />
                    ثبت مراجع جدید
                  </>
                )}
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                تشکیل پرونده جدید برای مراجع در همین بخش
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* ردیف ثبت سریع مراجع جدید در زیر موارد انتخابی */}
        {isQuickOpen && !disabled && (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-muted/25 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">
                ثبت سریع پرونده مراجع جدید
              </span>
              <span className="text-[11px] text-muted-foreground">
                پس از ثبت، به‌صورت خودکار انتخاب می‌شود
              </span>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="qc-fullname">
                  نام و نام خانوادگی *
                </FieldLabel>
                <Input
                  id="qc-fullname"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="مثلاً: سارا محمدی"
                  className="h-9 bg-background text-xs"
                />
              </Field>

              {/* هشدار زرد مراجع با نام مشابه + فیلد نام مستعار فقط در صورت تکرار نام */}
              {hasDuplicateName && (
                <>
                  <div className="space-y-1.5 rounded-xl border border-amber-400/70 bg-amber-400/15 p-3 text-xs text-amber-950 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-100">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-300" />
                      <span>مراجع با نام مشابه در سیستم ثبت شده است</span>
                    </div>
                    <p className="leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                      پرونده‌های هم‌نام:{" "}
                      {matchingClients
                        .slice(0, 3)
                        .map((m) =>
                          [
                            m.fullName,
                            m.fileNumber ? `پرونده #${toFa(m.fileNumber)}` : null,
                            m.phone ? toFa(m.phone) : null,
                            m.nickname ? `نام مستعار: ${m.nickname}` : null,
                          ]
                            .filter(Boolean)
                            .join(" — ")
                        )
                        .join(" | ")}
                    </p>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="qc-nickname">
                      نام مستعار (اختیاری)
                    </FieldLabel>
                    <Input
                      id="qc-nickname"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      placeholder="مثلاً: سارا - پاسداران یا سارا ۲"
                      className="h-9 border-amber-400/60 bg-background text-xs focus-visible:border-amber-500"
                    />
                  </Field>
                </>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* شماره تماس + بدون شماره */}
                <Field data-invalid={isPhoneInvalid || undefined}>
                  <FieldLabel htmlFor="qc-phone">
                    شماره تماس {!noPhone && "*"}
                  </FieldLabel>
                  <Input
                    id="qc-phone"
                    dir="ltr"
                    type="tel"
                    disabled={noPhone}
                    aria-invalid={isPhoneInvalid}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    onBlur={() => {
                      if (!noPhone && newPhone.trim()) {
                        setNewPhone(normalizeIranPhone(newPhone))
                      }
                    }}
                    placeholder="09123456789"
                    className="h-9 bg-background text-xs"
                  />
                  {isPhoneInvalid && (
                    <FieldError>شماره موبایل وارد شده معتبر نیست.</FieldError>
                  )}
                  {duplicatePhoneClient && (
                    <FieldError className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      این شماره در پرونده «
                      {duplicatePhoneClient.fullName || "بدون نام"}»
                      {duplicatePhoneClient.fileNumber
                        ? ` (#${toFa(duplicatePhoneClient.fileNumber)})`
                        : ""}{" "}
                      ثبت شده است.
                    </FieldError>
                  )}
                  <Field orientation="horizontal" className="pt-1">
                    <Checkbox
                      id="qc-no-phone"
                      checked={noPhone}
                      onCheckedChange={(checked) => {
                        const isChecked = Boolean(checked)
                        setNoPhone(isChecked)
                        if (isChecked) setNewPhone("")
                      }}
                    />
                    <FieldLabel
                      htmlFor="qc-no-phone"
                      className="cursor-pointer text-xs font-normal"
                    >
                      بدون شماره
                    </FieldLabel>
                  </Field>
                </Field>

                {/* کد ملی + فاقد کد ملی */}
                <Field data-invalid={isNationalIdInvalid || undefined}>
                  <FieldLabel htmlFor="qc-nationalid">
                    کد ملی {!noNationalId && "*"}
                  </FieldLabel>
                  <Input
                    id="qc-nationalid"
                    dir="ltr"
                    maxLength={10}
                    disabled={noNationalId}
                    aria-invalid={isNationalIdInvalid}
                    value={newNationalId}
                    onChange={(e) => setNewNationalId(e.target.value)}
                    placeholder="۱۰ رقم کد ملی"
                    className="h-9 bg-background text-xs"
                  />
                  {isNationalIdInvalid && (
                    <FieldError>کد ملی وارد شده معتبر نیست.</FieldError>
                  )}
                  {duplicateNationalIdClient && (
                    <FieldError className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      این کد ملی در پرونده «
                      {duplicateNationalIdClient.fullName || "بدون نام"}»
                      {duplicateNationalIdClient.fileNumber
                        ? ` (#${toFa(duplicateNationalIdClient.fileNumber)})`
                        : ""}{" "}
                      ثبت شده است.
                    </FieldError>
                  )}
                  <Field orientation="horizontal" className="pt-1">
                    <Checkbox
                      id="qc-no-nationalid"
                      checked={noNationalId}
                      onCheckedChange={(checked) => {
                        const isChecked = Boolean(checked)
                        setNoNationalId(isChecked)
                        if (isChecked) setNewNationalId("")
                      }}
                    />
                    <FieldLabel
                      htmlFor="qc-no-nationalid"
                      className="cursor-pointer text-xs font-normal"
                    >
                      فاقد کد ملی
                    </FieldLabel>
                  </Field>
                </Field>
              </div>
            </FieldGroup>

            {createError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {createError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={isCreating}
                onClick={() =>
                  void handleCreateClient({
                    skipPhone: true,
                    skipNationalId: true,
                  })
                }
              >
                <Check className="ml-1 size-3.5 text-primary" />
                تایید بدون کد ملی و بدون شماره موبایل
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={isCreating}
                  onClick={() => setQuickOpen(false)}
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  size="xs"
                  disabled={isCreating || isPhoneInvalid || isNationalIdInvalid}
                  onClick={() => void handleCreateClient()}
                >
                  {isCreating ? "در حال ثبت پرونده..." : "ایجاد پرونده و انتخاب"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}