import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CompanyScreen from "../pages/CompanyScreen";
import { RoleProvider } from "../context/RoleContext";
import { useAuthStore } from "../store/authStore";
import type { Role } from "../config/nav";

function seedRole(role: Role) {
  useAuthStore.getState().setSession({ accessToken: "test-token", role, email: "test@konverza.com", profileCompleted: true });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderScreen(role: Role, empresa: unknown | null) {
  seedRole(role);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(empresa ? jsonResponse(empresa) : jsonResponse(null, 404)));
  return render(
    <MemoryRouter>
      <RoleProvider>
        <CompanyScreen />
      </RoleProvider>
    </MemoryRouter>
  );
}

const existingEmpresa = {
  id: "1",
  name: "Konverza SA",
  context: "Contexto de la empresa",
  createdAt: "2026-07-01T00:00:00",
  updatedAt: "2026-07-01T00:00:00",
};

describe("CompanyScreen", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("admin sees a create form when no record exists yet", async () => {
    renderScreen("admin", null);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Crear empresa" })).toBeInTheDocument());
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
  });

  it("admin sees an edit form prefilled when a record exists", async () => {
    renderScreen("admin", existingEmpresa);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Editar empresa" })).toBeInTheDocument());
    expect(screen.getByLabelText("Nombre")).toHaveValue("Konverza SA");
  });

  it("exec (Autoridad) sees read-only content with no write controls", async () => {
    renderScreen("exec", existingEmpresa);
    await waitFor(() => expect(screen.getByText("Konverza SA")).toBeInTheDocument());
    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    expect(screen.queryByText("Crear empresa")).not.toBeInTheDocument();
    expect(screen.queryByText("Editar empresa")).not.toBeInTheDocument();
  });
});
