import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireRole } from "./auth/RequireRole";
import { LANDING_PATHS, useAuth } from "./auth/AuthProvider";

import { LoginPage } from "./pages/LoginPage";
import { ImpactPage } from "./pages/ImpactPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { StockConsolePage } from "./pages/centre/StockConsolePage";
import { UnitDetailPage } from "./pages/centre/UnitDetailPage";
import { OfferInboxPage } from "./pages/hospital/OfferInboxPage";
import { RequisitionsPage } from "./pages/hospital/RequisitionsPage";
import { TransfersPage } from "./pages/hospital/TransfersPage";
import { EscalationMapPage } from "./pages/coordinator/EscalationMapPage";
import { ParseRequestPage } from "./pages/coordinator/ParseRequestPage";
import { PoolsPage } from "./pages/coordinator/PoolsPage";

/** "/" sends each role to the console it actually works in. */
function RootRedirect() {
  const { role } = useAuth();
  return <Navigate to={role ? LANDING_PATHS[role] : "/login"} replace />;
}

/**
 * Everything except /login lives inside this layout: authenticated first,
 * then the shell, then the role gate on the individual route.
 */
function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<RootRedirect />} />

        {/* Blood centre */}
        <Route
          path="/centre/stock"
          element={
            <RequireRole allowedRoles={["BLOOD_CENTRE"]}>
              <StockConsolePage />
            </RequireRole>
          }
        />
        <Route
          path="/centre/units/:unitId"
          element={
            <RequireRole allowedRoles={["BLOOD_CENTRE"]}>
              <UnitDetailPage />
            </RequireRole>
          }
        />

        {/* Hospital */}
        <Route
          path="/hospital/inbox"
          element={
            <RequireRole allowedRoles={["HOSPITAL"]}>
              <OfferInboxPage />
            </RequireRole>
          }
        />
        <Route
          path="/hospital/requisitions"
          element={
            <RequireRole allowedRoles={["HOSPITAL"]}>
              <RequisitionsPage />
            </RequireRole>
          }
        />
        <Route
          path="/hospital/transfers"
          element={
            <RequireRole allowedRoles={["HOSPITAL"]}>
              <TransfersPage />
            </RequireRole>
          }
        />

        {/* Coordinator */}
        <Route
          path="/coordinator/escalations"
          element={
            <RequireRole allowedRoles={["COORDINATOR"]}>
              <EscalationMapPage />
            </RequireRole>
          }
        />
        <Route
          path="/coordinator/pools"
          element={
            <RequireRole allowedRoles={["COORDINATOR"]}>
              <PoolsPage />
            </RequireRole>
          }
        />
        <Route
          path="/coordinator/parse"
          element={
            <RequireRole allowedRoles={["COORDINATOR"]}>
              <ParseRequestPage />
            </RequireRole>
          }
        />

        {/* Any authenticated role */}
        <Route path="/impact" element={<ImpactPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
