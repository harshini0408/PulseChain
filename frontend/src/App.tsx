import React, { useState } from "react";
import { AuthProvider } from "./auth/context.js";
import { Sidebar, HeaderBar, type NavTab } from "./components/Navbar.js";
import { StockConsole } from "./pages/centre/StockConsole.js";
import { InboxPage } from "./pages/hospital/InboxPage.js";
import { RequisitionsPage } from "./pages/hospital/RequisitionsPage.js";
import { TransfersPage } from "./pages/transfers/TransfersPage.js";
import { EscalationMonitor } from "./pages/coordinator/EscalationMonitor.js";
import { ImpactPage } from "./pages/ImpactPage.js";

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>("stock");

  return (
    <div className="min-h-screen flex bg-[#f6f8fb] text-neutral-900 font-sans">
      {/* Left Stitch Dark Sidebar Rail */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <HeaderBar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Tab Canvas Content */}
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === "stock" && <StockConsole />}
          {activeTab === "offers" && <InboxPage />}
          {activeTab === "requisitions" && <RequisitionsPage />}
          {activeTab === "transfers" && <TransfersPage />}
          {activeTab === "escalations" && <EscalationMonitor />}
          {activeTab === "impact" && <ImpactPage />}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-neutral-200 py-4 mt-auto">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
            <div>
              PulseChain • Zero Blood Wastage &amp; Regional Redistribution Network
            </div>
            <div className="font-mono text-[11px] text-neutral-400">
              AWS EventBridge • Lambda • Step Functions • DynamoDB • Bedrock AI
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
