import { useRole } from "../context/RoleContext";
import DashboardEmployee from "../components/dashboard/DashboardEmployee";
import DashboardAdmin from "../components/dashboard/DashboardAdmin";
import DashboardExec from "../components/dashboard/DashboardExec";

export default function DashboardScreen() {
  const { role } = useRole();

  return (
    <main className="max-w-7xl mx-auto w-full px-8 py-10">
      {role === "admin" ? <DashboardAdmin /> : role === "exec" ? <DashboardExec /> : <DashboardEmployee />}
    </main>
  );
}
