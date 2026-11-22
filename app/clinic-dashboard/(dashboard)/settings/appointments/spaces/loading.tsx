// app/clinic-dashboard/(dashboard)/settings/appointments/spaces/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ClinicSpacesLoading() {
  return (
    <div className="space-y-6 p-4 md:p-0" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-60" />
          <Skeleton className="h-4 w-88" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <Skeleton className="h-12 w-full rounded-xl" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, colIdx) => (
          <div key={colIdx} className="space-y-3 rounded-2xl border p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}