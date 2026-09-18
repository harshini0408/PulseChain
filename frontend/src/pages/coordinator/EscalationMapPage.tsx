import { Map } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/ui";

export function EscalationMapPage() {
  return (
    <div>
      <PageHeader
        title="Escalation Map"
        subtitle="Live rescue escalations across the corridor network"
      />
      <EmptyState
        icon={<Map className="h-8 w-8" />}
        title="Network is quiet"
        message="No active escalations across the network. Units will appear here when they cross the rescue threshold."
      />
    </div>
  );
}
