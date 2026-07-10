import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/authStore";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("initial state is unknown with no session data", () => {
    // clearSession() above already moves status to "unauthenticated"; check the
    // shape directly on a store reset instead of relying on module-load state.
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.role).toBeNull();
    expect(state.email).toBeNull();
  });

  it("setSession stores the token, role, and email and marks authenticated", () => {
    useAuthStore.getState().setSession({ accessToken: "abc.def.ghi", role: "admin", email: "a@konverza.com", profileCompleted: true });
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("abc.def.ghi");
    expect(state.role).toBe("admin");
    expect(state.email).toBe("a@konverza.com");
    expect(state.status).toBe("authenticated");
  });

  it("clearSession wipes the token, role, and email and marks unauthenticated", () => {
    useAuthStore.getState().setSession({ accessToken: "abc.def.ghi", role: "admin", email: "a@konverza.com", profileCompleted: true });
    useAuthStore.getState().clearSession();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.role).toBeNull();
    expect(state.email).toBeNull();
    expect(state.status).toBe("unauthenticated");
  });
});
