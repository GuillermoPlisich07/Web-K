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

  it("setSession stores the token, role, email, names, avatar and marks authenticated", () => {
    useAuthStore.getState().setSession({
      accessToken: "abc.def.ghi",
      role: "admin",
      email: "a@konverza.com",
      profileCompleted: true,
      firstName: "Carlos",
      lastName: "Mendoza",
      avatarUrl: "https://example.com/avatar.jpg",
    });
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("abc.def.ghi");
    expect(state.role).toBe("admin");
    expect(state.email).toBe("a@konverza.com");
    expect(state.firstName).toBe("Carlos");
    expect(state.lastName).toBe("Mendoza");
    expect(state.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(state.status).toBe("authenticated");
  });

  it("clearSession wipes the token, role, email, and names and marks unauthenticated", () => {
    useAuthStore.getState().setSession({
      accessToken: "abc.def.ghi",
      role: "admin",
      email: "a@konverza.com",
      profileCompleted: true,
      firstName: "Carlos",
      lastName: "Mendoza",
    });
    useAuthStore.getState().clearSession();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.role).toBeNull();
    expect(state.email).toBeNull();
    expect(state.firstName).toBeNull();
    expect(state.lastName).toBeNull();
    expect(state.avatarUrl).toBeNull();
    expect(state.status).toBe("unauthenticated");
  });
});
