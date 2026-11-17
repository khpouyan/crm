import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDetailReportLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}