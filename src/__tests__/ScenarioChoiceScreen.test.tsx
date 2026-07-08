import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect } from "vitest";
import ScenarioChoiceScreen from "../pages/ScenarioChoiceScreen";
import { RoleProvider } from "../context/RoleContext";

const renderChoice = () =>
  render(
    <MemoryRouter>
      <RoleProvider initialRole="admin">
        <ScenarioChoiceScreen />
      </RoleProvider>
    </MemoryRouter>
  );

describe("ScenarioChoiceScreen", () => {
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
    render(
      <MemoryRouter initialEntries={["/scenarios/new"]}>
        <RoleProvider initialRole="employee">
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
