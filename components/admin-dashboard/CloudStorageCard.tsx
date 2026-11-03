import React from "react";
import { HardDrive, Database, Image as ImageIcon, Archive, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export interface StorageProps {
  usedTB?: number;
  totalTB?: number;
  imagesGB?: number;
  docsGB?: number;
  backupsGB?: number;
}

export function CloudStorageCard({
  usedTB = 5.2,
  totalTB = 8.0,
  imagesGB = 3450,
  docsGB = 1120,
  backupsGB = 630,
}: StorageProps) {
  const percentUsed = Math.round((usedTB / totalTB) * 100);

  return (
    <Card className="border-border/60 shadow-sm flex flex-col justify-between" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-purple-500" />
            فضای اشغال‌شده سرور ذخیره‌ساز ابری
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">پایگاه داده اسناد پزشکی، تصاویر بالینی و PACS</CardDescription>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
          S3 Compatible
        </span>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {usedTB} <span className="text-xs font-normal text-muted-foreground">از {totalTB} ترابایت</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(totalTB - usedTB).toFixed(1)} ترابایت فضای خالی باقیمانده است
            </p>
          </div>
          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{percentUsed}٪ پر</span>
        </div>

        <div className="space-y-1">
          <Progress value={percentUsed} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
          <div className="p-2.5 rounded-md bg-muted/40 border border-border/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <ImageIcon className="h-3 w-3 text-purple-500" />
              <span>تصاویر پزشکی</span>
            </div>
            <div className="font-bold text-foreground">{(imagesGB / 1024).toFixed(1)} TB</div>
          </div>

          <div className="p-2.5 rounded-md bg-muted/40 border border-border/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Database className="h-3 w-3 text-blue-500" />
              <span>اسناد و PDF</span>
            </div>
            <div className="font-bold text-foreground">{(docsGB / 1024).toFixed(1)} TB</div>
          </div>

          <div className="p-2.5 rounded-md bg-muted/40 border border-border/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Archive className="h-3 w-3 text-amber-500" />
              <span>بک‌آپ‌ها</span>
            </div>
            <div className="font-bold text-foreground">{(backupsGB / 1024).toFixed(1)} TB</div>
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <Button variant="outline" size="sm" className="w-full text-xs font-medium justify-center gap-1">
            <span>مدیریت منابع و ارتقای دیسک</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
