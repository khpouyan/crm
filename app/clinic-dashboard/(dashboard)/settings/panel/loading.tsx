// app/clinic-dashboard/(dashboard)/settings/panel/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function PanelSettingsLoading() {
  return (
    <div className="space-y-5 p-4 md:p-0" dir="rtl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-full max-w-2xl rounded-lg" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
