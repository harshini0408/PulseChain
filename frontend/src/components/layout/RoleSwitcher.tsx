import { useAuth, type Role } from "../../auth/AuthProvider";

const ROLES: { value: Role; label: string }[] = [
  { value: "BLOOD_CENTRE", label: "Blood Centre" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "COORDINATOR", label: "Coordinator" },
];

interface RoleSwitcherProps {
  compact?: boolean;
}

export function RoleSwitcher({ compact = false }: RoleSwitcherProps) {
  const { role, loginAs } = useAuth();

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <span className="text-xs text-text-muted font-medium">Demo role:</span>
      )}
      <select
        id="role-switcher"
        value={role ?? "BLOOD_CENTRE"}
        onChange={(e) => loginAs(e.target.value as Role)}
        className="rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors cursor-pointer hover:border-text-muted"
        aria-label="Switch demo role"
      >
        {ROLES.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
