import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  {
    id: "1",
    name: "CRM",
    description: "CRM para ventas",
    context: "Contexto",
    priceRange: "USD 500-1200/mes",
    keyDifferentiator: "Soporte 24/7 en español",
    paymentInfo: "Mensual o anual con 20% de descuento",
    tags: ["b2b", "saas"],
    createdAt: "2026-07-01T00:00:00",
    updatedAt: "2026-07-01T00:00:00",
  },
];

const twoItems = [
  ...oneItem,
  {
    id: "2",
    name: "Facturación Cloud",
    description: "Facturación electrónica en la nube",
    context: "Contexto",
    priceRange: "",
    keyDifferentiator: "",
    paymentInfo: "",
    tags: ["fintech"],
    createdAt: "2026-07-02T00:00:00",
    updatedAt: "2026-07-02T00:00:00",
  },
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

  it("shows price range, key differentiator, payment info, and tags on the card", async () => {
    renderScreen(Component, "admin", oneItem);
    await waitFor(() => expect(screen.getByText("CRM")).toBeInTheDocument());

    expect(screen.getByText("USD 500-1200/mes")).toBeInTheDocument();
    expect(screen.getByText("Soporte 24/7 en español")).toBeInTheDocument();
    expect(screen.getByText("Mensual o anual con 20% de descuento")).toBeInTheDocument();
    expect(screen.getByText("b2b")).toBeInTheDocument();
    expect(screen.getByText("saas")).toBeInTheDocument();
  });

  it("edit form pre-fills price range, key differentiator, payment info, and tags", async () => {
    renderScreen(Component, "admin", oneItem);
    await waitFor(() => expect(screen.getByText("CRM")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByText("Editar"));

    expect(screen.getByDisplayValue("USD 500-1200/mes")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Soporte 24/7 en español")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mensual o anual con 20% de descuento")).toBeInTheDocument();
    expect(screen.getAllByText("b2b").length).toBeGreaterThan(0);
    expect(screen.getAllByText("saas").length).toBeGreaterThan(0);
  });

  it("search narrows the list by name, and clearing restores it", async () => {
    renderScreen(Component, "admin", twoItems);
    await waitFor(() => expect(screen.getByText("CRM")).toBeInTheDocument());
    expect(screen.getByText("Facturación Cloud")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Buscar/i), "factur");

    expect(screen.queryByText("CRM")).not.toBeInTheDocument();
    expect(screen.getByText("Facturación Cloud")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/Buscar/i));
    expect(screen.getByText("CRM")).toBeInTheDocument();
    expect(screen.getByText("Facturación Cloud")).toBeInTheDocument();
  });

  it("search also matches tags, and shows a no-results message when nothing matches", async () => {
    renderScreen(Component, "admin", twoItems);
    await waitFor(() => expect(screen.getByText("CRM")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Buscar/i), "fintech");
    expect(screen.getByText("Facturación Cloud")).toBeInTheDocument();
    expect(screen.queryByText("CRM")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/Buscar/i));
    await user.type(screen.getByPlaceholderText(/Buscar/i), "no-existe-esto");
    expect(screen.queryByText("CRM")).not.toBeInTheDocument();
    expect(screen.queryByText("Facturación Cloud")).not.toBeInTheDocument();
    expect(screen.getByText(/Ningún .* coincide con "no-existe-esto"/)).toBeInTheDocument();
  });
});
