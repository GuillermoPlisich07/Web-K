import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Zap, Star, Clock, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import DashboardCard from "./DashboardCard";
import KpiCard from "./KpiCard";
import { DashboardLoadingState, DashboardEmptyState, DashboardErrorState } from "./DashboardStates";
import { getMyDashboard, type DashboardMetrics } from "../../services/dashboardApi";
import { COLORS, GRAD } from "../../lib/theme";
import { formatScore, formatPercent, formatDuration, formatDate } from "../../lib/dashboardFormat";

export default function DashboardEmployee() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyDashboard()
      .then((res) => setData(res))
      .catch(() => setError("No se pudo cargar tu dashboard. Intentá de nuevo más tarde."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLoadingState />;
  if (error) return <DashboardErrorState message={error} />;
  if (!data) return null;

  if (data.sessionCount === 0) {
    return (
      <DashboardCard>
        <DashboardEmptyState
          title="Todavía no practicaste ninguna sesión"
          description="Empezá a entrenar para ver tus métricas de rendimiento acá."
        />
        <div className="flex justify-center">
          <button
            onClick={() => navigate("/scenarios")}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
            style={{ background: GRAD }}
          >
            Ir a Escenarios
          </button>
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Win Rate" value={formatPercent(data.winRate)} icon={TrendingUp} gradientValue />
        <KpiCard label="Puntaje Promedio" value={formatScore(data.avgScore)} icon={Star} gradientValue />
        <KpiCard label="Sesiones" value={String(data.sessionCount)} icon={Zap} />
        <KpiCard label="Tiempo de Práctica" value={formatDuration(data.practiceTimeSeconds)} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardCard className="lg:col-span-2">
          <div className="text-sm font-semibold text-white mb-4">Tendencia de Puntaje</div>
          {data.scoreSeries.length === 0 ? (
            <DashboardEmptyState title="Sin datos suficientes" description="Completá más sesiones para ver tu tendencia." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data.scoreSeries.map((p) => ({ ...p, dateLabel: formatDate(p.date) }))}>
                <XAxis dataKey="dateLabel" tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0c0d18", border: "1px solid #334155", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="#E0177A" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm font-semibold text-white mb-4">Desglose por Habilidad</div>
          <div className="space-y-3">
            {data.categoryBreakdown.map((c) => (
              <div key={c.category}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: "#B7C0D0" }}>{c.category}</span>
                  <span className="text-xs font-semibold text-white">{formatScore(c.avgScore)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(8,14,26,0.86)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${((c.avgScore ?? 0) / 10) * 100}%`, background: GRAD }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <DashboardCard>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-white">Sesiones Recientes</div>
          <button
            onClick={() => navigate("/history")}
            className="text-xs flex items-center gap-1 cursor-pointer"
            style={{ color: COLORS.textMuted }}
          >
            Ver todas <ChevronRight size={11} />
          </button>
        </div>
        <div className="space-y-1">
          {data.recentSessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{s.scenarioName ?? "Escenario"}</div>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>
                  {formatDate(s.startedAt)} · {s.durationSeconds != null ? formatDuration(s.durationSeconds) : "—"}
                </div>
              </div>
              <div className="text-sm font-bold text-white">{formatScore(s.score)}</div>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
