// app/clinic-dashboard/(dashboard)/settings/clinic-profile/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ClinicProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-0" dir="rtl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}