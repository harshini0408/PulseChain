import { Inbox } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/ui";

export function OfferInboxPage() {
  return (
    <div>
      <PageHeader
        title="Offer Inbox"
        subtitle="Nearby expiring units matched to your facility"
      />
      <EmptyState
        icon={<Inbox className="h-8 w-8" />}
        title="No offers right now"
        message="You'll see nearby expiring units that match your needs here. Check back when the next sweep runs."
      />
    </div>
  );
}
