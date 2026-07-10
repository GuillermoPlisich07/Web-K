import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ScenariosListScreen from "../pages/ScenariosListScreen";
import { RoleProvider } from "../context/RoleContext";
import { useAuthStore } from "../store/authStore";
import type { Role } from "../config/nav";

function seedRole(role: Role) {
  useAuthStore.getState().setSession({ accessToken: "test-token", role, email: "test@konverza.com", profileCompleted: true });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function renderScreen(role: Role) {
  seedRole(role);
  return render(
    <MemoryRouter>
      <RoleProvider>
        <ScenariosListScreen />
      </RoleProvider>
    </MemoryRouter>
  );
}

describe("ScenariosListScreen — role-gated write controls (add-rbac-permission-matrix)", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exec (Autoridad) does not see the 'Nuevo escenario' create button", async () => {
    renderScreen("exec");
    await waitFor(() => expect(screen.queryByText(/No hay escenarios/i)).toBeInTheDocument());
    expect(screen.queryByText(/Nuevo escenario/i)).not.toBeInTheDocument();
  });

  it("employee sees the 'Nuevo escenario' create button (creates escenarios cortos for their own practice)", async () => {
    renderScreen("employee");
    await waitFor(() => expect(screen.queryByText(/No hay escenarios/i)).toBeInTheDocument());
    expect(screen.getByText(/Nuevo escenario/i)).toBeInTheDocument();
  });

  it("admin sees the 'Nuevo escenario' create button", async () => {
    renderScreen("admin");
    await waitFor(() => expect(screen.queryByText(/No hay escenarios/i)).toBeInTheDocument());
    expect(screen.getByText(/Nuevo escenario/i)).toBeInTheDocument();
  });
});
