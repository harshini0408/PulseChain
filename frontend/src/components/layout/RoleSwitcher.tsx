import { useRole, type AppRole } from "../../context/RoleContext";

const ROLES: { value: AppRole; label: string }[] = [
  { value: "BLOOD_CENTRE", label: "Blood Centre" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "COORDINATOR", label: "Coordinator" },
  { value: "DONOR", label: "Donor" },
  { value: "COMMUNITY_COORDINATOR", label: "Community Coordinator" },
];

interface RoleSwitcherProps {
  compact?: boolean;
}

export function RoleSwitcher({ compact = false }: RoleSwitcherProps) {
  const { role, setRole } = useRole();

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <span className="text-xs text-text-muted font-medium">Demo role:</span>
      )}
      <select
        id="role-switcher"
        value={role}
        onChange={(e) => setRole(e.target.value as AppRole)}
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
