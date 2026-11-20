// app/clinic-dashboard/(auth)/register/page.tsx
"use client"

import React, { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {
  sendRegistrationOtpAction,
  completeClinicRegistrationAction,
} from "@/app/clinic-dashboard/(auth)/login/clinic-auth"
import {
  User,
  Building2,
  Phone,
  RefreshCw,
  Timer,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  FileText,
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import DotField from "@/components/kokonutui/dot-field"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"

function RegisterFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialPhone = searchParams.get("phone") || ""
  const wasRedirectedFromOtp = searchParams.get("otpSent") === "1"

  const [step, setStep] = useState<"info" | "otp" | "welcome">("info")

  const [fullName, setFullName] = useState("")
  const [clinicName, setClinicName] = useState("")
  const [mobileNumber, setMobileNumber] = useState(() =>
    normalizePersianDigits(initialPhone)
  )
  const [otpCode, setOtpCode] = useState("")
  const [otpAlreadyDispatched, setOtpAlreadyDispatched] =
    useState(wasRedirectedFromOtp)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [timeLeft, setTimeLeft] = useState(120)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (step === "otp" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setCanResend(true)
    }

    return () => clearInterval(timer)
  }, [step, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // گام ۱: ارسال اطلاعات پایه و دریافت کد تایید
  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // اگر در صفحه ورود همین الان OTP برای این شماره ارسال شده و کاربر تغییرش نداده، مستقیم به وارد کردن کد می‌رود
    if (
      otpAlreadyDispatched &&
      normalizePersianDigits(mobileNumber).trim() ===
        normalizePersianDigits(initialPhone).trim()
    ) {
      setOtpAlreadyDispatched(false)
      setTimeLeft(110)
      setCanResend(false)
      setStep("otp")
      return
    }

    setIsLoading(true)
    try {
      const res = await sendRegistrationOtpAction({
        fullName,
        clinicName,
        phone: mobileNumber,
      })

      if (res.success) {
        setTimeLeft(120)
        setCanResend(false)
        setOtpCode("")
        setStep("otp")
      } else {
        setErrorMessage(res.error || "خطا در ارسال کد تأیید.")
      }
    } catch {
      setErrorMessage("خطایی در ارتباط با سرور رخ داد.")
    } finally {
      setIsLoading(false)
    }
  }

  // ارسال مجدد کد OTP
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const res = await sendRegistrationOtpAction({
        fullName,
        clinicName,
        phone: mobileNumber,
      })
      if (res.success) {
        setTimeLeft(120)
        setCanResend(false)
        setOtpCode("")
      } else {
        setErrorMessage(res.error || "امکان ارسال مجدد کد وجود ندارد.")
      }
    } catch {
      setErrorMessage("خطا در ارسال مجدد کد.")
    } finally {
      setIsLoading(false)
    }
  }

  // گام ۲: تأیید کد OTP و ایجاد کلینیک
  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length < 6) return
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const res = await completeClinicRegistrationAction({
        fullName,
        clinicName,
        phone: mobileNumber,
        code: otpCode,
      })

      if (res.success) {
        setStep("welcome")
        router.refresh()
      } else {
        setErrorMessage(res.error || "کد تأیید صحیح نمی‌باشد.")
      }
    } catch {
      setErrorMessage("خطا در تکمیل ثبت‌نام.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full" dir="rtl">
      <DotField
        className="min-h-screen w-full bg-background p-4 text-foreground"
        spacing={18}
      >
        <div className="absolute top-4 left-4 z-50" dir="ltr">
          <ModeToggle />
        </div>

        <Card className="relative z-10 w-full max-w-md border-border/60 bg-card/95 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-6 text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-md ring-4 ${
                step === "welcome"
                  ? "bg-emerald-600 text-white ring-emerald-500/15"
                  : "bg-primary text-primary-foreground ring-primary/10"
              }`}
            >
              {step === "welcome" ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <Sparkles className="h-7 w-7" />
              )}
            </div>

            <div className="space-y-1.5">
              <CardTitle className="text-xl font-bold tracking-tight">
                {step === "info" && "ثبت‌نام کلینیک و مرکز جدید"}
                {step === "otp" && "تأیید شماره موبایل مدیر"}
                {step === "welcome" && "ثبت‌نام با موفقیت انجام شد!"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                {step === "info" &&
                  "اطلاعات اولیه خود و مرکز را وارد کنید تا پنل شما راه‌اندازی شود"}
                {step === "otp" &&
                  `کد ۶ رقمی پیامک‌شده به ${mobileNumber} را وارد کنید`}
                {step === "welcome" &&
                  `پنل «${clinicName}» آماده استفاده است. مایلید اطلاعات تکمیلی مرکز را الان وارد کنید؟`}
              </CardDescription>
            </div>
          </CardHeader>

          {wasRedirectedFromOtp && step === "info" && !errorMessage && (
            <div className="mx-6 mb-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-purple-200">
              حسابی با شماره <strong dir="ltr">{initialPhone}</strong> یافت نشد.
              کد تأیید برای شما ارسال شد؛ نام خود و نام مرکز را وارد کنید.
            </div>
          )}

          {errorMessage && (
            <div className="mx-6 mb-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/15 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* گام ۱: فرم مشخصات پایه */}
          {step === "info" && (
            <form onSubmit={handleSubmitInfo}>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="reg-fullname">
                      نام و نام خانوادگی *
                    </FieldLabel>
                    <InputGroup className="h-11">
                      <InputGroupAddon align="inline-start">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="reg-fullname"
                        placeholder="مثلاً: دکتر سارا محمدی"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoFocus
                        required
                      />
                    </InputGroup>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="reg-clinic">
                      نام کلینیک یا مرکز *
                    </FieldLabel>
                    <InputGroup className="h-11">
                      <InputGroupAddon align="inline-start">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="reg-clinic"
                        placeholder="مثلاً: کلینیک زیبایی و لیزر نیلوفر"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        required
                      />
                    </InputGroup>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="reg-mobile">شماره موبایل *</FieldLabel>
                    <InputGroup dir="ltr" className="h-11">
                      <InputGroupAddon align="inline-start">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="reg-mobile"
                        type="tel"
                        inputMode="tel"
                        placeholder="09123456789"
                        className="text-left font-mono tracking-wider"
                        value={mobileNumber}
                        onChange={(e) =>
                          setMobileNumber(
                            normalizePersianDigits(e.target.value)
                          )
                        }
                        required
                      />
                    </InputGroup>
                  </Field>
                </FieldGroup>

                <div className="pt-4">
                  <Separator />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : otpAlreadyDispatched ? (
                    "ادامه و وارد کردن کد تأیید"
                  ) : (
                    "دریافت کد تأیید و ثبت‌نام"
                  )}
                </Button>

                <div className="flex w-full items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
                  <span>قبلاً ثبت‌نام کرده‌اید؟</span>
                  <Link
                    href="/clinic-dashboard/login"
                    className="font-bold text-primary hover:underline"
                  >
                    ورود به حساب
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}

          {/* گام ۲: تأیید شماره موبایل با کد OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyAndCreate}>
              <CardContent className="flex flex-col items-center space-y-6">
                <div className="flex w-full flex-col items-center space-y-3">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(val) => setOtpCode(normalizePersianDigits(val))}
                    containerClassName="[direction:ltr]"
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-11 text-lg" />
                      <InputOTPSlot index={1} className="h-12 w-11 text-lg" />
                      <InputOTPSlot index={2} className="h-12 w-11 text-lg" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="h-12 w-11 text-lg" />
                      <InputOTPSlot index={4} className="h-12 w-11 text-lg" />
                      <InputOTPSlot index={5} className="h-12 w-11 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="flex w-full items-center justify-center text-xs text-muted-foreground">
                  {!canResend ? (
                    <div className="flex items-center gap-1.5 font-medium">
                      <Timer className="h-4 w-4 animate-pulse text-primary" />
                      <span>ارسال مجدد کد پس از</span>
                      <span
                        className="font-mono font-semibold text-foreground tabular-nums"
                        dir="ltr"
                      >
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      disabled={isLoading}
                      className="h-auto gap-1.5 p-0 text-xs text-primary"
                      onClick={handleResendOtp}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                      />
                      ارسال مجدد کد تأیید
                    </Button>
                  )}
                </div>

                <div className="w-full">
                  <Separator />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading || otpCode.length < 6}
                  className="w-full py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "تأیید شماره و ساخت کلینیک"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  className="w-full py-4 text-xs text-muted-foreground"
                  onClick={() => {
                    setErrorMessage(null)
                    setStep("info")
                  }}
                >
                  ویرایش شماره یا مشخصات
                </Button>
              </CardFooter>
            </form>
          )}

          {/* گام ۳: پرسش برای تکمیل اطلاعات مرکز یا صرف‌نظر */}
          {step === "welcome" && (
            <>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
                  شما می‌توانید هم‌اکنون اطلاعات تکمیلی مرکز شامل{" "}
                  <strong className="text-foreground">
                    لوگو، استان و شهر، آدرس، شماره‌های تماس، کد ملی صاحب کلینیک
                    و شماره نظام پزشکی
                  </strong>{" "}
                  را ثبت کنید تا در سربرگ فاکتورها و پرونده‌ها نمایش داده شوند،
                  یا فعلاً وارد داشبورد شوید و بعداً از بخش تنظیمات تکمیل کنید.
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2.5 pt-2">
                <Button
                  type="button"
                  className="w-full gap-2 py-5"
                  onClick={() => {
                    router.push(
                      "/clinic-dashboard/settings/clinic-profile?welcome=1"
                    )
                    router.refresh()
                  }}
                >
                  <FileText className="size-4" />
                  تکمیل اطلاعات تکمیلی مرکز
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 py-5 text-muted-foreground"
                  onClick={() => {
                    router.push("/clinic-dashboard")
                    router.refresh()
                  }}
                >
                  فعلاً صرف‌نظر کن و ورود به داشبورد
                  <ArrowLeft className="size-4" />
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </DotField>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterFormContent />
    </Suspense>
  )
}
