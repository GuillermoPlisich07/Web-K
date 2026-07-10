import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import AppShell from "../layouts/AppShell";
import { useAuthStore } from "../store/authStore";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AppShell />
    </MemoryRouter>
  );
}

describe("Profile completion gate (AppShell)", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the gate with no navigation chrome when the profile is incomplete", () => {
    useAuthStore.getState().setSession({
      accessToken: "test-token",
      role: "employee",
      email: "test@konverza.com",
      profileCompleted: false,
    });

    renderShell();

    expect(screen.getByText("Completá tu perfil")).toBeInTheDocument();
    expect(screen.queryByText("Konverza")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("does not show the gate when the profile is already complete", () => {
    useAuthStore.getState().setSession({
      accessToken: "test-token",
      role: "employee",
      email: "test@konverza.com",
      profileCompleted: true,
    });

    renderShell();

    expect(screen.queryByText("Completá tu perfil")).not.toBeInTheDocument();
  });

  it("submitting valid data reveals the normal app without a fresh login", async () => {
    useAuthStore.getState().setSession({
      accessToken: "test-token",
      role: "employee",
      email: "test@konverza.com",
      profileCompleted: false,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: "1",
          email: "test@konverza.com",
          role: "employee",
          age: 28,
          personality: "Analitico",
          selfDescription: "Vendedor",
          profileCompleted: true,
        })
      )
    );

    const user = userEvent.setup();
    renderShell();

    await user.type(screen.getByLabelText("Edad"), "28");
    await user.type(screen.getByLabelText("Personalidad"), "Analitico");
    await user.type(screen.getByLabelText("¿Quién soy?"), "Vendedor con experiencia");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => expect(screen.queryByText("Completá tu perfil")).not.toBeInTheDocument());
    expect(useAuthStore.getState().profileCompleted).toBe(true);
  });
});
