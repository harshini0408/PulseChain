import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { StockConsolePage } from "./pages/centre/StockConsolePage";
import { OfferInboxPage } from "./pages/hospital/OfferInboxPage";
import { RequisitionsPage } from "./pages/hospital/RequisitionsPage";
import { TransfersPage } from "./pages/hospital/TransfersPage";
import { EscalationMapPage } from "./pages/coordinator/EscalationMapPage";
import { ParseRequestPage } from "./pages/coordinator/ParseRequestPage";
import { ImpactPage } from "./pages/ImpactPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { DonorRegisterPage } from "./pages/donor/DonorRegisterPage";
import { DonorDashboardPage } from "./pages/donor/DonorDashboardPage";
import { CommunityRegisterPage } from "./pages/community/CommunityRegisterPage";
import { CommunityConsolePage } from "./pages/community/CommunityConsolePage";
import { CommunityRequisitionPage } from "./pages/hospital/CommunityRequisitionPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <AppShell>
            <Routes>
              <Route index element={<Navigate to="/centre/stock" replace />} />
              <Route path="centre/stock" element={<StockConsolePage />} />
              <Route path="hospital/inbox" element={<OfferInboxPage />} />
              <Route path="hospital/requisitions" element={<RequisitionsPage />} />
              <Route path="hospital/transfers" element={<TransfersPage />} />
              <Route path="coordinator/escalations" element={<EscalationMapPage />} />
              <Route path="coordinator/parse" element={<ParseRequestPage />} />
              <Route path="donor/register" element={<DonorRegisterPage />} />
              <Route path="donor/dashboard" element={<DonorDashboardPage />} />
              <Route path="community/register" element={<CommunityRegisterPage />} />
              <Route path="community/console" element={<CommunityConsolePage />} />
              <Route path="community/:id" element={<CommunityConsolePage />} />
              <Route path="request/donor" element={<CommunityRequisitionPage />} />
              <Route path="impact" element={<ImpactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}
