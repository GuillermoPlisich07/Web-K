import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useRole } from "../context/RoleContext";
import type { Role } from "../config/nav";

interface Props {
  allow: Role[];
  redirectTo: string;
  children: ReactNode;
}

export default function RequireRole({ allow, redirectTo, children }: Props) {
  const { role } = useRole();
  if (!allow.includes(role)) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
