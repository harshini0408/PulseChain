import { useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";
import { LANDING_PATHS, useAuth } from "../auth/AuthProvider";
import { Button, EmptyState } from "../components/ui";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const home = role ? LANDING_PATHS[role] : "/login";

  return (
    <EmptyState
      icon={<Compass className="h-6 w-6" />}
      title="There is nothing at this address"
      message="The link may be out of date, or the page may belong to a role this account does not hold. Your own console is one click away."
      action={
        <Button pill onClick={() => navigate(home, { replace: true })}>
          Back to your console
        </Button>
      }
    />
  );
}
