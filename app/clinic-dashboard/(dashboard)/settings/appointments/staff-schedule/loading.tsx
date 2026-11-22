// app/clinic-dashboard/(dashboard)/settings/appointments/staff-schedule/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function StaffScheduleLoading() {
  return (
    <div className="space-y-6 p-4 md:p-0" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>

      <Skeleton className="h-11 w-80 rounded-xl" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-2xl" />
      </div>
    </div>
  );
}