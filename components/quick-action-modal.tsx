"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface QuickActionModalProps {
  /** عنوان بالای مودال (مثلاً: نوبت جدید، ثبت هزینه و...) */
  title: string
  /** محتوای فرم یا هر منطق دلخواه */
  children: React.ReactNode
  /** وضعیت باز بودن مودال (اختیاری - برای کنترل از بیرون مثل بستن بعد از Submit) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** کلاس سفارشی برای عرض مودال (پیش‌فرض: max-w-3xl مشابه تصویر) */
  contentClassName?: string
  /** آیکون سفارشی برای دکمه شناور (پیش‌فرض: Plus) */
  triggerIcon?: React.ReactNode
  /** متن راهنما برای دسترسی‌پذیری (Screen Readers) */
  triggerLabel?: string
}

export function QuickActionModal({
  title,
  children,
  open,
  onOpenChange,
  contentClassName,
  triggerIcon,
  triggerLabel = "افزودن مورد جدید",
}: QuickActionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* دکمه شناور پایین سمت چپ (FAB) */}
      <DialogTrigger
        render={
          <Button
            size="icon"
            aria-label={triggerLabel}
            className={cn(
              "fixed bottom-6 left-6 z-40 size-12 rounded-full",
              "bg-[#2557D6] text-white shadow-lg shadow-blue-900/20",
              "transition-transform duration-200 hover:scale-105 hover:bg-[#1e48b5] active:scale-95"
            )}
          >
            {triggerIcon ?? <Plus className="size-5 stroke-[2.5]" />}
          </Button>
        }
      />

      {/* بدنه مودال */}
      <DialogContent
        showCloseButton={false}
        dir="rtl"
        className={cn(
          "w-[95vw] max-w-3xl gap-0 overflow-hidden rounded-3xl border-0 bg-background p-0 shadow-2xl",
          contentClassName
        )}
      >
        {/* هدر مودال: عنوان در وسط و دکمه بستن در سمت چپ */}
        <DialogHeader className="relative flex flex-row items-center justify-center border-b border-border/40 px-6 py-5">
          <DialogTitle className="text-center text-base font-bold text-foreground">
            {title}
          </DialogTitle>

          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="بستن"
                className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            }
          />
        </DialogHeader>

        {/* محفظه خالی برای قرار دادن انواع فرم‌ها */}
        <div className="max-h-[85vh] overflow-y-auto p-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}