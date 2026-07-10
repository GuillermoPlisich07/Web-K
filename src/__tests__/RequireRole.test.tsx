import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import RequireRole from "../components/RequireRole";
import { RoleProvider } from "../context/RoleContext";
import { useAuthStore } from "../store/authStore";
import type { Role } from "../config/nav";

function seedRole(role: Role) {
  useAuthStore.getState().setSession({ accessToken: "test-token", role, email: "test@konverza.com", profileCompleted: true });
}

function renderGuarded(allow: Role[]) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <RoleProvider>
        <Routes>
          <Route path="/fallback" element={<div>Fallback screen</div>} />
          <Route
            path="/protected"
            element={
              <RequireRole allow={allow} redirectTo="/fallback">
                <div>Protected content</div>
              </RequireRole>
            }
          />
        </Routes>
      </RoleProvider>
    </MemoryRouter>
  );
}

describe("RequireRole", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("exec (Autoridad) is redirected away from a write-only route (admin-only)", () => {
    seedRole("exec");
    renderGuarded(["admin"]);
    expect(screen.getByText("Fallback screen")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("employee is redirected away from an admin-only route", () => {
    seedRole("employee");
    renderGuarded(["admin"]);
    expect(screen.getByText("Fallback screen")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("admin reaches an admin-only route", () => {
    seedRole("admin");
    renderGuarded(["admin"]);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("exec reaches a route that explicitly allows exec (read access)", () => {
    seedRole("exec");
    renderGuarded(["admin", "exec"]);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("employee reaches a route that allows employee and admin", () => {
    seedRole("employee");
    renderGuarded(["employee", "admin"]);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
