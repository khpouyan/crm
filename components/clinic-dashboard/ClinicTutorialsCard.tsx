"use client"
import Link from "next/link"
import { PlayCircle, ChevronLeft } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface TutorialItem {
  id: number | string
  title: string
  category: string
  href: string
}

export const defaultTutorialsList: TutorialItem[] = [
  { id: 1, title: "گزارش مراجعات", category: "گزارشات", href: "#" },
  { id: 2, title: "انبار کالا و خدمات", category: "انبار", href: "#" },
  { id: 3, title: "کمیسیون پرکیس", category: "کمیسیون", href: "#" },
]

export function ClinicTutorialsCard({
  tutorials = defaultTutorialsList,
  viewAllHref = "/clinic-dashboard/tutorials",
}: {
  tutorials?: TutorialItem[]
  viewAllHref?: string
}) {
  return (
    <Card
      className="flex h-full flex-col justify-between border-border/60 shadow-xs"
      dir="rtl"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <PlayCircle className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">آموزش‌ها</CardTitle>
            <CardDescription className="mt-0.5 text-[11px]">
              آخرین ویدیوهای آموزشی
            </CardDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={viewAllHref} />}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <span>مشاهده همه</span>
          <ChevronLeft className="size-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 space-y-2.5">
        {tutorials.map((tut) => (
          <Link
            key={tut.id}
            href={tut.href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 px-3.5 py-2.5 transition-all hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/15 dark:hover:bg-emerald-950/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs transition-transform group-hover:scale-105">
                <PlayCircle className="size-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground sm:text-sm">
                  {tut.title}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>{tut.category}</span>
                </div>
              </div>
            </div>
            <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
