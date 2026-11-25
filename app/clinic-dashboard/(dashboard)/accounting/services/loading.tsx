// app/clinic-dashboard/(dashboard)/accounting/services/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountingServicesLoading() {
  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
