import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { login, LoginError, apiFetch } from "../services/apiClient";
import { useAuthStore } from "../store/authStore";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiClient", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("login", () => {
    it("resolves with the session payload on success", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        jsonResponse({ accessToken: "tok", expiresIn: 900, email: "a@konverza.com", role: "employee" })
      ));

      const result = await login("a@konverza.com", "secret");

      expect(result.accessToken).toBe("tok");
      expect(result.role).toBe("employee");
    });

    it("maps INVALID_CREDENTIALS to a LoginError of kind invalid_credentials", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        jsonResponse({ error: "Email o contrasena incorrectos", code: "INVALID_CREDENTIALS" }, { status: 401 })
      ));

      await expect(login("a@konverza.com", "wrong")).rejects.toMatchObject({
        kind: "invalid_credentials",
      } satisfies Partial<LoginError>);
    });

    it("maps ACCOUNT_DISABLED to a LoginError of kind account_disabled", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        jsonResponse({ error: "La cuenta esta deshabilitada", code: "ACCOUNT_DISABLED" }, { status: 403 })
      ));

      await expect(login("a@konverza.com", "secret")).rejects.toMatchObject({
        kind: "account_disabled",
      } satisfies Partial<LoginError>);
    });

    it("maps an unrecognized error body to kind server_error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

      await expect(login("a@konverza.com", "secret")).rejects.toMatchObject({
        kind: "server_error",
      } satisfies Partial<LoginError>);
    });

    it("maps a network failure to kind server_error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

      await expect(login("a@konverza.com", "secret")).rejects.toMatchObject({
        kind: "server_error",
      } satisfies Partial<LoginError>);
    });
  });

  describe("apiFetch", () => {
    it("attaches the current access token as a Bearer header", async () => {
      useAuthStore.getState().setSession({ accessToken: "my-token", role: "employee", email: "a@konverza.com", profileCompleted: true });
      const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      await apiFetch("/api/scenarios");

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer my-token");
    });

    it("on 401, refreshes the session and retries once with the new token", async () => {
      useAuthStore.getState().setSession({ accessToken: "expired-token", role: "employee", email: "a@konverza.com", profileCompleted: true });
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response("", { status: 401 }))
        .mockResolvedValueOnce(jsonResponse({ accessToken: "new-token", expiresIn: 900, email: "a@konverza.com", role: "employee", profileCompleted: true }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));
      vi.stubGlobal("fetch", fetchMock);

      const res = await apiFetch("/api/scenarios");

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const retryHeaders = fetchMock.mock.calls[2][1].headers as Headers;
      expect(retryHeaders.get("Authorization")).toBe("Bearer new-token");
      expect(useAuthStore.getState().accessToken).toBe("new-token");
      expect(await res.json()).toEqual({ ok: true });
    });

    it("on 401 with a failed refresh, clears the session and redirects to /login", async () => {
      useAuthStore.getState().setSession({ accessToken: "expired-token", role: "employee", email: "a@konverza.com", profileCompleted: true });
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response("", { status: 401 }))
        .mockResolvedValueOnce(new Response("", { status: 401 }));
      vi.stubGlobal("fetch", fetchMock);
      const assign = vi.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        value: { ...originalLocation, pathname: "/", assign },
        configurable: true,
        writable: true,
      });

      try {
        await apiFetch("/api/scenarios");

        expect(useAuthStore.getState().status).toBe("unauthenticated");
        expect(assign).toHaveBeenCalledWith("/login");
      } finally {
        Object.defineProperty(window, "location", {
          value: originalLocation,
          configurable: true,
          writable: true,
        });
      }
    });
  });
});
