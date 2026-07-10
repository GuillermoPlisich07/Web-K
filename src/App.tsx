import { Routes, Route } from "react-router-dom";
import AppShell from "./layouts/AppShell";
import LoginPage from "./pages/LoginPage";
import SessionScreen from "./pages/SessionScreen";
import ReportScreen from "./pages/ReportScreen";
import HistoryScreen from "./pages/HistoryScreen";
import ScenariosListScreen from "./pages/ScenariosListScreen";
import ScenarioChoiceScreen from "./pages/ScenarioChoiceScreen";
import ScenarioExpressScreen from "./pages/ScenarioExpressScreen";
import ScenarioDetailedScreen from "./pages/ScenarioDetailedScreen";
import PlaceholderScreen from "./pages/PlaceholderScreen";
import DashboardScreen from "./pages/DashboardScreen";
import ProductsScreen from "./pages/ProductsScreen";
import ServicesScreen from "./pages/ServicesScreen";
import UsersScreen from "./pages/UsersScreen";
import CompanyScreen from "./pages/CompanyScreen";
import SettingsScreen from "./pages/SettingsScreen";
import RequireRole from "./components/RequireRole";
import RequireAuth from "./components/RequireAuth";
import RedirectIfAuthenticated from "./components/RedirectIfAuthenticated";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";

export default function App() {
  useAuthBootstrap();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/session" element={<SessionScreen />} />
        <Route path="/report/:sessionId" element={<ReportScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/scenarios" element={<ScenariosListScreen />} />
        <Route
          path="/scenarios/new"
          element={
            <RequireRole allow={["employee", "admin"]} redirectTo="/scenarios">
              <ScenarioChoiceScreen />
            </RequireRole>
          }
        />
        <Route
          path="/scenarios/new/express"
          element={
            <RequireRole allow={["employee", "admin"]} redirectTo="/scenarios">
              <ScenarioExpressScreen />
            </RequireRole>
          }
        />
        <Route
          path="/scenarios/new/detailed"
          element={
            <RequireRole allow={["admin"]} redirectTo="/scenarios">
              <ScenarioDetailedScreen />
            </RequireRole>
          }
        />
        <Route
          path="/scenarios/:id/edit"
          element={
            <RequireRole allow={["admin"]} redirectTo="/scenarios">
              <ScenarioDetailedScreen />
            </RequireRole>
          }
        />
        <Route
          path="/ai-coach"
          element={
            <PlaceholderScreen
              title="AI Coach"
              description="Muy pronto vas a poder practicar con tu coach de IA personalizado."
            />
          }
        />
        <Route
          path="/knowledge-base"
          element={
            <RequireRole allow={["admin", "exec"]} redirectTo="/">
              <PlaceholderScreen
                title="Knowledge Base"
                description="Documentación y recursos de entrenamiento, próximamente."
              />
            </RequireRole>
          }
        />
        <Route
          path="/analytics"
          element={
            <PlaceholderScreen
              title="Analytics"
              description="Métricas y analíticas del equipo, próximamente."
            />
          }
        />
        <Route
          path="/leagues"
          element={
            <PlaceholderScreen
              title="Leagues"
              description="Ligas competitivas entre equipos, próximamente."
            />
          }
        />
        <Route
          path="/challenges"
          element={
            <PlaceholderScreen
              title="Challenges"
              description="Desafíos semanales, próximamente."
            />
          }
        />
        <Route
          path="/users"
          element={
            <RequireRole allow={["admin", "exec"]} redirectTo="/">
              <UsersScreen />
            </RequireRole>
          }
        />
        <Route
          path="/products"
          element={
            <RequireRole allow={["admin", "exec"]} redirectTo="/">
              <ProductsScreen />
            </RequireRole>
          }
        />
        <Route
          path="/services"
          element={
            <RequireRole allow={["admin", "exec"]} redirectTo="/">
              <ServicesScreen />
            </RequireRole>
          }
        />
        <Route
          path="/company"
          element={
            <RequireRole allow={["admin", "exec"]} redirectTo="/">
              <CompanyScreen />
            </RequireRole>
          }
        />
        <Route
          path="/billing"
          element={
            <RequireRole allow={["admin", "exec"]} redirectTo="/">
              <PlaceholderScreen title="Billing" description="Facturación y planes, próximamente." />
            </RequireRole>
          }
        />
        <Route
          path="/integrations"
          element={
            <RequireRole allow={["admin", "exec"]} redirectTo="/">
              <PlaceholderScreen title="Integraciones" description="Integraciones con otras herramientas, próximamente." />
            </RequireRole>
          }
        />
        <Route path="/settings" element={<SettingsScreen />} />
      </Route>
    </Routes>
  );
}
