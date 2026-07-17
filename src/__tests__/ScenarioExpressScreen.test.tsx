import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ScenarioExpressScreen from "../pages/ScenarioExpressScreen";
import { RoleProvider } from "../context/RoleContext";
import { useAuthStore } from "../store/authStore";

function seedRole() {
  useAuthStore.getState().setSession({ accessToken: "test-token", role: "admin", email: "test@konverza.com", profileCompleted: true });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const generatedScenario = {
  id: "scenario-1",
  name: "Venta de CRM",
  clientPersona: "ANGRY",
  difficulty: "MEDIUM",
  industry: "SOFTWARE_B2B",
  systemPrompt: "Sos un cliente enojado.",
  objectionsGuide: "[]",
  faq: "[]",
  forbiddenPhrases: "[]",
};

function renderScreen() {
  seedRole();
  return render(
    <MemoryRouter initialEntries={["/scenarios/new/express"]}>
      <RoleProvider>
        <Routes>
          <Route path="/scenarios/new/express" element={<ScenarioExpressScreen />} />
          <Route path="/scenarios/new" element={<div>Choice screen</div>} />
        </Routes>
      </RoleProvider>
    </MemoryRouter>
  );
}

async function fillFormAndGenerate(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/Ej: Venta de CRM/i), "Venta de CRM");
  await user.click(screen.getByText("Software B2B"));
  await user.click(screen.getByText("Enojado"));
  await user.click(screen.getByText("Medio"));
  await user.type(screen.getByPlaceholderText(/Software de gestión de inventario/i), "Un CRM");
  await user.type(screen.getByPlaceholderText(/InventCloud Pro/i), "CRM Pro");
  await user.type(screen.getByPlaceholderText(/USD 500/i), "USD 100/mes");
  await user.type(screen.getByPlaceholderText(/Implementación en 48hs/i), "Rápido");
  await user.click(screen.getByText("Generar escenario →"));
}

describe("ScenarioExpressScreen", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(generatedScenario)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the form step with no branding header", () => {
    renderScreen();
    expect(screen.queryByText("Ventas")).not.toBeInTheDocument();
    expect(screen.getByText("Escenario rápido")).toBeInTheDocument();
  });

  it("Cancelar on the form step navigates to /scenarios/new", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByText("← Cancelar"));
    expect(screen.getByText("Choice screen")).toBeInTheDocument();
  });

  it("renders no branding header on the review step, and keeps Volver a configurar plus Cancelar", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillFormAndGenerate(user);

    await waitFor(() => expect(screen.getByText("Revisión del escenario generado")).toBeInTheDocument());
    expect(screen.queryByText("Ventas")).not.toBeInTheDocument();
    expect(screen.getByText("← Volver a configurar")).toBeInTheDocument();
    expect(screen.getByText("← Cancelar")).toBeInTheDocument();
  });

  it("Cancelar on the review step navigates to /scenarios/new", async () => {
    const user = userEvent.setup();
    renderScreen();
    await fillFormAndGenerate(user);

    await waitFor(() => expect(screen.getByText("Revisión del escenario generado")).toBeInTheDocument());
    await user.click(screen.getByText("← Cancelar"));
    expect(screen.getByText("Choice screen")).toBeInTheDocument();
  });
});
