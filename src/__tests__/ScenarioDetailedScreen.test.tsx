import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ScenarioDetailedScreen from "../pages/ScenarioDetailedScreen";
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

const existingScenario = {
  id: "scenario-1",
  name: "Escenario existente",
  description: "",
  industries: [],
  clientPersona: "ANGRY",
  difficulty: "MEDIUM",
  maxDurationMinutes: 30,
  systemPrompt: "",
  voiceId: "",
  avatarId: "",
  objectionsGuide: "[]",
  faq: "[]",
  evaluationWeights: "{}",
  forbiddenPhrases: "[]",
};

function stubFetch() {
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url.includes("/api/scenarios/scenario-1")) return Promise.resolve(jsonResponse(existingScenario));
    if (url.includes("/api/productos")) return Promise.resolve(jsonResponse([]));
    return Promise.resolve(jsonResponse(null, 404));
  }));
}

function renderCreate() {
  seedRole();
  stubFetch();
  return render(
    <MemoryRouter initialEntries={["/scenarios/new/detailed"]}>
      <RoleProvider>
        <Routes>
          <Route path="/scenarios/new/detailed" element={<ScenarioDetailedScreen />} />
          <Route path="/scenarios/new" element={<div>Choice screen</div>} />
        </Routes>
      </RoleProvider>
    </MemoryRouter>
  );
}

function renderEdit() {
  seedRole();
  stubFetch();
  return render(
    <MemoryRouter initialEntries={["/scenarios/scenario-1/edit"]}>
      <RoleProvider>
        <Routes>
          <Route path="/scenarios/:id/edit" element={<ScenarioDetailedScreen />} />
          <Route path="/scenarios" element={<div>Scenarios list</div>} />
        </Routes>
      </RoleProvider>
    </MemoryRouter>
  );
}

describe("ScenarioDetailedScreen — creating a new scenario", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders no branding header", async () => {
    renderCreate();
    await waitFor(() => expect(screen.getByText("Identidad")).toBeInTheDocument());
    expect(screen.queryByText("Ventas")).not.toBeInTheDocument();
    expect(screen.queryByText("Plataforma de entrenamiento")).not.toBeInTheDocument();
  });

  it("Cancelar navigates to /scenarios/new", async () => {
    const user = userEvent.setup();
    renderCreate();
    await waitFor(() => expect(screen.getByText("Identidad")).toBeInTheDocument());
    await user.click(screen.getByText("← Cancelar"));
    expect(screen.getByText("Choice screen")).toBeInTheDocument();
  });
});

describe("ScenarioDetailedScreen — editing an existing scenario", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the branding header and Volver, with no Cancelar link", async () => {
    const user = userEvent.setup();
    renderEdit();
    await waitFor(() => expect(screen.getByText("Editando escenario")).toBeInTheDocument());
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.queryByText("← Cancelar")).not.toBeInTheDocument();

    await user.click(screen.getByText("← Volver"));
    expect(screen.getByText("Scenarios list")).toBeInTheDocument();
  });
});
