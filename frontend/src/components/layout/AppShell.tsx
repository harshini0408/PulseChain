import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomTabBar } from "./BottomTabBar";
import { DemoToolbar } from "../ui/DemoToolbar";

/**
 * Desktop: fixed sidebar beside a scrolling column.
 * Below 1024px: no sidebar, a fixed bottom tab bar, and bottom padding on the
 * scroll container so the last row of content is never trapped under it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden bg-surface">
      <div className="hidden flex-shrink-0 lg:flex">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <BottomTabBar />
      <DemoToolbar />
    </div>
  );
}
