import { Menu, Droplets } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface-raised px-4 lg:hidden">
      <div className="flex items-center gap-3">
        <button
          id="sidebar-toggle"
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
            <Droplets className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-sm font-semibold text-text">PulseChain</span>
        </div>
      </div>
      <RoleSwitcher compact />
    </header>
  );
}
