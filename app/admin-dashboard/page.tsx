import { StatsCards } from "@/components/admin-dashboard/StatsCards";
import { ServerStatusCard } from "@/components/admin-dashboard/ServerStatusCard";
import { SmsPanelCard } from "@/components/admin-dashboard/SmsPanelCard";
import { CloudStorageCard } from "@/components/admin-dashboard/CloudStorageCard";
import { ClinicsDistributionCard } from "@/components/admin-dashboard/ClinicsDistributionCard";
import { TicketsStatusCard } from "@/components/admin-dashboard/TicketsStatusCard";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <StatsCards />
      <ServerStatusCard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SmsPanelCard />
        <CloudStorageCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ClinicsDistributionCard />
        <TicketsStatusCard />
      </div>
    </div>
  )
}