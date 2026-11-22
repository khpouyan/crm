// app/clinic-dashboard/(dashboard)/settings/appointments/working-hours/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkingHoursLoading() {
  return (
    <div className="space-y-6 p-4 md:p-0" dir="rtl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}