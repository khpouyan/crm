// app/clinic-dashboard/(auth)/login/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {
  sendOtpAction,
  verifyOtpAction,
  loginWithPasswordAction,
  setInitialPasswordAction,
} from "@/app/clinic-dashboard/(auth)/login/clinic-auth"
import {
  ArrowRight,
  KeyRound,
  Lock,
  Phone,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Timer,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Building2,
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import DotField from "@/components/kokonutui/dot-field"
import { normalizePersianDigits } from "@/lib/normalize-persian-digits"

export default function LoginPage() {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<
    "password" | "otp_phone" | "otp_verify" | "set_password"
  >("password")

  const [mobileNumber, setMobileNumber] = useState("")
  const [password, setPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")

  // استیت‌های مربوط به تنظیم رمز عبور اولیه
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // تایمر ۲ دقیقه‌ای (۱۲۰ ثانیه)
  const [timeLeft, setTimeLeft] = useState(120)
  const [canResend, setCanResend] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (authMode === "otp_verify" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setCanResend(true)
    }

    return () => clearInterval(timer)
  }, [authMode, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // ۱. ورود با کلمه عبور
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const res = await loginWithPasswordAction(mobileNumber, password)
      if (res.success) {
        router.push("/clinic-dashboard")
        router.refresh()
      } else {
        setErrorMessage(res.error || "ورود ناموفق بود.")
      }
    } catch {
      setErrorMessage("خطایی در ارتباط با سرور رخ داد.")
    } finally {
      setIsLoading(false)
    }
  }

  // ۲. ارسال پیامک OTP و انتقال به مرحله کد تایید (یا هدایت خودکار به ثبت‌نام در صورت نبود حساب)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const res = await sendOtpAction(mobileNumber)
      if (res.success) {
        if (res.redirectToRegister) {
          const cleanPhone = normalizePersianDigits(mobileNumber).trim()
          router.push(
            `/clinic-dashboard/register?phone=${encodeURIComponent(cleanPhone)}&otpSent=1`
          )
          return
        }
        setTimeLeft(120)
        setCanResend(false)
        setOtpCode("")
        setAuthMode("otp_verify")
      } else {
        setErrorMessage(res.error || "خطا در ارسال کد تایید.")
      }
    } catch {
      setErrorMessage("خطایی رخ داد. مجدداً تلاش کنید.")
    } finally {
      setIsLoading(false)
    }
  }

  // ۳. ارسال مجدد کد تایید
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const res = await sendOtpAction(mobileNumber)
      if (res.success) {
        setTimeLeft(120)
        setCanResend(false)
        setOtpCode("")
      } else {
        setErrorMessage(res.error || "امکان ارسال مجدد کد وجود ندارد.")
      }
    } catch {
      setErrorMessage("خطا در ارسال کد مجدد.")
    } finally {
      setIsLoading(false)
    }
  }

  // ۴. بررسی صحت OTP و انتقال به داشبورد یا صفحه ست کردن پسورد
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length < 6) return
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const res = await verifyOtpAction(mobileNumber, otpCode)
      if (res.success) {
        if (res.needsPassword) {
          setAuthMode("set_password")
        } else {
          router.push("/clinic-dashboard")
          router.refresh()
        }
      } else if (res.redirectToRegister) {
        const cleanPhone = normalizePersianDigits(mobileNumber).trim()
        router.push(
          `/clinic-dashboard/register?phone=${encodeURIComponent(cleanPhone)}`
        )
      } else {
        setErrorMessage(res.error || "کد وارد شده صحیح نمی‌باشد.")
      }
    } catch {
      setErrorMessage("خطایی در اعتبارسنجی رخ داد.")
    } finally {
      setIsLoading(false)
    }
  }

  // ۵. ذخیره رمز عبور جدید برای کاربر
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const res = await setInitialPasswordAction(newPassword, confirmPassword)
      if (res.success) {
        router.push("/clinic-dashboard")
        router.refresh()
      } else {
        setErrorMessage(res.error || "خطا در ثبت رمز عبور.")
      }
    } catch {
      setErrorMessage("خطایی در ارتباط با سرور رخ داد.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipPassword = () => {
    router.push("/clinic-dashboard")
    router.refresh()
  }

  const registerHref = mobileNumber.trim()
    ? `/clinic-dashboard/register?phone=${encodeURIComponent(
        normalizePersianDigits(mobileNumber).trim()
      )}`
    : "/clinic-dashboard/register"

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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md ring-4 ring-primary/10">
              {authMode === "set_password" ? (
                <ShieldCheck className="h-7 w-7" />
              ) : (
                <Sparkles className="h-7 w-7" />
              )}
            </div>

            <div className="space-y-1.5">
              <CardTitle className="text-xl font-bold tracking-tight">
                {authMode === "password" && "ورود به حساب کاربری"}
                {authMode === "otp_phone" && "ورود با رمز یک‌بار مصرف"}
                {authMode === "otp_verify" && "تأیید شماره موبایل"}
                {authMode === "set_password" && "تنظیم رمز عبور حساب"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                {authMode === "password" &&
                  "شماره موبایل و رمز عبور خود را وارد کنید"}
                {authMode === "otp_phone" &&
                  "اگر حسابی نداشته باشید، به صورت خودکار به ثبت‌نام هدایت می‌شوید"}
                {authMode === "otp_verify" &&
                  `کد ۶ رقمی ارسال‌شده به ${mobileNumber || "شماره شما"} را وارد کنید`}
                {authMode === "set_password" &&
                  "برای ورود سریع‌تر در مراجعات بعدی، یک رمز عبور دلخواه انتخاب کنید"}
              </CardDescription>
            </div>
          </CardHeader>

          {errorMessage && (
            <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/15 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ۱. فرم ورود با کلمه عبور */}
          {authMode === "password" && (
            <form onSubmit={handlePasswordLogin}>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="mobile">شماره موبایل</FieldLabel>
                    <InputGroup dir="ltr" className="h-12">
                      <InputGroupAddon align="inline-start">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="mobile"
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

                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="password">رمز عبور</FieldLabel>
                      <Button
                        variant="link"
                        size="sm"
                        type="button"
                        className="h-auto px-0 text-xs text-muted-foreground"
                        onClick={() => {
                          setErrorMessage(null)
                          setAuthMode("otp_phone")
                        }}
                      >
                        فراموشی رمز؟
                      </Button>
                    </div>

                    <InputGroup dir="ltr" className="h-12">
                      <InputGroupAddon align="inline-start">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="text-left font-mono text-base"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setShowPassword((prev) => !prev)}
                          tabIndex={-1}
                          aria-label={
                            showPassword
                              ? "مخفی کردن رمز عبور"
                              : "نمایش رمز عبور"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                </FieldGroup>

                <div className="pt-4">
                  <Separator />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ورود"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  className="w-full gap-2 py-5"
                  onClick={() => {
                    setErrorMessage(null)
                    setAuthMode("otp_phone")
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                  ورود با رمز یک‌بار مصرف
                </Button>

                <div className="text-s mt-2 flex w-full items-center justify-center gap-1.5 border-t pt-3 text-muted-foreground">
                  <span>کلینیک یا مطب دارید؟</span>
                  <Link
                    href={registerHref}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline dark:text-yellow-600"
                  >
                    <Building2 className="size-3.5" />
                    ثبت‌نام مرکز جدید
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}

          {/* ۲. فرم دریافت شماره موبایل جهت ارسال OTP */}
          {authMode === "otp_phone" && (
            <form onSubmit={handleSendOtp}>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="otp-mobile">شماره موبایل</FieldLabel>
                    <InputGroup dir="ltr" className="h-12">
                      <InputGroupAddon align="inline-start">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="otp-mobile"
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
                        autoFocus
                        required
                      />
                    </InputGroup>
                  </Field>
                </FieldGroup>

                <div className="pt-4">
                  <Separator />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ارسال کد تأیید"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  className="w-full gap-2 py-5 text-muted-foreground"
                  onClick={() => {
                    setErrorMessage(null)
                    setAuthMode("password")
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                  ورود با نام کاربری و رمز عبور
                </Button>

                <div className="mt-1 flex w-full items-center justify-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                  <span>هنوز ثبت‌نام نکرده‌اید؟</span>
                  <Link
                    href={registerHref}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    <Building2 className="size-3.5" />
                    ثبت‌نام کلینیک جدید
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}

          {/* ۳. مرحله ورود کد ۶ رقمی همراه با تایمر معکوس */}
          {authMode === "otp_verify" && (
            <form onSubmit={handleVerifyOtp}>
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

              <CardFooter className="flex flex-col gap-2.5 pt-0">
                <Button
                  type="submit"
                  disabled={isLoading || otpCode.length < 6}
                  className="mt-4 w-full py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "تأیید و ورود"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  className="w-full py-5 text-xs text-muted-foreground"
                  onClick={() => {
                    setErrorMessage(null)
                    setAuthMode("otp_phone")
                  }}
                >
                  تغییر شماره همراه
                </Button>
              </CardFooter>
            </form>
          )}

          {/* ۴. مرحله تنظیم رمز عبور برای کاربران جدید (اختیاری) */}
          {authMode === "set_password" && (
            <form onSubmit={handleSetPassword}>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="new-password">
                      رمز عبور جدید (حداقل ۶ کاراکتر)
                    </FieldLabel>
                    <InputGroup dir="ltr" className="h-12">
                      <InputGroupAddon align="inline-start">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="text-left font-mono text-base"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={6}
                        autoFocus
                        required
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          tabIndex={-1}
                          aria-label={
                            showNewPassword
                              ? "مخفی کردن رمز عبور"
                              : "نمایش رمز عبور"
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      تکرار رمز عبور جدید
                    </FieldLabel>
                    <InputGroup dir="ltr" className="h-12">
                      <InputGroupAddon align="inline-start">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="confirm-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="text-left font-mono text-base"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                    </InputGroup>
                  </Field>
                </FieldGroup>

                <div className="pt-4">
                  <Separator />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ذخیره رمز عبور و ورود"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  className="w-full py-5 text-muted-foreground"
                  onClick={handleSkipPassword}
                >
                  بعداً پسورد ست می‌کنم
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </DotField>
    </div>
  )
}
