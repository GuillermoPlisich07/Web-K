import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import UsersScreen from "../pages/UsersScreen";
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

const oneUser = [
  { id: "1", email: "vendedor@konverza.com", role: "EMPLOYEE", enabled: true, createdAt: "2026-07-01T00:00:00" },
];

function renderScreen(role: Role, items: unknown[] = oneUser) {
  seedRole(role);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(items)));
  return render(
    <MemoryRouter>
      <RoleProvider>
        <UsersScreen />
      </RoleProvider>
    </MemoryRouter>
  );
}

describe("UsersScreen", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("admin sees full CRUD controls and can select any of the 3 roles", async () => {
    renderScreen("admin");
    await waitFor(() => expect(screen.getByText("vendedor@konverza.com")).toBeInTheDocument());

    expect(screen.getByText(/Nuevo usuario/i)).toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByText(/Nuevo usuario/i));

    const roleSelect = screen.getByLabelText("Rol") as HTMLSelectElement;
    const optionValues = Array.from(roleSelect.options).map((o) => o.value);
    expect(optionValues).toEqual(["EMPLOYEE", "ADMIN", "EXEC"]);
  });

  it("exec (Autoridad) sees the read-only list with no write controls", async () => {
    renderScreen("exec");
    await waitFor(() => expect(screen.getByText("vendedor@konverza.com")).toBeInTheDocument());

    expect(screen.queryByText(/Nuevo usuario/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });

  it("shows an empty state when the list is empty", async () => {
    renderScreen("admin", []);
    await waitFor(() => expect(screen.getByText(/no hay usuarios/i)).toBeInTheDocument());
  });
});
