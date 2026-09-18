import { Droplets } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/ui";

export function StockConsolePage() {
  return (
    <div>
      <PageHeader
        title="Stock Console"
        subtitle="Platelet, RBC and plasma units across this facility"
      />
      <EmptyState
        icon={<Droplets className="h-8 w-8" />}
        title="All clear"
        message="No units in the alert window — all platelet stock is outside its 48-hour clock."
      />
    </div>
  );
}
