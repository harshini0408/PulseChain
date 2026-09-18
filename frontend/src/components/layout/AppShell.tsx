import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { DemoToolbar } from "../ui/DemoToolbar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Persistent Sticky Demo Toolbar */}
      <DemoToolbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="relative flex w-64 flex-shrink-0">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-surface px-3 py-5 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
