// app/clinic-dashboard/(dashboard)/accounting/settings/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountingSettingsLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-10 w-96 rounded-lg" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
