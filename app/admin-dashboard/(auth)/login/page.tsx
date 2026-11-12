// app/admin-dashboard/login/page.tsx
"use client";

import React, { useState } from "react";
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
import {
  Lock,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { loginSuperAdminAction } from "@/app/actions/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginSuperAdminAction(mobileNumber, password);
      if (res.success) {
        router.push("/admin-dashboard");
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4" dir="rtl">
      <div className="absolute top-4 left-4 z-50">
        <ModeToggle />
      </div>

      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="space-y-4 text-center pb-6">
          {/* آیکون امنیتی سوپرادمین */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-md ring-4 ring-zinc-500/10">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <CardTitle className="text-xl font-bold tracking-tight">
              ورود به پنل مدیریت کل
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              ورود اختصاصی مدیران ارشد سامانه
            </CardDescription>
          </div>
        </CardHeader>

        {errorMessage && (
          <div className="mx-6 mb-2 p-3 bg-destructive/15 text-destructive text-xs rounded-lg flex items-center gap-2 border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* فیلد نام کاربری / شماره موبایل */}
            <div className="space-y-2">
              <Label htmlFor="admin-mobile">شماره موبایل یا شناسه ادمین</Label>
              <div className="relative items-center">
                <Input
                  id="admin-mobile"
                  type="tel"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  className="text-left font-mono tracking-wider py-6 pl-9"
                  dir="ltr"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  autoComplete="username"
                  required
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* فیلد پسورد */}
            <div className="space-y-2">
              <Label htmlFor="admin-password">رمز عبور امنیتی</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 text-left pl-10 pr-11 font-mono text-base"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
          </CardContent>

          <CardFooter className="pt-2 mt-5">
            <Button
              type="submit"
              disabled={isLoading || !mobileNumber || !password}
              className="w-full py-5 text-sm font-semibold"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ورود به کنترل‌پنل"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}