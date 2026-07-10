import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "../store/authStore";

interface Props {
  children: ReactNode;
}

export default function RequireAuth({ children }: Props) {
  const status = useAuthStore((s) => s.status);

  if (status === "unknown") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#080B11" }}>
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
