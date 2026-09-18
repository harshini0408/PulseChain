import { useNavigate } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button } from "../components/ui";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-overlay text-text-muted">
        <SearchX className="h-10 w-10" />
      </div>
      <p className="text-6xl font-bold text-border mb-2">404</p>
      <h2 className="text-xl font-semibold text-text mb-2">Page not found</h2>
      <p className="max-w-sm text-sm text-text-muted mb-8">
        This route does not exist. Use the sidebar to navigate to a valid page.
      </p>
      <Button variant="secondary" onClick={() => navigate("/centre/stock")}>
        Back to Stock Console
      </Button>
    </div>
  );
}
