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
import RequireRole from "./components/RequireRole";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route
          path="/"
          element={
            <PlaceholderScreen
              title="Dashboard"
              description="Tu resumen de actividad y métricas de entrenamiento, próximamente."
            />
          }
        />
        <Route path="/session" element={<SessionScreen />} />
        <Route path="/report/:sessionId" element={<ReportScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/scenarios" element={<ScenariosListScreen />} />
        <Route path="/scenarios/new" element={<ScenarioChoiceScreen />} />
        <Route path="/scenarios/new/express" element={<ScenarioExpressScreen />} />
        <Route
          path="/scenarios/new/detailed"
          element={
            <RequireRole allow={["admin", "exec"]} redirectTo="/scenarios">
              <ScenarioDetailedScreen />
            </RequireRole>
          }
        />
        <Route
          path="/scenarios/:id/edit"
          element={
            <RequireRole allow={["admin", "exec"]} redirectTo="/scenarios">
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
            <PlaceholderScreen
              title="Knowledge Base"
              description="Documentación y recursos de entrenamiento, próximamente."
            />
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
            <RequireRole allow={["admin"]} redirectTo="/">
              <PlaceholderScreen title="Users" description="Gestión de usuarios, próximamente." />
            </RequireRole>
          }
        />
        <Route
          path="/settings"
          element={
            <PlaceholderScreen
              title="Settings"
              description="Configuración de la cuenta, próximamente."
            />
          }
        />
      </Route>
    </Routes>
  );
}
