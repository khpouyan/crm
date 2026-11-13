"use client"

import * as React from "react"
import Link from "next/link"
import {
  Package,
  HardDrive,
  MessageSquare,
  Bot,
  Percent,
  Headphones,
  Plus,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface PackageItem {
  id: string
  title: string
  statusText: string
  badgeText?: string
  colorClass: string
  iconBgClass: string
  icon: React.ElementType
  isActive: boolean
  actionHref: string
}

export const defaultPackagesList: PackageItem[] = [
  {
    id: "clinic",
    title: "کلینیک",
    statusText: "۸ روز مانده",
    badgeText: "رو به اتمام",
    colorClass: "border-amber-400/70 bg-amber-50/40 dark:bg-amber-950/15",
    iconBgClass: "bg-amber-500 text-white",
    icon: Package,
    isActive: true,
    actionHref: "/clinic-dashboard/packages/clinic",
  },
  {
    id: "sms",
    title: "پیامک",
    statusText: "۱ عدد مانده",
    colorClass: "border-border/70 bg-card",
    iconBgClass: "bg-emerald-500 text-white",
    icon: MessageSquare,
    isActive: true,
    actionHref: "/clinic-dashboard/packages/sms",
  },
  {
    id: "storage",
    title: "فضای ذخیره‌سازی",
    statusText: "۲ گیگابایت مانده",
    colorClass: "border-border/70 bg-card",
    iconBgClass: "bg-blue-500 text-white",
    icon: HardDrive,
    isActive: true,
    actionHref: "/clinic-dashboard/packages/storage",
  },
]

export const defaultModulesList: PackageItem[] = [
  {
    id: "ai-assistant",
    title: "دستیار هوشمند",
    statusText: "غیرفعال",
    colorClass: "border-border/70 bg-card",
    iconBgClass: "bg-amber-500 text-white",
    icon: Bot,
    isActive: false,
    actionHref: "/clinic-dashboard/modules/ai",
  },
  {
    id: "commission",
    title: "کمیسیون و پرکیس",
    statusText: "۲۰۲ روز مانده",
    colorClass: "border-border/70 bg-card",
    iconBgClass: "bg-amber-500 text-white",
    icon: Percent,
    isActive: true,
    actionHref: "/clinic-dashboard/modules/commission",
  },
  {
    id: "call-center",
    title: "کال سنتر",
    statusText: "غیرفعال",
    colorClass: "border-border/70 bg-card",
    iconBgClass: "bg-amber-500 text-white",
    icon: Headphones,
    isActive: false,
    actionHref: "/clinic-dashboard/modules/call-center",
  },
]

export interface PackagesAndModulesProps {
  packages?: PackageItem[]
  modules?: PackageItem[]
}

export function PackagesAndModulesCard({
  packages = defaultPackagesList,
  modules = defaultModulesList,
}: PackagesAndModulesProps) {
  return (
    <Card className="border-border/60 shadow-xs" dir="rtl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Package className="size-4" />
          </div>
          <CardTitle className="text-base font-bold">
            پکیج‌ها و ماژول‌ها
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ردیف پکیج‌های اصلی */}
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {packages.map((pkg) => {
            const Icon = pkg.icon
            return (
              <div
                key={pkg.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all hover:shadow-xs ${pkg.colorClass}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${pkg.iconBgClass}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {pkg.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {pkg.statusText}
                      </span>
                      {pkg.badgeText && (
                        <Badge
                          variant="secondary"
                          className="h-4 border-0 bg-amber-500 px-1.5 py-0 text-[10px] text-white hover:bg-amber-600"
                        >
                          {pkg.badgeText}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={pkg.actionHref} />}
                  className="h-8 shrink-0 gap-1 rounded-lg bg-background/80 px-2.5 text-xs hover:bg-background"
                >
                  <Plus className="size-3.5 text-muted-foreground" />
                  <span>ارتقا / خرید</span>
                </Button>
              </div>
            )
          })}
        </div>

        {/* زیربخش ماژول‌ها */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              ماژول‌ها
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {modules.map((mod) => {
              const Icon = mod.icon
              return (
                <div
                  key={mod.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all hover:shadow-xs ${mod.colorClass}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${mod.iconBgClass}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {mod.title}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {mod.isActive ? (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {mod.statusText}
                          </span>
                        ) : (
                          <span className="font-medium text-destructive">
                            {mod.statusText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={mod.actionHref} />}
                    className="h-8 shrink-0 gap-1 rounded-lg bg-background/80 px-2.5 text-xs hover:bg-background"
                  >
                    <Plus className="size-3.5 text-muted-foreground" />
                    <span>ارتقا / خرید</span>
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
