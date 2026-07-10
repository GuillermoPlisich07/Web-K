import { apiFetch } from "./apiClient";

export interface ScorePoint {
  date: string;
  score: number;
}

export interface CategoryScore {
  category: string;
  avgScore: number | null;
}

export interface RecentSession {
  id: string;
  scenarioName: string | null;
  score: number | null;
  startedAt: string;
  durationSeconds: number | null;
}

export interface DashboardMetrics {
  sessionCount: number;
  avgScore: number | null;
  winRate: number | null;
  practiceTimeSeconds: number;
  scoreSeries: ScorePoint[];
  categoryBreakdown: CategoryScore[];
  recentSessions: RecentSession[];
}

export interface ActivityPoint {
  label: string;
  sessionCount: number;
}

export interface TopPerformer {
  email: string;
  avgScore: number | null;
  sessionCount: number;
}

export interface TeamDashboard {
  activeUserCount: number;
  activityTrend: ActivityPoint[];
  avgTeamScore: number | null;
  completionRate: number | null;
  categoryBreakdown: CategoryScore[];
  topPerformers: TopPerformer[];
}

export async function getMyDashboard(): Promise<DashboardMetrics> {
  const res = await apiFetch("/api/dashboard/me");
  if (!res.ok) throw new Error("No se pudo cargar tu dashboard.");
  return res.json();
}

export async function getTeamDashboard(): Promise<TeamDashboard> {
  const res = await apiFetch("/api/dashboard/team");
  if (!res.ok) throw new Error("No se pudo cargar el dashboard del equipo.");
  return res.json();
}
