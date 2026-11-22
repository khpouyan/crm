// app/clinic-dashboard/(dashboard)/calendar/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-4 p-4 md:p-0" dir="rtl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-10 w-80 rounded-lg" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}