import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "../store/authStore";

interface Props {
  children: ReactNode;
}

export default function RedirectIfAuthenticated({ children }: Props) {
  const status = useAuthStore((s) => s.status);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
