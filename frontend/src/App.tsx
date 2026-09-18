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
import { RequireRole } from "./auth/RequireRole";
import { useAuth } from "./auth/AuthProvider";
import { DonorRegisterPage } from "./pages/donor/DonorRegisterPage";
import { DonorDashboardPage } from "./pages/donor/DonorDashboardPage";
import { CommunityRegisterPage } from "./pages/community/CommunityRegisterPage";
import { CommunityConsolePage } from "./pages/community/CommunityConsolePage";
import { CommunityRequisitionPage } from "./pages/hospital/CommunityRequisitionPage";

function RootRedirect() {
  const { role } = useAuth();
  const target =
    role === "HOSPITAL"
      ? "/hospital/inbox"
      : role === "COORDINATOR"
      ? "/coordinator/escalations"
      : role === "COMMUNITY_COORDINATOR"
      ? "/community/console"
      : role === "DONOR"
      ? "/donor/dashboard"
      : "/centre/stock";
  return <Navigate to={target} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <AppShell>
            <Routes>
              <Route index element={<RootRedirect />} />

              {/* Blood Centre Routes */}
              <Route
                path="centre/stock"
                element={
                  <RequireRole allowedRoles={["BLOOD_CENTRE"]}>
                    <StockConsolePage />
                  </RequireRole>
                }
              />

              {/* Hospital Routes */}
              <Route
                path="hospital/inbox"
                element={
                  <RequireRole allowedRoles={["HOSPITAL"]}>
                    <OfferInboxPage />
                  </RequireRole>
                }
              />
              <Route
                path="hospital/requisitions"
                element={
                  <RequireRole allowedRoles={["HOSPITAL"]}>
                    <RequisitionsPage />
                  </RequireRole>
                }
              />
              <Route
                path="hospital/transfers"
                element={
                  <RequireRole allowedRoles={["HOSPITAL"]}>
                    <TransfersPage />
                  </RequireRole>
                }
              />

              {/* Coordinator Routes */}
              <Route
                path="coordinator/escalations"
                element={
                  <RequireRole allowedRoles={["COORDINATOR"]}>
                    <EscalationMapPage />
                  </RequireRole>
                }
              />
              <Route
                path="coordinator/parse"
                element={
                  <RequireRole allowedRoles={["COORDINATOR"]}>
                    <ParseRequestPage />
                  </RequireRole>
                }
              />

              {/* Donor Routes */}
              <Route path="donor/register" element={<DonorRegisterPage />} />
              <Route
                path="donor/dashboard"
                element={
                  <RequireRole allowedRoles={["DONOR"]}>
                    <DonorDashboardPage />
                  </RequireRole>
                }
              />

              {/* Community Routes */}
              <Route path="community/register" element={<CommunityRegisterPage />} />
              <Route
                path="community/console"
                element={
                  <RequireRole allowedRoles={["COMMUNITY_COORDINATOR"]}>
                    <CommunityConsolePage />
                  </RequireRole>
                }
              />
              <Route
                path="community/:id"
                element={
                  <RequireRole allowedRoles={["COMMUNITY_COORDINATOR"]}>
                    <CommunityConsolePage />
                  </RequireRole>
                }
              />
              <Route
                path="request/donor"
                element={
                  <RequireRole allowedRoles={["HOSPITAL"]}>
                    <CommunityRequisitionPage />
                  </RequireRole>
                }
              />

              {/* Shared / Public Route */}
              <Route path="impact" element={<ImpactPage />} />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}
