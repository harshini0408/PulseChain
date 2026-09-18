import { FileText } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/ui";

export function RequisitionsPage() {
  return (
    <div>
      <PageHeader
        title="Requisitions"
        subtitle="Pending and fulfilled blood unit requests"
      />
      <EmptyState
        icon={<FileText className="h-8 w-8" />}
        title="No requisitions yet"
        message="Submit a requisition to request units from the network. The coordinator will match available stock."
      />
    </div>
  );
}
