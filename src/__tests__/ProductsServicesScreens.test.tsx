import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ProductsScreen from "../pages/ProductsScreen";
import ServicesScreen from "../pages/ServicesScreen";
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

const oneItem = [
  { id: "1", name: "CRM", description: "CRM para ventas", context: "Contexto", createdAt: "2026-07-01T00:00:00", updatedAt: "2026-07-01T00:00:00" },
];

function renderScreen(Component: typeof ProductsScreen, role: Role, items: unknown[]) {
  seedRole(role);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(items)));
  return render(
    <MemoryRouter>
      <RoleProvider>
        <Component />
      </RoleProvider>
    </MemoryRouter>
  );
}

describe.each([
  { label: "ProductsScreen", Component: ProductsScreen, createLabel: /Nuevo producto/i, emptyText: /no hay productos/i },
  { label: "ServicesScreen", Component: ServicesScreen, createLabel: /Nuevo servicio/i, emptyText: /no hay servicios/i },
])("$label", ({ Component, createLabel, emptyText }) => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("admin sees create/edit/delete controls", async () => {
    renderScreen(Component, "admin", oneItem);
    await waitFor(() => expect(screen.getByText("CRM")).toBeInTheDocument());
    expect(screen.getByText(createLabel)).toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  it("exec (Autoridad) sees the read-only list with no write controls", async () => {
    renderScreen(Component, "exec", oneItem);
    await waitFor(() => expect(screen.getByText("CRM")).toBeInTheDocument());
    expect(screen.queryByText(createLabel)).not.toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });

  it("shows an empty state when the list is empty", async () => {
    renderScreen(Component, "admin", []);
    await waitFor(() => expect(screen.getByText(emptyText)).toBeInTheDocument());
  });
});
