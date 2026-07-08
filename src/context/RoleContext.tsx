import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Role } from "../config/nav";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

interface RoleProviderProps {
  children: ReactNode;
  initialRole?: Role;
}

export function RoleProvider({ children, initialRole = "employee" }: RoleProviderProps) {
  const [role, setRole] = useState<Role>(initialRole);
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
