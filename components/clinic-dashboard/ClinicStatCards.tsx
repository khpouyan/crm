"use client"

import * as React from "react"
import {
  FolderOpen,
  Activity,
  CalendarDays,
  MessageCircle,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface StatItem {
  id: string
  title: string
  icon: React.ElementType
  cardBg: string
  iconBg: string
  dotColor: string
  countColor: string
  rows: { label: string; value: string }[]
}

export const defaultClinicStats: StatItem[] = [
  {
    id: "records",
    title: "پرونده‌ها",
    icon: FolderOpen,
    cardBg: "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40",
    iconBg: "bg-blue-500 text-white",
    dotColor: "bg-blue-500",
    countColor: "text-blue-600 dark:text-blue-400",
    rows: [
      { label: "دیروز", value: "۶" },
      { label: "امروز", value: "۲" },
    ],
  },
  {
    id: "services",
    title: "سرویس‌ها",
    icon: Activity,
    cardBg: "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40",
    iconBg: "bg-emerald-500 text-white",
    dotColor: "bg-emerald-500",
    countColor: "text-emerald-600 dark:text-emerald-400",
    rows: [
      { label: "دیروز", value: "۳۴" },
      { label: "امروز", value: "۱۲" },
    ],
  },
  {
    id: "appointments",
    title: "نوبت‌ها",
    icon: CalendarDays,
    cardBg: "bg-purple-50/70 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/40",
    iconBg: "bg-purple-500 text-white",
    dotColor: "bg-purple-500",
    countColor: "text-purple-600 dark:text-purple-400",
    rows: [
      { label: "امروز", value: "۱۸" },
      { label: "فردا", value: "۲۵" },
    ],
  },
  {
    id: "messages",
    title: "پیام‌ها",
    icon: MessageCircle,
    cardBg: "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40",
    iconBg: "bg-amber-500 text-white",
    dotColor: "bg-amber-500",
    countColor: "text-amber-600 dark:text-amber-400",
    rows: [
      { label: "دیروز", value: "۹" },
      { label: "امروز", value: "۴" },
    ],
  },
]

export function ClinicStatCards({ stats = defaultClinicStats }: { stats?: StatItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.id} className={`border shadow-xs transition-all hover:shadow-sm ${stat.cardBg}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
              <CardTitle className="text-sm font-bold text-foreground">
                {stat.title}
              </CardTitle>
              <div className={`flex size-9 items-center justify-center rounded-xl shadow-xs ${stat.iconBg}`}>
                <Icon className="size-4" />
              </div>
            </CardHeader>

            <CardContent className="space-y-2.5">
              {stat.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl bg-background/90 dark:bg-background/60 px-3.5 py-2.5 border border-border/40 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${stat.dotColor}`} />
                    <span className="text-xs font-medium text-muted-foreground">
                      {row.label}
                    </span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${stat.countColor}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
