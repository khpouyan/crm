import React from "react";
import { MessageSquare, Send, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface SmsPanelProps {
  remainingCredits?: number;
  totalLimit?: number;
  todaySent?: number;
  deliveryRate?: number;
  onRecharge?: () => void;
}

export function SmsPanelCard({
  remainingCredits = 48250,
  totalLimit = 60000,
  todaySent = 1840,
  deliveryRate = 98.6,
  onRecharge,
}: SmsPanelProps) {
  const percentage = Math.round((remainingCredits / totalLimit) * 100);

  return (
    <Card className="border-border/60 shadow-sm flex flex-col justify-between" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            پنل پیامک و اطلاع‌رسانی نوبت‌ها
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">خط خدماتی و وب‌سرویس OTP نوبت‌دهی</CardDescription>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-0 text-xs">
          خط خدماتی فعال
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {remainingCredits.toLocaleString("fa-IR")}
              <span className="text-xs font-normal text-muted-foreground mr-1.5">عدد پیامک</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              اعتبار بسته دوره جاری از سقف {totalLimit.toLocaleString("fa-IR")} پیامک
            </p>
          </div>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{percentage}٪ مانده</span>
        </div>

        <div className="space-y-1">
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
          <div className="p-2.5 rounded-md bg-muted/40 border border-border/50">
            <div className="text-muted-foreground">ارسال شده امروز</div>
            <div className="text-base font-semibold mt-1 text-foreground flex items-center gap-1">
              <Send className="h-3.5 w-3.5 text-blue-500" />
              {todaySent.toLocaleString("fa-IR")} پیامک
            </div>
          </div>
          <div className="p-2.5 rounded-md bg-muted/40 border border-border/50">
            <div className="text-muted-foreground">نرخ دلیوری موفق</div>
            <div className="text-base font-semibold mt-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {deliveryRate}٪
            </div>
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <Button onClick={onRecharge} size="sm" className="w-full text-xs font-medium">
            افزایش موجودی پیامک
          </Button>
          <Button variant="outline" size="sm" className="px-2.5" title="بروزرسانی وضعیت خطوط">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
