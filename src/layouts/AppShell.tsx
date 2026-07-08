import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { RoleProvider, useRole } from "../context/RoleContext";

function AppShellContent() {
  const navigate = useNavigate();
  const { role, setRole } = useRole();

  const handleLogout = () => navigate("/login");

  return (
    <div className="flex h-screen" style={{ backgroundColor: "#080B11" }}>
      <Sidebar role={role} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar role={role} onRoleChange={setRole} onLogout={handleLogout} />
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
