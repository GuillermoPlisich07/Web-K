import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import SlideOverPanel from "../SlideOverPanel";
import {
  getUserActivity,
  type ManagedUser,
  type UserActivity,
} from "../../services/usersApi";

const ROLE_LABELS: Record<ManagedUser["role"], string> = {
  EMPLOYEE: "Vendedor",
  ADMIN: "Administrador",
  EXEC: "Autoridad",
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
  } catch {
    return "";
  }
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(user: ManagedUser, activity: UserActivity): string {
  const lines: string[] = [];
  lines.push(`Actividad de ${csvCell(`${user.firstName} ${user.lastName}`.trim() || user.email)}`);
  lines.push("");
  lines.push("Escenarios Rápidos");
  lines.push(["Nombre", "Creado", "Estado", "Sesiones", "Puntaje promedio"].map(csvCell).join(","));
  for (const s of activity.quickScenarios) {
    lines.push([
      csvCell(s.name),
      csvCell(formatDate(s.createdAt)),
      csvCell(s.enabled ? "Activo" : "Expirado/Desactivado"),
      csvCell(String(s.sessionCount)),
      csvCell(s.avgScore != null ? s.avgScore.toFixed(2) : "—"),
    ].join(","));
  }
  lines.push("");
  lines.push("Escenarios Completos");
  lines.push(["Nombre", "Estado", "Última vez completado"].map(csvCell).join(","));
  for (const s of activity.fullScenarios) {
    lines.push([
      csvCell(s.name),
      csvCell(s.completed ? "Completado" : "Pendiente"),
      csvCell(formatDate(s.lastCompletedAt)),
    ].join(","));
  }
  return lines.join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UserActivityPanel({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getUserActivity(user.id)
      .then(setActivity)
      .catch(() => setError("No se pudo cargar la actividad de este usuario."))
      .finally(() => setLoading(false));
  }, [user.id]);

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;

  function handleExport() {
    if (!activity) return;
    downloadCsv(`actividad-${displayName.replace(/\s+/g, "-").toLowerCase()}.csv`, buildCsv(user, activity));
  }

  return (
    <SlideOverPanel
      title={displayName}
      subtitle={`${ROLE_LABELS[user.role]} · ${user.email}`}
      onClose={onClose}
    >
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-[#0c0d18] border border-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && activity && (
        <div className="space-y-6">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#0c0d18] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
          >
            <Download size={13} />
            Exportar reporte (CSV)
          </button>

          <section>
            <h4 className="text-sm font-semibold text-white mb-1">Escenarios Rápidos</h4>
            <p className="text-xs text-slate-500 mb-3">
              {activity.quickScenarios.length} creado{activity.quickScenarios.length !== 1 ? "s" : ""} — solo actividad y métricas, sin acceso al contenido.
            </p>
            {activity.quickScenarios.length === 0 && (
              <p className="text-xs text-slate-600">Todavía no creó ningún Escenario Rápido.</p>
            )}
            {activity.quickScenarios.length > 0 && (
              <div className="space-y-2">
                {activity.quickScenarios.map((s) => (
                  <div key={s.id} className="bg-[#0c0d18] border border-slate-800 rounded-lg px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-white font-medium">{s.name}</span>
                      {!s.enabled && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 shrink-0">
                          Expirado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span>{formatDate(s.createdAt)}</span>
                      <span>{s.sessionCount} sesión{s.sessionCount !== 1 ? "es" : ""}</span>
                      <span>Promedio: {s.avgScore != null ? s.avgScore.toFixed(2) : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="text-sm font-semibold text-white mb-1">Escenarios Completos</h4>
            <p className="text-xs text-slate-500 mb-3">
              {activity.fullScenarios.filter((s) => s.completed).length} de {activity.fullScenarios.length} completados
            </p>
            {activity.fullScenarios.length === 0 && (
              <p className="text-xs text-slate-600">Todavía no hay Escenarios Completos activos.</p>
            )}
            {activity.fullScenarios.length > 0 && (
              <div className="space-y-1.5">
                {activity.fullScenarios.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 bg-[#0c0d18] border border-slate-800 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">{s.name}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: s.completed ? "rgba(16,185,129,0.15)" : "rgba(127,136,153,0.15)",
                        color: s.completed ? "#34D399" : "#7F8899",
                      }}
                    >
                      {s.completed ? "Completado" : "Pendiente"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </SlideOverPanel>
  );
}
