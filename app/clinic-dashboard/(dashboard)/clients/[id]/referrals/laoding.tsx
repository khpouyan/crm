import { Skeleton } from "@/components/ui/skeleton";

export default function ClientReferralsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}