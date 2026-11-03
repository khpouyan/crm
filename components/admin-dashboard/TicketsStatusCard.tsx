"use client";

import React, { useState } from "react";
import { LifeBuoy, Clock, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface TicketItem {
  id: string;
  subject: string;
  clinic: string;
  priority: "high" | "medium" | "low";
  status: "open" | "in_progress" | "resolved";
  time: string;
}

const defaultTickets: TicketItem[] = [
  {
    id: "TCK-1092",
    subject: "خطا در استعلام وب‌سرویس بیمه سلامت",
    clinic: "کلینیک تخصصی مهرگان",
    priority: "high",
    status: "open",
    time: "۱۰ دقیقه پیش",
  },
  {
    id: "TCK-1088",
    subject: "درخواست اتصال دستگاه کارتخوان PAX به سیستم",
    clinic: "مطب دکتر کیانی",
    priority: "medium",
    status: "in_progress",
    time: "۴۵ دقیقه پیش",
  },
  {
    id: "TCK-1085",
    subject: "عدم ارسال پیامک یادآوری نوبت برای ۲ بیمار",
    clinic: "مرکز پوست و مو آراسته",
    priority: "high",
    status: "in_progress",
    time: "۲ ساعت پیش",
  },
  {
    id: "TCK-1079",
    subject: "تنظیم مجدد تقویم شیفت پزشکان برای ماه آینده",
    clinic: "درمانگاه شبانه‌روزی رازی",
    priority: "low",
    status: "resolved",
    time: "دیروز",
  },
];

export function TicketsStatusCard({ tickets = defaultTickets }: { tickets?: TicketItem[] }) {
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const filteredTickets = tickets.filter((t) => {
    if (filter === "open") return t.status === "open" || t.status === "in_progress";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  return (
    <Card className="border-border/60 shadow-sm flex flex-col h-full" dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-primary" />
              وضعیت تیکت‌های پشتیبانی مراکز
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">رسیدگی به درخواست‌های فنی و اتصال پزشکان</CardDescription>
          </div>
          <div className="flex gap-1 bg-muted p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === "all" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              همه
            </button>
            <button
              onClick={() => setFilter("open")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === "open" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              در دست اقدام
            </button>
            <button
              onClick={() => setFilter("resolved")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === "resolved" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              بسته شده
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 flex-1 overflow-auto">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">{ticket.id}</span>
                <span className="font-semibold text-foreground truncate">{ticket.subject}</span>
                {ticket.priority === "high" && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4">
                    فوری
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                <span>{ticket.clinic}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {ticket.time}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 border-0 ${
                  ticket.status === "open"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : ticket.status === "in_progress"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {ticket.status === "open"
                  ? "جدید"
                  : ticket.status === "in_progress"
                  ? "در حال بررسی"
                  : "انجام شده"}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
