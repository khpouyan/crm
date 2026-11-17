// app/clinic-dashboard/(dashboard)/clients/[id]/additional-info/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientAdditionalInfoLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}