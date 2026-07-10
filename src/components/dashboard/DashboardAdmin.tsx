import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Zap, TrendingUp, Award, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DashboardCard from "./DashboardCard";
import GradText from "./GradText";
import KpiCard from "./KpiCard";
import { DashboardLoadingState, DashboardEmptyState, DashboardErrorState } from "./DashboardStates";
import { getMyDashboard, getTeamDashboard, type DashboardMetrics, type TeamDashboard } from "../../services/dashboardApi";
import { COLORS, GRAD } from "../../lib/theme";
import { formatScore, formatPercent, formatDuration } from "../../lib/dashboardFormat";

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamDashboard | null>(null);
  const [personal, setPersonal] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getTeamDashboard(), getMyDashboard()])
      .then(([teamData, personalData]) => {
        setTeam(teamData);
        setPersonal(personalData);
      })
      .catch(() => setError("No se pudo cargar el dashboard. Intentá de nuevo más tarde."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLoadingState />;
  if (error) return <DashboardErrorState message={error} />;
  if (!team || !personal) return null;

  const totalSessions = team.activityTrend.reduce((sum, p) => sum + p.sessionCount, 0);
  const hasTeamActivity = team.activeUserCount > 0 || totalSessions > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight mb-1">Resumen del Equipo</h2>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>Métricas de toda la empresa</p>
        </div>
        <button
          onClick={() => navigate("/users")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
          style={{ background: GRAD }}
        >
          <Users size={14} />
          Invitar Usuarios
        </button>
      </div>

      {!hasTeamActivity ? (
        <DashboardCard>
          <DashboardEmptyState
            title="Todavía no hay actividad en el equipo"
            description="Las métricas del equipo van a aparecer acá una vez que los vendedores empiecen a practicar."
          />
        </DashboardCard>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Usuarios Activos" value={String(team.activeUserCount)} icon={Users} gradientValue />
            <KpiCard label="Sesiones (6 sem.)" value={String(totalSessions)} icon={Zap} gradientValue />
            <KpiCard label="Puntaje Promedio" value={formatScore(team.avgTeamScore)} icon={Award} />
            <KpiCard label="Tasa de Finalización" value={formatPercent(team.completionRate)} icon={TrendingUp} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DashboardCard className="lg:col-span-2">
              <div className="text-sm font-semibold text-white mb-4">Actividad Semanal</div>
              {team.activityTrend.length === 0 ? (
                <DashboardEmptyState title="Sin datos suficientes" description="Todavía no hay sesiones completadas en las últimas semanas." />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={team.activityTrend} barGap={3}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0c0d18", border: "1px solid #334155", borderRadius: 8 }}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <Bar dataKey="sessionCount" name="Sesiones" fill="#E0177A" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </DashboardCard>

            <DashboardCard>
              <div className="text-sm font-semibold text-white mb-4">Por Categoría</div>
              <div className="space-y-3.5">
                {team.categoryBreakdown.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: "#B7C0D0" }}>{c.category}</span>
                      <span className="text-xs font-semibold text-white">{formatScore(c.avgScore)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(8,14,26,0.86)" }}>
                      <div className="h-full rounded-full" style={{ width: `${((c.avgScore ?? 0) / 10) * 100}%`, background: GRAD }} />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>

          <DashboardCard>
            <div className="text-sm font-semibold text-white mb-4">Top Performers</div>
            {team.topPerformers.length === 0 ? (
              <DashboardEmptyState title="Sin datos suficientes" description="Todavía no hay suficientes sesiones puntuadas." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      {["Rank", "Vendedor", "Puntaje Promedio", "Sesiones"].map((h) => (
                        <th key={h} className="pb-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {team.topPerformers.map((p, i) => (
                      <tr key={p.email} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className="py-3 pr-4 text-sm font-bold">
                          {i < 3 ? <GradText>#{i + 1}</GradText> : <span style={{ color: COLORS.textMuted }}>#{i + 1}</span>}
                        </td>
                        <td className="py-3 pr-4 text-sm font-medium text-white">{p.email}</td>
                        <td className="py-3 pr-4 text-white font-semibold">{formatScore(p.avgScore)}</td>
                        <td className="py-3" style={{ color: "#B7C0D0" }}>{p.sessionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardCard>
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Tus Métricas</h3>
          <button
            onClick={() => navigate("/history")}
            className="text-xs flex items-center gap-1 cursor-pointer"
            style={{ color: COLORS.textMuted }}
          >
            Ver historial <ChevronRight size={11} />
          </button>
        </div>
        {personal.sessionCount === 0 ? (
          <DashboardCard>
            <DashboardEmptyState title="Todavía no practicaste" description="Tus métricas personales van a aparecer acá." />
          </DashboardCard>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Win Rate" value={formatPercent(personal.winRate)} icon={TrendingUp} />
            <KpiCard label="Puntaje Promedio" value={formatScore(personal.avgScore)} icon={Award} />
            <KpiCard label="Sesiones" value={String(personal.sessionCount)} icon={Zap} />
            <KpiCard label="Tiempo de Práctica" value={formatDuration(personal.practiceTimeSeconds)} icon={Users} />
          </div>
        )}
      </div>
    </div>
  );
}
