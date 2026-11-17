// app/clinic-dashboard/(dashboard)/clients/[id]/financial-records/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientFinancialRecordsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}