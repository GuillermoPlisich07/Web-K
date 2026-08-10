import { create } from "zustand";
import type { Role } from "../config/nav";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export interface AuthSession {
  accessToken: string;
  role: Role;
  email: string;
  profileCompleted: boolean;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

interface AuthState {
  accessToken: string | null;
  role: Role | null;
  email: string | null;
  profileCompleted: boolean;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
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
  firstName: null,
  lastName: null,
  avatarUrl: null,
  status: "unknown",

  setSession: ({ accessToken, role, email, profileCompleted, firstName, lastName, avatarUrl }) =>
    set({
      accessToken,
      role,
      email,
      profileCompleted,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      avatarUrl: avatarUrl ?? null,
      status: "authenticated",
    }),

  setProfileCompleted: (value) => set({ profileCompleted: value }),

  clearSession: () =>
    set({
      accessToken: null,
      role: null,
      email: null,
      profileCompleted: true,
      firstName: null,
      lastName: null,
      avatarUrl: null,
      status: "unauthenticated",
    }),
}));
