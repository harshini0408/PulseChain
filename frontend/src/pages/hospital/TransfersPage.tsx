import { Truck } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/ui";

export function TransfersPage() {
  return (
    <div>
      <PageHeader
        title="Transfers"
        subtitle="Units claimed and currently in transit"
      />
      <EmptyState
        icon={<Truck className="h-8 w-8" />}
        title="No active transfers"
        message="When you claim a unit it will appear here while in transit, and move to received once confirmed."
      />
    </div>
  );
}
