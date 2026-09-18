import { Zap } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/ui";

export function ParseRequestPage() {
  return (
    <div>
      <PageHeader
        title="Parse Request"
        subtitle="AI-assisted requisition parsing from free text"
      />
      <EmptyState
        icon={<Zap className="h-8 w-8" />}
        title="Ready to parse"
        message="Paste a clinical requisition in natural language and the AI will extract component, blood group, quantity and urgency."
      />
    </div>
  );
}
