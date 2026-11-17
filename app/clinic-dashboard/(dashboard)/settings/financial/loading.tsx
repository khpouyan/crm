// app/clinic-dashboard/(dashboard)/settings/financial/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function FinancialSettingsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-80 rounded-lg" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}