// app/clinic-dashboard/(dashboard)/accounting/claims/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ClaimsLoading() {
  return (
    <div className="space-y-5" dir="rtl">
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
