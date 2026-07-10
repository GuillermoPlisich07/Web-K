import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import ScenarioChoiceScreen from "../pages/ScenarioChoiceScreen";
import { RoleProvider } from "../context/RoleContext";
import { useAuthStore } from "../store/authStore";

// Role is sourced from the verified session (authStore), never from a
// client-settable prop — seed the store directly to simulate each role.
function seedRole(role: "admin" | "employee") {
  useAuthStore.getState().setSession({ accessToken: "test-token", role, email: "test@konverza.com", profileCompleted: true });
}

const renderChoice = () => {
  seedRole("admin");
  return render(
    <MemoryRouter>
      <RoleProvider>
        <ScenarioChoiceScreen />
      </RoleProvider>
    </MemoryRouter>
  );
};

describe("ScenarioChoiceScreen", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("renders the choice heading", () => {
    renderChoice();
    expect(screen.getByText(/Cómo querés crear el escenario/i)).toBeInTheDocument();
  });

  it("shows Express and Detallado options", () => {
    renderChoice();
    expect(screen.getAllByText(/Escenario rápido/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Escenario completo/i).length).toBeGreaterThan(0);
  });

  it("shows back button", () => {
    renderChoice();
    expect(screen.getByText(/← Volver/i)).toBeInTheDocument();
  });

  it("redirects employees straight to the express flow", () => {
    seedRole("employee");
    render(
      <MemoryRouter initialEntries={["/scenarios/new"]}>
        <RoleProvider>
          <Routes>
            <Route path="/scenarios/new" element={<ScenarioChoiceScreen />} />
            <Route path="/scenarios/new/express" element={<div>Express screen</div>} />
          </Routes>
        </RoleProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Express screen")).toBeInTheDocument();
  });
});
