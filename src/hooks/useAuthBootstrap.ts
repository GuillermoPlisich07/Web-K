import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { silentRefresh } from "../services/apiClient";
import type { Role } from "../config/nav";

/**
 * Runs once on app load: attempts to re-establish a session from the
 * httpOnly refresh cookie before any protected route renders, so a page
 * reload doesn't force a re-login for an already-active session.
 */
export function useAuthBootstrap(): void {
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (status !== "unknown") return;
    let cancelled = false;

    silentRefresh().then((data) => {
      if (cancelled) return;
      if (data) {
        setSession({
          accessToken: data.accessToken,
          role: data.role as Role,
          email: data.email,
          profileCompleted: data.profileCompleted,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl,
        });
      } else {
        clearSession();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [status, setSession, clearSession]);
}
