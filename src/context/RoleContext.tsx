import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Role } from "../config/nav";
import { useAuthStore } from "../store/authStore";

interface RoleContextValue {
  role: Role;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

interface RoleProviderProps {
  children: ReactNode;
}

/**
 * Role comes from the verified session (set at login/refresh), never from
 * locally editable state — RequireRole must not be foolable by client state.
 */
export function RoleProvider({ children }: RoleProviderProps) {
  const role = useAuthStore((s) => s.role) ?? "employee";
  return <RoleContext.Provider value={{ role }}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
