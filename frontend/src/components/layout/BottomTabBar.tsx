/**
 * Mobile and tablet navigation (<1024px), in the shape of the reference app
 * screens: a fixed bottom bar, icons over short labels, at most five items.
 */

import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { NAV_BY_ROLE } from "./nav";

export function BottomTabBar() {
  const { role } = useAuth();
  if (!role) return null;

  const items = NAV_BY_ROLE[role].slice(0, 5);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-surface-raised/95 backdrop-blur lg:hidden"
      aria-label="Main"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ to, icon: Icon, short }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/impact"}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition-colors",
                  isActive ? "text-accent" : "text-text-subtle hover:text-text-muted",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                      isActive ? "bg-accent-soft" : "",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {short}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
