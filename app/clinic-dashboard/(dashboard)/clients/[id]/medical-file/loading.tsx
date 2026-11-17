// app/clinic-dashboard/(dashboard)/clients/[id]/medical-file/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientMedicalFileLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}