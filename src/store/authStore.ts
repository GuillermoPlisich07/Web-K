import { create } from "zustand";
import type { Role } from "../config/nav";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export interface AuthSession {
  accessToken: string;
  role: Role;
  email: string;
  profileCompleted: boolean;
}

interface AuthState {
  accessToken: string | null;
  role: Role | null;
  email: string | null;
  profileCompleted: boolean;
  status: AuthStatus;
  setSession: (session: AuthSession) => void;
  setProfileCompleted: (value: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  role: null,
  email: null,
  profileCompleted: true,
  status: "unknown",

  setSession: ({ accessToken, role, email, profileCompleted }) =>
    set({ accessToken, role, email, profileCompleted, status: "authenticated" }),

  setProfileCompleted: (value) => set({ profileCompleted: value }),

  clearSession: () =>
    set({ accessToken: null, role: null, email: null, profileCompleted: true, status: "unauthenticated" }),
}));
