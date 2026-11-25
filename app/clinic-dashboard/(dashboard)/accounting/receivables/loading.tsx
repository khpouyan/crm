// app/clinic-dashboard/(dashboard)/accounting/receivables/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ReceivablesLoading() {
  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
