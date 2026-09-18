/**
 * Claim is a per-card action, so it disables itself with an inline spinner
 * rather than blocking the page. Two hospitals pressing this at the same
 * moment is the point of the demo, and neither window should freeze.
 */

import { Check } from "lucide-react";
import { Button } from "../ui/Button";

interface ClaimButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  claimed?: boolean;
}

export function ClaimButton({ onClick, loading = false, disabled = false, claimed = false }: ClaimButtonProps) {
  if (claimed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-status-received-bg px-4 py-2 text-sm font-semibold text-status-received">
        <Check className="h-4 w-4" />
        Claimed
      </span>
    );
  }

  return (
    <Button onClick={onClick} loading={loading} disabled={disabled} size="md">
      {loading ? "Claiming…" : "Claim"}
    </Button>
  );
}
