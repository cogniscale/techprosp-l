import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { InvoicesPage } from "@/pages/InvoicesPage";
import { ActivitiesPage } from "@/pages/ActivitiesPage";
import { TeamHRPage } from "@/pages/TeamHRPage";
import { SoftwareCostsPage } from "@/pages/SoftwareCostsPage";
import { TravelCostsPage } from "@/pages/TravelCostsPage";
import { ForecastsPage } from "@/pages/ForecastsPage";
import { ScenariosPage } from "@/pages/ScenariosPage";
import { PLPage } from "@/pages/PLPage";
import { KPIsPage } from "@/pages/KPIsPage";
import { QuarterlySummaryPage } from "@/pages/QuarterlySummaryPage";
import { ScorecardPage } from "@/pages/ScorecardPage";
import { CogniScaleFeesPage } from "@/pages/CogniScaleFeesPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import DocumentInboxPage from "@/pages/DocumentInboxPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ROUTES } from "@/constants/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                <Route path={ROUTES.INVOICES} element={<InvoicesPage />} />
                <Route path={ROUTES.ACTIVITIES} element={<ActivitiesPage />} />
                <Route path={ROUTES.TEAM_HR} element={<TeamHRPage />} />
                <Route path={ROUTES.SOFTWARE} element={<SoftwareCostsPage />} />
                <Route path={ROUTES.TRAVEL} element={<TravelCostsPage />} />
                {/* Redirect old /costs to team-hr */}
                <Route path="/costs" element={<Navigate to={ROUTES.TEAM_HR} replace />} />
                <Route path={ROUTES.FORECASTS} element={<ForecastsPage />} />
                <Route path={ROUTES.SCENARIOS} element={<ScenariosPage />} />
                <Route path={ROUTES.PL} element={<PLPage />} />
                <Route path={ROUTES.KPIS} element={<KPIsPage />} />
                <Route path={ROUTES.QUARTERLY} element={<QuarterlySummaryPage />} />
                <Route path={ROUTES.SCORECARD} element={<ScorecardPage />} />
                <Route path={ROUTES.COGNISCALE_FEES} element={<CogniScaleFeesPage />} />
                <Route path={ROUTES.DOCUMENTS} element={<DocumentsPage />} />
                <Route path={ROUTES.INBOX} element={<DocumentInboxPage />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
