import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import ProfileCompletionGate from "../components/ProfileCompletionGate";
import { RoleProvider, useRole } from "../context/RoleContext";
import { useAuthStore } from "../store/authStore";
import { logout as logoutRequest } from "../services/apiClient";

function AppShellContent() {
  const navigate = useNavigate();
  const { role } = useRole();
  const profileCompleted = useAuthStore((s) => s.profileCompleted);
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleLogout = async () => {
    await logoutRequest();
    clearSession();
    navigate("/login", { replace: true });
  };

  if (!profileCompleted) {
    return <ProfileCompletionGate />;
  }

  return (
    <div className="app-ambient flex h-screen overflow-hidden" style={{ backgroundColor: "#080B11" }}>
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <div className="ambient-orb ambient-orb-three" />
      <Sidebar role={role} onLogout={handleLogout} />
      <div className="relative z-10 flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <TopBar role={role} onLogout={handleLogout} />
        <main className="page-flow flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AppShell() {
  return (
    <RoleProvider>
      <AppShellContent />
    </RoleProvider>
  );
}
