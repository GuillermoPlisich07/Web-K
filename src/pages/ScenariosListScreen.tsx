import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ModalPortal from "../components/ModalPortal";
import { Scenario, ClientPersona, Difficulty, Industry } from "../types";
import { useSessionStore } from "../store/sessionStore";
import { useRole } from "../context/RoleContext";
import { getVendorName, setVendorName as persistVendorName } from "../lib/identity";
import { apiFetch } from "../services/apiClient";
import { isReadOnlyRole } from "../lib/permissions";

async function setScenarioEnabled(id: string, enabled: boolean): Promise<Scenario> {
  const res = await apiFetch(`/api/scenarios/${id}/enabled`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("No se pudo actualizar el estado del escenario.");
  return res.json();
}

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL ?? "http://localhost:8000";

const personaBadge: Record<ClientPersona, { label: string; color: string }> = {
  ANGRY:       { label: "Enojado",      color: "bg-red-900 text-red-300 border border-red-700" },
  DIFFICULT:   { label: "Difícil",      color: "bg-orange-900 text-orange-300 border border-orange-700" },
  INDIFFERENT: { label: "Indiferente",  color: "bg-slate-700 text-slate-300 border border-slate-600" },
  DEMANDING:   { label: "Exigente",     color: "bg-yellow-900 text-yellow-300 border border-yellow-700" },
};

const difficultyBadge: Record<Difficulty, { label: string; color: string }> = {
  EASY:   { label: "Fácil",   color: "text-green-400 bg-green-950 border border-green-800" },
  MEDIUM: { label: "Medio",   color: "text-yellow-400 bg-yellow-950 border border-yellow-800" },
  HARD:   { label: "Difícil", color: "text-red-400 bg-red-950 border border-red-800" },
};

const industryLabel: Partial<Record<Industry, string>> = {
  SOFTWARE_B2B: "Software B2B",
  FINANZAS:     "Servicios financieros",
  CONSULTORIA:  "Consultoría",
  TELCO:        "Telecomunicaciones",
  SEGUROS:      "Seguros",
  RETAIL:       "Retail",
  SALUD:        "Salud",
  OTRO:         "Otro",
};

const PERSONA_OPTIONS: { value: ClientPersona | "ALL"; label: string }[] = [
  { value: "ALL",         label: "Todos los clientes" },
  { value: "ANGRY",       label: "Enojado" },
  { value: "DIFFICULT",   label: "Difícil" },
  { value: "INDIFFERENT", label: "Indiferente" },
  { value: "DEMANDING",   label: "Exigente" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty | "ALL"; label: string }[] = [
  { value: "ALL",    label: "Toda dificultad" },
  { value: "EASY",   label: "Fácil" },
  { value: "MEDIUM", label: "Medio" },
  { value: "HARD",   label: "Difícil" },
];

const INDUSTRY_OPTIONS: { value: Industry | "ALL"; label: string }[] = [
  { value: "ALL",          label: "Toda industria" },
  { value: "SOFTWARE_B2B", label: "Software B2B" },
  { value: "FINANZAS",     label: "Servicios financieros" },
  { value: "CONSULTORIA",  label: "Consultoría" },
  { value: "TELCO",        label: "Telecomunicaciones" },
  { value: "SEGUROS",      label: "Seguros" },
  { value: "RETAIL",       label: "Retail" },
  { value: "SALUD",        label: "Salud" },
  { value: "OTRO",         label: "Otro" },
];

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("es-UY", {
      day: "2-digit", month: "short", year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "";
  }
}

export default function ScenariosListScreen() {
  const navigate = useNavigate();
  const { setSession, setTavusUrl, reset } = useSessionStore();
  const { role } = useRole();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  const [filterPersona,    setFilterPersona]    = useState<ClientPersona | "ALL">("ALL");
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "ALL">("ALL");
  const [filterIndustry,   setFilterIndustry]   = useState<Industry | "ALL">("ALL");

  const [trainModal, setTrainModal] = useState<Scenario | null>(null);
  const [deleteModal, setDeleteModal] = useState<Scenario | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [vendorName, setVendorName] = useState(() => getVendorName());
  const [starting,   setStarting]   = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    apiFetch("/api/scenarios")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setScenarios(data); setLoading(false); })
      .catch(() => { setError("No se pudo conectar con el servidor."); setLoading(false); });
  }, []);

  // El backend ya escopa la lista (propios escenarios rápidos + completos activos,
  // o todos los completos para admin) — scenario-privacy-and-lifecycle.
  const filtered = useMemo(() => scenarios.filter((s) => {
    if (filterPersona    !== "ALL" && s.clientPersona !== filterPersona)    return false;
    if (filterDifficulty !== "ALL" && s.difficulty    !== filterDifficulty) return false;
    if (filterIndustry   !== "ALL" && !s.industries?.includes(filterIndustry)) return false;
    return true;
  }), [scenarios, filterPersona, filterDifficulty, filterIndustry]);

  async function handleStartTraining() {
    if (!vendorName.trim()) { setStartError("Ingresá tu nombre."); return; }
    if (!trainModal) return;
    setStarting(true);
    setStartError("");
    persistVendorName(vendorName.trim());
    try {
      const sessionRes = await apiFetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: trainModal.id, vendorName: vendorName.trim() }),
      });
      if (!sessionRes.ok) throw new Error();
      const session = await sessionRes.json();

      const startRes = await fetch(`${FASTAPI_URL}/session/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session.delegatedToken ? { Authorization: `Bearer ${session.delegatedToken}` } : {}),
        },
        body: JSON.stringify({
          session_id: session.id,
          scenario_id: trainModal.id,
          vendor_name: vendorName.trim(),
        }),
      });
      if (startRes.status === 401) {
        setStartError("No se pudo autenticar la sesión de entrenamiento. Intentá de nuevo.");
        return;
      }
      const startData = startRes.ok ? await startRes.json() : {};
      reset();
      setTavusUrl(startData.conversation_url ?? null);
      setSession(session.id, trainModal.id, vendorName.trim(), session.delegatedToken ?? null);
      navigate("/session");
    } catch {
      setStartError("Error al iniciar. Verificá que los servidores estén corriendo.");
    } finally {
      setStarting(false);
    }
  }

  async function handleToggleEnabled(scenario: Scenario) {
    try {
      const updated = await setScenarioEnabled(scenario.id, !scenario.enabled);
      setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      setError("No se pudo actualizar el estado del escenario.");
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/scenarios/${deleteModal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setScenarios((prev) => prev.filter((s) => s.id !== deleteModal.id));
      setDeleteModal(null);
    } catch {
      // silently close — list will still show correct state on next load
      setDeleteModal(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="text-slate-100">
      <main className="max-w-7xl mx-auto w-full px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Escenarios de entrenamiento</h2>
            <p className="text-sm text-slate-400 mt-1">
              {loading
                ? "Cargando..."
                : `${filtered.length} de ${scenarios.length} escenario${scenarios.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={filterPersona}    options={PERSONA_OPTIONS}    onChange={(v) => setFilterPersona(v as ClientPersona | "ALL")} />
            <FilterSelect value={filterDifficulty} options={DIFFICULTY_OPTIONS} onChange={(v) => setFilterDifficulty(v as Difficulty | "ALL")} />
            <FilterSelect value={filterIndustry}   options={INDUSTRY_OPTIONS}   onChange={(v) => setFilterIndustry(v as Industry | "ALL")} />
            {(filterPersona !== "ALL" || filterDifficulty !== "ALL" || filterIndustry !== "ALL") && (
              <button
                onClick={() => { setFilterPersona("ALL"); setFilterDifficulty("ALL"); setFilterIndustry("ALL"); }}
                className="text-xs text-slate-500 hover:text-accent transition-colors px-2"
              >
                Limpiar ✕
              </button>
            )}
            {!isReadOnlyRole(role) && (
              <button
                onClick={() => navigate(role === "employee" ? "/scenarios/new/express" : "/scenarios/new")}
                className="bg-accent hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
              >
                + Nuevo escenario
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-[#10111e] border border-slate-800 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500 text-sm mb-4">No hay escenarios que coincidan con los filtros.</p>
            <button
              onClick={() => { setFilterPersona("ALL"); setFilterDifficulty("ALL"); setFilterIndustry("ALL"); }}
              className="text-accent text-sm hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onTrain={() => { setTrainModal(scenario); setVendorName(""); setStartError(""); }}
                onEdit={role === "admin" ? () => navigate(`/scenarios/${scenario.id}/edit`) : undefined}
                onDelete={role === "admin" ? () => setDeleteModal(scenario) : undefined}
                onToggleEnabled={
                  role === "admin" && scenario.createdBy === "MANUAL"
                    ? () => handleToggleEnabled(scenario)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal: confirmar borrado de escenario express */}
      {deleteModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteModal(null); }}
          >
            <div className="bg-[#10111e] border border-red-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-display text-lg font-bold text-white mb-2">¿Eliminar escenario?</h3>
              <p className="text-sm text-slate-400 mb-1 leading-relaxed">
                <span className="text-white font-medium">{deleteModal.name}</span>
              </p>
              <p className="text-xs text-slate-500 mb-5">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 border border-slate-700 text-slate-300 hover:text-white text-sm rounded-lg py-2.5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
                >
                  {deleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: ingresar nombre para entrenar */}
      {trainModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setTrainModal(null); }}
          >
            <div className="bg-[#10111e] border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-display text-lg font-bold text-white mb-1 leading-tight">
                {trainModal.name}
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">{trainModal.description}</p>

              <label className="block text-sm font-medium text-slate-400 mb-2">Tu nombre</label>
              <input
                type="text"
                autoFocus
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartTraining()}
                placeholder="Ej: Martín González"
                className="w-full bg-[#07080d] border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors mb-1"
              />
              {startError && <p className="text-red-400 text-xs mb-3 mt-1">{startError}</p>}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setTrainModal(null)}
                  className="flex-1 border border-slate-700 text-slate-300 hover:text-white text-sm rounded-lg py-2.5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStartTraining}
                  disabled={starting || !vendorName.trim()}
                  className="flex-1 bg-accent hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
                >
                  {starting ? "Iniciando..." : "Entrenar →"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

function ScenarioCard({
  scenario,
  onTrain,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  scenario: Scenario;
  onTrain: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleEnabled?: () => void;
}) {
  const persona  = personaBadge[scenario.clientPersona];
  const diff     = difficultyBadge[scenario.difficulty];
  const industryText = scenario.industries?.length ? scenario.industries.map(ind => industryLabel[ind] ?? ind).join(", ") : null;
  const isAI     = scenario.createdBy === "EXPRESS_AI";

  return (
    <div className="bg-[#0c0d18] border border-slate-800 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white text-sm leading-snug flex-1">{scenario.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-mono ${persona.color}`}>
          {persona.label}
        </span>
      </div>

      {!scenario.enabled && (
        <span className="self-start text-[10px] px-2 py-0.5 rounded-full font-mono bg-red-950 text-red-400 border border-red-800">
          Desactivado
        </span>
      )}

      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{scenario.description}</p>

      {/* Objetivo del escenario */}
      {scenario.escenarioObjetivo && (
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
          <span className="text-slate-500 mr-1">🎯</span>
          {scenario.escenarioObjetivo}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${diff.color}`}>
          {diff.label}
        </span>
        {industryText && (
          <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-400 border border-slate-700">
            {industryText}
          </span>
        )}
        {/* Rol del vendedor badge */}
        {scenario.vendedorRol && (
          <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
            {scenario.vendedorRol}
          </span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
          isAI
            ? "bg-violet-950 text-violet-300 border border-violet-800"
            : "bg-slate-800 text-slate-500 border border-slate-700"
        }`}>
          {isAI ? "✦ IA" : "Manual"}
        </span>
      </div>

      {scenario.createdAt && (
        <p className="text-xs text-slate-600 font-mono">{formatDate(scenario.createdAt)}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onTrain}
          disabled={!scenario.enabled}
          className="flex-1 bg-accent hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg py-2 transition-colors"
        >
          Entrenar
        </button>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex-1 bg-[#10111e] hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs rounded-lg py-2 transition-colors"
          >
            Editar
          </button>
        )}
        {onToggleEnabled && (
          <button
            onClick={onToggleEnabled}
            className="bg-[#10111e] hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs rounded-lg px-2.5 py-2 transition-colors"
            title={scenario.enabled ? "Desactivar escenario" : "Activar escenario"}
          >
            {scenario.enabled ? "Desactivar" : "Activar"}
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="bg-[#10111e] hover:bg-red-950 border border-slate-700 hover:border-red-800 text-slate-500 hover:text-red-400 text-xs rounded-lg px-2.5 py-2 transition-colors"
            title="Eliminar escenario"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}


function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#10111e] border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-accent transition-colors cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
