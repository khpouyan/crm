"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface AlertItem {
  id: number | string
  text: string
  href: string
}

export const defaultAlertsList: AlertItem[] = [
  {
    id: 1,
    text: "تعداد کالای آنزیم هیالاز کمتر از حد مجاز است.",
    href: "/clinic-dashboard/inventory",
  },
  {
    id: 2,
    text: "تعداد کالای زیتروپتال کمتر از حد مجاز است.",
    href: "/clinic-dashboard/inventory",
  },
  {
    id: 3,
    text: "تعداد کالای استایلوکس زیر چشم کمتر از حد مجاز است.",
    href: "/clinic-dashboard/inventory",
  },
]

export function ClinicAlertsCard({
  alerts = defaultAlertsList,
  viewAllHref = "/clinic-dashboard/notifications",
}: {
  alerts?: AlertItem[]
  viewAllHref?: string
}) {
  return (
    <Card
      className="flex h-full flex-col justify-between border-border/60 shadow-xs"
      dir="rtl"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs">
            <AlertTriangle className="size-4" />
          </div>
          <CardTitle className="text-base font-bold">اعلان‌ها</CardTitle>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={viewAllHref} />}
          className="h-7 rounded-lg bg-rose-600 px-3 text-xs text-white hover:bg-rose-700"
        >
          مشاهده همه
        </Button>
      </CardHeader>

      <CardContent className="flex-1 space-y-2.5">
        {alerts.map((alert) => (
          <Link
            key={alert.id}
            href={alert.href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-rose-200/80 bg-rose-50/40 px-3.5 py-3 transition-colors hover:bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/15 dark:hover:bg-rose-950/30"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
                <CheckCircle2 className="size-3.5" />
              </span>
              <span className="text-xs font-medium text-foreground transition-colors group-hover:text-rose-700 sm:text-sm dark:group-hover:text-rose-300">
                {alert.text}
              </span>
            </div>
            <span className="size-1.5 shrink-0 rounded-full bg-rose-500" />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
