"use client";
import { getAccountInfo } from "@/lib/kavenegar/kavenegar-account";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TomanIcon } from "@/components/ui/toman-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShieldCheck, Wallet } from "lucide-react";

export default async function SmsPanelPage() {
  let accountData = null;
  let errorMessage: string | null = null;

  try {
    const response = await getAccountInfo();
    accountData = response.entries;
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "خطای ناشناخته در دریافت اطلاعات حساب کاوه‌نگار";
  }

  // تبدیل ریال به تومان و فرمت‌دهی با اعداد فارسی
  const remainCreditToman = accountData
    ? Math.floor(accountData.remaincredit / 10).toLocaleString("fa-IR")
    : "۰";

  const remainCreditRial = accountData
    ? accountData.remaincredit.toLocaleString("fa-IR")
    : "۰";

  // تبدیل Unix Timestamp به تاریخ شمسی خوانا
  const formattedExpireDate = accountData
    ? new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(accountData.expiredate * 1000))
    : "-";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {errorMessage ? (
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="size-4" />
          <AlertTitle>خطا در دریافت اطلاعات</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        accountData && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="w-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="size-5 text-primary" />
                    <span>اعتبار حساب پیامکی</span>
                  </CardTitle>
                  <CardDescription>
                    موجودی قابل استفاده برای ارسال پیامک
                  </CardDescription>
                </div>

                <Badge
                  variant={
                    accountData.type === "master" ? "default" : "secondary"
                  }
                >
                  {accountData.type === "master"
                    ? "حساب اصلی (Master)"
                    : "حساب زیرمجموعه (Child)"}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4 pt-2">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <span className="text-xs text-muted-foreground">
                    اعتبار باقی‌مانده
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                      {remainCreditToman}
                    </span>
                    <TomanIcon className="size-5 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    معادل {remainCreditRial} ریال
                  </p>
                </div>
              </CardContent>

              <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
                <div className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-muted-foreground" />
                    تاریخ انقضای امنیتی:
                  </span>
                  <span className="font-medium text-foreground">
                    {formattedExpireDate}
                  </span>
                </div>
              </CardFooter>
            </Card>
          </div>
        )
      )}
    </div>
  );
}