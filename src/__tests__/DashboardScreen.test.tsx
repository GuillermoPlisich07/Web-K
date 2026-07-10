import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import DashboardScreen from "../pages/DashboardScreen";
import { RoleProvider } from "../context/RoleContext";
import { useAuthStore } from "../store/authStore";
import type { Role } from "../config/nav";
import type { DashboardMetrics, TeamDashboard } from "../services/dashboardApi";

function seedRole(role: Role) {
  useAuthStore.getState().setSession({ accessToken: "test-token", role, email: "test@konverza.com", profileCompleted: true });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const emptyPersonal: DashboardMetrics = {
  sessionCount: 0,
  avgScore: null,
  winRate: null,
  practiceTimeSeconds: 0,
  scoreSeries: [],
  categoryBreakdown: [],
  recentSessions: [],
};

const filledPersonal: DashboardMetrics = {
  sessionCount: 3,
  avgScore: 7.5,
  winRate: 66.7,
  practiceTimeSeconds: 1800,
  scoreSeries: [{ date: "2026-07-01T10:00:00", score: 7.5 }],
  categoryBreakdown: [{ category: "Persuasion", avgScore: 8 }],
  recentSessions: [
    { id: "s1", scenarioName: "Cliente difícil", score: 7.5, startedAt: "2026-07-01T10:00:00", durationSeconds: 600 },
  ],
};

const emptyTeam: TeamDashboard = {
  activeUserCount: 0,
  activityTrend: [],
  avgTeamScore: null,
  completionRate: null,
  categoryBreakdown: [],
  topPerformers: [],
};

const filledTeam: TeamDashboard = {
  activeUserCount: 2,
  activityTrend: [{ label: "W27", sessionCount: 5 }],
  avgTeamScore: 7.2,
  completionRate: 80,
  categoryBreakdown: [{ category: "Persuasion", avgScore: 7 }],
  topPerformers: [{ email: "vendedor@konverza.com", avgScore: 8, sessionCount: 4 }],
};

function mockFetchByPath(responses: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const path = Object.keys(responses).find((p) => url.includes(p));
      return Promise.resolve(jsonResponse(path ? responses[path] : {}));
    })
  );
}

function renderDashboard(role: Role) {
  seedRole(role);
  return render(
    <MemoryRouter>
      <RoleProvider>
        <DashboardScreen />
      </RoleProvider>
    </MemoryRouter>
  );
}

describe("DashboardScreen", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("employee role renders personal metrics only, no company-wide section", async () => {
    mockFetchByPath({ "/api/dashboard/me": filledPersonal });
    renderDashboard("employee");

    await waitFor(() => expect(screen.getByText("Sesiones Recientes")).toBeInTheDocument());
    expect(screen.queryByText("Top Performers")).not.toBeInTheDocument();
    expect(screen.queryByText("Resumen del Equipo")).not.toBeInTheDocument();
  });

  it("admin role renders both personal and company-wide sections", async () => {
    mockFetchByPath({ "/api/dashboard/me": filledPersonal, "/api/dashboard/team": filledTeam });
    renderDashboard("admin");

    await waitFor(() => expect(screen.getByText("Resumen del Equipo")).toBeInTheDocument());
    expect(screen.getByText("Top Performers")).toBeInTheDocument();
    expect(screen.getByText("Tus Métricas")).toBeInTheDocument();
  });

  it("exec role renders company-wide metrics with no create/edit/invite controls", async () => {
    mockFetchByPath({ "/api/dashboard/team": filledTeam });
    renderDashboard("exec");

    await waitFor(() => expect(screen.getByText("Top Performers")).toBeInTheDocument());
    expect(screen.getByText(/Solo lectura/i)).toBeInTheDocument();
    expect(screen.queryByText(/Invitar/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /crear|editar|nuevo/i })).not.toBeInTheDocument();
  });

  it("shows a loading state while the metrics request is in flight", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // never resolves
    renderDashboard("employee");

    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();
  });

  it("shows an empty state when the caller has zero sessions", async () => {
    mockFetchByPath({ "/api/dashboard/me": emptyPersonal });
    renderDashboard("employee");

    await waitFor(() => expect(screen.getByTestId("dashboard-empty")).toBeInTheDocument());
    expect(screen.getByText(/Todavía no practicaste/i)).toBeInTheDocument();
  });

  it("shows an empty state for admin when the company has zero activity", async () => {
    mockFetchByPath({ "/api/dashboard/me": emptyPersonal, "/api/dashboard/team": emptyTeam });
    renderDashboard("admin");

    await waitFor(() => expect(screen.getByText(/Todavía no hay actividad en el equipo/i)).toBeInTheDocument());
  });
});
