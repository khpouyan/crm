// app/clinic-dashboard/(dashboard)/accounting/commission/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function CommissionLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
