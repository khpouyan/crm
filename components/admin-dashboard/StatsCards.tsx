import React from "react";
import { Building2, Stethoscope, FileText, Ban, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface StatsData {
  activeClinics: number;
  activeOffices: number;
  totalRecords: number;
  inactiveCenters: number;
}

export function StatsCards({
  activeClinics = 142,
  activeOffices = 589,
  totalRecords = 1248900,
  inactiveCenters = 18,
}: Partial<StatsData>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
      {/* 1. کلینیک‌های فعال */}
      <Card className="border-border/60 shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">کلینیک‌های فعال</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{activeClinics.toLocaleString("fa-IR")}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-0 px-1.5 py-0 text-[10px] gap-0.5">
              <TrendingUp className="h-3 w-3 inline" />
              <span>+۸.۲٪</span>
            </Badge>
            <span>نسبت به ماه گذشته</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. مطب‌های فعال */}
      <Card className="border-border/60 shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">مطب‌های فعال</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Stethoscope className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{activeOffices.toLocaleString("fa-IR")}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-blue-600 bg-blue-500/10 border-0 px-1.5 py-0 text-[10px] gap-0.5">
              <TrendingUp className="h-3 w-3 inline" />
              <span>+۱۲ مورد</span>
            </Badge>
            <span>افزایش در این هفته</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. پرونده‌های ثبت‌شده */}
      <Card className="border-border/60 shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">پرونده‌های ثبت‌شده</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{totalRecords.toLocaleString("fa-IR")}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <span className="text-primary font-medium">+۲,۴۳۰</span>
            <span>پرونده در ۲۴ ساعت گذشته</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. مراکز غیرفعال */}
      <Card className="border-border/60 shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">مراکز غیرفعال</CardTitle>
          <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
            <Ban className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-destructive">{inactiveCenters.toLocaleString("fa-IR")}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-destructive bg-destructive/10 border-0 px-1.5 py-0 text-[10px] gap-0.5">
              <TrendingDown className="h-3 w-3 inline" />
              <span>نیاز به بررسی</span>
            </Badge>
            <span>انقضای لایسنس یا عدم اتصال</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
