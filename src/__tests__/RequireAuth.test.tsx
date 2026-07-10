import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import RequireAuth from "../components/RequireAuth";
import { useAuthStore } from "../store/authStore";

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <div>Protected content</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, role: null, email: null, profileCompleted: true, status: "unknown" });
  });

  it("shows a loading state while the session status is unknown", () => {
    renderGuard();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.queryByText("Login screen")).not.toBeInTheDocument();
  });

  it("redirects to /login when unauthenticated", () => {
    useAuthStore.getState().clearSession();
    renderGuard();
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    useAuthStore.getState().setSession({ accessToken: "tok", role: "employee", email: "a@konverza.com", profileCompleted: true });
    renderGuard();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
