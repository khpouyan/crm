//app/clinic-dashboard/page.tsx
import { PackagesAndModulesCard } from "@/components/clinic-dashboard/PackagesAndModulesCard"
import { ClinicStatCards } from "@/components/clinic-dashboard/ClinicStatCards"
import { ClinicAlertsCard } from "@/components/clinic-dashboard/ClinicAlertsCard"
import { ClinicTutorialsCard } from "@/components/clinic-dashboard/ClinicTutorialsCard"

export default function ClinicDashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6" dir="rtl">
      {/* عنوان و توضیح صفحه */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          داشبورد
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          خلاصه‌ای از وضعیت کلینیک شما
        </p>
      </div>

      {/* ردیف اول: باکس پکیج‌ها و ماژول‌ها */}
      <PackagesAndModulesCard />

      {/* ردیف دوم: ۴ کارت آماری (پرونده‌ها، سرویس‌ها، نوبت‌ها، پیام‌ها) */}
      <ClinicStatCards />

      {/* ردیف سوم: اعلان‌ها (۷ ستون) و آموزش‌ها (۵ ستون) در کنار هم */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7">
          <ClinicAlertsCard />
        </div>
        <div className="lg:col-span-5">
          <ClinicTutorialsCard />
        </div>
      </div>
    </div>
  )
}