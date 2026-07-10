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
    <div className="flex h-screen" style={{ backgroundColor: "#080B11" }}>
      <Sidebar role={role} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar role={role} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
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
