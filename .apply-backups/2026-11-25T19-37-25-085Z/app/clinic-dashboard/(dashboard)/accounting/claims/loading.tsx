// app/clinic-dashboard/(dashboard)/accounting/claims/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ClaimsLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}