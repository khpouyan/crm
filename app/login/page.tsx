"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  sendOtpAction,
  verifyOtpAction,
  loginWithPasswordAction,
} from "@/app/actions/auth";
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
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"password" | "otp_phone" | "otp_verify">("password");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // تایمر ۲ دقیقه‌ای (۱۲۰ ثانیه)
  const [timeLeft, setTimeLeft] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // افکت شمارش معکوس
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (authMode === "otp_verify" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }

    return () => clearInterval(timer);
  }, [authMode, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ۱. ورود با کلمه عبور
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginWithPasswordAction(mobileNumber, password);
      if (res.success) {
        router.push("/clinic-dashboard");
        router.refresh();
      } else {
        setErrorMessage(res.error || "ورود ناموفق بود.");
      }
    } catch {
      setErrorMessage("خطایی در ارتباط با سرور رخ داد.");
    } finally {
      setIsLoading(false);
    }
  };

  // ۲. ارسال پیامک OTP و انتقال به مرحله کد تایید
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await sendOtpAction(mobileNumber);
      if (res.success) {
        setTimeLeft(120);
        setCanResend(false);
        setOtpCode("");
        setAuthMode("otp_verify");
      } else {
        setErrorMessage(res.error || "خطا در ارسال کد تایید.");
      }
    } catch {
      setErrorMessage("خطایی رخ داد. مجدداً تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  };

  // ۳. ارسال مجدد کد تایید
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await sendOtpAction(mobileNumber);
      if (res.success) {
        setTimeLeft(120);
        setCanResend(false);
        setOtpCode("");
      } else {
        setErrorMessage(res.error || "امکان ارسال مجدد کد وجود ندارد.");
      }
    } catch {
      setErrorMessage("خطا در ارسال کد مجدد.");
    } finally {
      setIsLoading(false);
    }
  };

  // ۴. بررسی صحت OTP و احراز هویت دیتابیس
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await verifyOtpAction(mobileNumber, otpCode);
      if (res.success) {
        router.push("/clinic-dashboard");
        router.refresh();
      } else {
        setErrorMessage(res.error || "کد وارد شده صحیح نمی‌باشد.");
      }
    } catch {
      setErrorMessage("خطایی در اعتبارسنجی رخ داد.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4" dir="rtl">
      <div className="absolute top-4 left-4 z-50">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md ring-4 ring-primary/10">
            <Sparkles className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <CardTitle className="text-xl font-bold tracking-tight">
              {authMode === "password" && "ورود به حساب کاربری"}
              {authMode === "otp_phone" && "ورود با رمز یک‌بار مصرف"}
              {authMode === "otp_verify" && "تأیید شماره موبایل"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              {authMode === "password" && "شماره موبایل و رمز عبور خود را وارد کنید"}
              {authMode === "otp_phone" && "کد یک‌بار مصرف به شماره همراه شما پیامک خواهد شد"}
              {authMode === "otp_verify" && `کد ۶ رقمی ارسال‌شده به ${mobileNumber || "شماره شما"} را وارد کنید`}
            </CardDescription>
          </div>
        </CardHeader>

        {/* نمایش پیام خطا در صورت وجود */}
        {errorMessage && (
          <div className="mx-6 mb-2 p-3 bg-destructive/15 text-destructive text-xs rounded-lg flex items-center gap-2 border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ۱. فرم ورود با کلمه عبور */}
        {authMode === "password" && (
          <form onSubmit={handlePasswordLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">شماره موبایل</Label>
                <div className="relative items-center">
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="text-left font-mono tracking-wider py-6 pl-9"
                    dir="ltr"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">رمز عبور</Label>
                  <Button variant="link" size="sm" type="button" className="px-0 h-auto text-xs text-muted-foreground">
                    فراموشی رمز؟
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-12 text-left pl-10 pr-11 font-mono text-base"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-2 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    <span className="sr-only">
                      {showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Separator />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2.5 pt-2">
              <Button type="submit" disabled={isLoading} className="w-full py-5">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ورود"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                className="w-full gap-2 py-5"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthMode("otp_phone");
                }}
              >
                <KeyRound className="h-4 w-4" />
                ورود با رمز یک‌بار مصرف
              </Button>
            </CardFooter>
          </form>
        )}

        {/* ۲. فرم دریافت شماره موبایل جهت ارسال OTP */}
        {authMode === "otp_phone" && (
          <form onSubmit={handleSendOtp}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-mobile">شماره موبایل</Label>
                <div className="relative">
                  <Input
                    id="otp-mobile"
                    type="tel"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="text-left font-mono tracking-wider py-6 pl-9"
                    dir="ltr"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    autoFocus
                    required
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="pt-2">
                <Separator />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2.5 pt-2">
              <Button type="submit" disabled={isLoading} className="w-full py-5">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ارسال کد تأیید"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isLoading}
                className="w-full gap-2 text-muted-foreground"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthMode("password");
                }}
              >
                <ArrowRight className="h-4 py-5 w-4" />
                ورود با نام کاربری و رمز عبور
              </Button>
            </CardFooter>
          </form>
        )}

        {/* ۳. مرحله ورود کد ۶ رقمی همراه با تایمر معکوس */}
        {authMode === "otp_verify" && (
          <form onSubmit={handleVerifyOtp}>
            <CardContent className="space-y-6 flex flex-col items-center">
              <div className="space-y-3 flex flex-col items-center w-full" dir="ltr">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(val) => setOtpCode(val)}
                  autoFocus
                >
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="rounded-md border h-11 w-11 text-center font-mono text-lg" />
                    <InputOTPSlot index={1} className="rounded-md border h-11 w-11 text-center font-mono text-lg" />
                    <InputOTPSlot index={2} className="rounded-md border h-11 w-11 text-center font-mono text-lg" />
                    <InputOTPSlot index={3} className="rounded-md border h-11 w-11 text-center font-mono text-lg" />
                    <InputOTPSlot index={4} className="rounded-md border h-11 w-11 text-center font-mono text-lg" />
                    <InputOTPSlot index={5} className="rounded-md border h-11 w-11 text-center font-mono text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex items-center justify-center text-xs text-muted-foreground w-full">
                {!canResend ? (
                  <div className="flex items-center gap-1.5 font-medium">
                    <Timer className="h-4 w-4 animate-pulse text-primary" />
                    <span>ارسال مجدد کد پس از</span>
                    <span className="font-mono text-foreground font-semibold" dir="ltr">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={isLoading}
                    className="gap-1.5 text-primary text-xs h-auto p-0"
                    onClick={handleResendOtp}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    ارسال مجدد کد تأیید
                  </Button>
                )}
              </div>

              <div className="w-full">
                <Separator />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2.5 pt-0">
              <Button type="submit" disabled={isLoading || otpCode.length < 6} className="w-full mt-4 py-5">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأیید و ورود"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isLoading}
                className="w-full text-xs py-5 text-muted-foreground"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthMode("otp_phone");
                }}
              >
                تغییر شماره همراه
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}