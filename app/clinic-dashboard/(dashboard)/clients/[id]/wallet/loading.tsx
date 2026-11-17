// app/clinic-dashboard/(dashboard)/clients/[id]/wallet/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientWalletLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}