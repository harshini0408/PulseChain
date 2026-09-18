import { BarChart2 } from "lucide-react";
import { PageHeader, Card, Badge, Spinner, ErrorState } from "../components/ui";
import { StatTile } from "../components/dashboard/StatTile";
import { useFacilities } from "../api/hooks";

const FACILITY_TYPE_VARIANT: Record<string, "blood-centre" | "hospital"> = {
  BLOOD_CENTRE: "blood-centre",
  HOSPITAL: "hospital",
};

const FACILITY_TYPE_LABEL: Record<string, string> = {
  BLOOD_CENTRE: "Blood Centre",
  HOSPITAL: "Hospital",
};

export function ImpactPage() {
  const { data: facilities, isLoading, isError, refetch, error } = useFacilities();

  return (
    <div>
      <PageHeader
        title="Network Impact"
        subtitle="Cumulative outcomes across the PulseChain rescue network"
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        <StatTile label="Units saved" value="-" unit="units" />
        <StatTile label="Units lost" value="-" unit="units" accent />
        <StatTile label="Value saved" value="-" unit="INR" />
        <StatTile label="Active rescues" value="-" />
      </div>

      {/* Network facilities */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="h-4 w-4 text-text-muted" />
          <h2 className="text-sm font-semibold text-text">Network Facilities</h2>
          {facilities && (
            <span className="ml-auto text-xs text-text-muted">{facilities.length} facilities</span>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
          </div>
        )}

        {isError && (
          <ErrorState
            message={error?.message ?? "Failed to load facilities from the network."}
            onRetry={() => void refetch()}
          />
        )}

        {facilities && facilities.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">No facilities found.</p>
        )}

        {facilities && facilities.length > 0 && (
          <ul className="divide-y divide-border">
            {facilities.map((f) => (
              <li key={f.facilityId} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{f.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{f.city}</p>
                </div>
                <Badge variant={FACILITY_TYPE_VARIANT[f.type] ?? "default"}>
                  {FACILITY_TYPE_LABEL[f.type] ?? f.type}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
