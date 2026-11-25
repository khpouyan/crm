// app/clinic-dashboard/(dashboard)/accounting/settings/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountingSettingsLoading() {
  return (
    <div className="space-y-5" dir="rtl">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
