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
  {
    id: "1",
    firstName: "Juana",
    lastName: "Perez",
    email: "vendedor@konverza.com",
    role: "EMPLOYEE",
    enabled: true,
    createdAt: "2026-07-01T00:00:00",
  },
];

const twoUsers = [
  ...oneUser,
  {
    id: "2",
    firstName: "Martín",
    lastName: "Gómez",
    email: "martin.gomez@konverza.com",
    role: "ADMIN",
    enabled: true,
    createdAt: "2026-07-02T00:00:00",
  },
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

const sampleActivity = {
  quickScenarios: [
    { id: "q1", name: "Venta de CRM", createdAt: "2026-07-01T00:00:00", enabled: true, sessionCount: 3, avgScore: 7.5 },
  ],
  fullScenarios: [
    { id: "f1", name: "Onboarding cliente enterprise", completed: true, lastCompletedAt: "2026-07-10T00:00:00" },
    { id: "f2", name: "Renovación de contrato", completed: false, lastCompletedAt: null },
  ],
};

function renderScreenWithActivity(role: Role, items: unknown[] = oneUser, activity: unknown = sampleActivity) {
  seedRole(role);
  vi.stubGlobal("fetch", vi.fn((url: unknown) => {
    if (typeof url === "string" && url.includes("/activity")) {
      return Promise.resolve(jsonResponse(activity));
    }
    return Promise.resolve(jsonResponse(items));
  }));
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
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();

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
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("shows an empty state when the list is empty", async () => {
    renderScreen("admin", []);
    await waitFor(() => expect(screen.getByText(/no hay usuarios/i)).toBeInTheDocument());
  });

  it("create form collects first name, last name, email, and password", async () => {
    renderScreen("admin");
    await waitFor(() => expect(screen.getByText("Juana Perez")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByText(/Nuevo usuario/i));

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Apellido")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
  });

  it("edit form pre-fills first name, last name, and email, and allows an optional password reset", async () => {
    renderScreen("admin");
    await waitFor(() => expect(screen.getByText("Juana Perez")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByLabelText("Nombre")).toHaveValue("Juana");
    expect(screen.getByLabelText("Apellido")).toHaveValue("Perez");
    expect(screen.getByLabelText("Email")).toHaveValue("vendedor@konverza.com");
    expect(screen.getByLabelText("Nueva contraseña (opcional)")).toHaveValue("");
  });

  it("admin clicking a user row opens the activity panel with quick and full scenario data", async () => {
    renderScreenWithActivity("admin");
    await waitFor(() => expect(screen.getByText("Juana Perez")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByText("Juana Perez"));

    await waitFor(() => expect(screen.getByText("Venta de CRM")).toBeInTheDocument());
    expect(screen.getByText("Escenarios Rápidos")).toBeInTheDocument();
    expect(screen.getByText("Escenarios Completos")).toBeInTheDocument();
    expect(screen.getByText("Onboarding cliente enterprise")).toBeInTheDocument();
    expect(screen.getByText("Renovación de contrato")).toBeInTheDocument();
  });

  it("exec (Autoridad) can also open the read-only activity panel", async () => {
    renderScreenWithActivity("exec");
    await waitFor(() => expect(screen.getByText("Juana Perez")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByText("Juana Perez"));

    await waitFor(() => expect(screen.getByText("Venta de CRM")).toBeInTheDocument());
  });

  it("employee has no row-click affordance to open the activity panel", async () => {
    renderScreenWithActivity("employee");
    await waitFor(() => expect(screen.getByText("vendedor@konverza.com")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByText("vendedor@konverza.com"));

    expect(screen.queryByText("Escenarios Rápidos")).not.toBeInTheDocument();
  });

  it("search narrows the list by name or email, and clearing restores it", async () => {
    renderScreen("admin", twoUsers);
    await waitFor(() => expect(screen.getByText("Juana Perez")).toBeInTheDocument());
    expect(screen.getByText("Martín Gómez")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Buscar/i), "martin");

    expect(screen.queryByText("Juana Perez")).not.toBeInTheDocument();
    expect(screen.getByText("Martín Gómez")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/Buscar/i));
    expect(screen.getByText("Juana Perez")).toBeInTheDocument();
    expect(screen.getByText("Martín Gómez")).toBeInTheDocument();
  });

  it("shows a no-results message when the search matches no one", async () => {
    renderScreen("admin", twoUsers);
    await waitFor(() => expect(screen.getByText("Juana Perez")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Buscar/i), "no-existe-este-usuario");

    expect(screen.queryByText("Juana Perez")).not.toBeInTheDocument();
    expect(screen.queryByText("Martín Gómez")).not.toBeInTheDocument();
    expect(screen.getByText(/Ningún usuario coincide con "no-existe-este-usuario"/)).toBeInTheDocument();
  });
});
