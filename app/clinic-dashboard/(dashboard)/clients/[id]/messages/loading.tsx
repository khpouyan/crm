import { Skeleton } from "@/components/ui/skeleton";

export default function ClientMessagesLoading() {
  return (
    <div className="p-4 md:p-6">
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}