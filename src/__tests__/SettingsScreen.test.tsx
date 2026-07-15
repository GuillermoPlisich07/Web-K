import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import SettingsScreen from "../pages/SettingsScreen";
import { useAuthStore } from "../store/authStore";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const existingProfile = {
  id: "1",
  email: "vendedor@konverza.com",
  role: "employee",
  age: 30,
  personality: "Analitico",
  selfDescription: "Vendedor con experiencia",
  profileCompleted: true,
};

describe("SettingsScreen", () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({
      accessToken: "test-token",
      role: "employee",
      email: "vendedor@konverza.com",
      profileCompleted: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefills the profile fields from getMyProfile and saves edits without the gate reappearing", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(existingProfile))
      .mockResolvedValueOnce(jsonResponse({ ...existingProfile, personality: "Extrovertido" }));
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByLabelText("Edad")).toHaveValue(30));
    expect(screen.getByLabelText("Personalidad")).toHaveValue("Analitico");
    expect(screen.getByLabelText("¿Quién soy?")).toHaveValue("Vendedor con experiencia");

    await user.clear(screen.getByLabelText("Personalidad"));
    await user.type(screen.getByLabelText("Personalidad"), "Extrovertido");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByText("Perfil guardado.")).toBeInTheDocument());
    expect(useAuthStore.getState().profileCompleted).toBe(true);
  });

  it("defaults to the Profile tab and has no Company tab", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(existingProfile)));

    render(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByLabelText("Edad")).toBeInTheDocument());
    expect(screen.queryByText("Company")).not.toBeInTheDocument();
  });

  it("switching tabs shows honest placeholder content, not fake interactive controls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(existingProfile))));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByLabelText("Edad")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(screen.getAllByText("Próximamente").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Edad")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Billing/i }));
    expect(screen.getByRole("heading", { name: "Billing" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Integrations/i }));
    expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Profile/i }));
    expect(screen.getByLabelText("Edad")).toBeInTheDocument();
  });
});
