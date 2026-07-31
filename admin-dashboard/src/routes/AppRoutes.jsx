import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "../components/AdminShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import {
  BookingsPage,
  ModulePlaceholderPage,
  OverviewPage,
  PanditsPage,
} from "../pages/DashboardPages";
import {
  PaymentsPage,
  PoojaTypesPage,
  UsersPage,
} from "../pages/ResourcePages";
import { LoginPage } from "../pages/LoginPage";
import { PricingControlPage } from "../pages/PricingControlPage";
import { WithdrawalsPage } from "../pages/WithdrawalsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminShell />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/pandits" element={<PanditsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/pooja-types" element={<PoojaTypesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/pricing-control" element={<PricingControlPage />} />
          <Route path="/withdrawals" element={<WithdrawalsPage />} />
          <Route path="/reports" element={<ModulePlaceholderPage title="Reports" accent="reports" description="Exportable performance reporting, approval trend analysis, and marketplace KPIs can live here." />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

