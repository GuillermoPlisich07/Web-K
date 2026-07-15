import { useEffect, useState } from "react";
import { useRole } from "../context/RoleContext";
import { isReadOnlyRole } from "../lib/permissions";
import { INDUSTRIES } from "../lib/industries";
import { getEmpresa, upsertEmpresa, type Empresa } from "../services/empresaApi";
import type { Industry } from "../types";

const INDUSTRY_LABELS: Record<Industry, string> = Object.fromEntries(
  INDUSTRIES.map((i) => [i.value, i.label])
) as Record<Industry, string>;

/**
 * Company context screen (add-users-empresa-profile) — singleton record.
 * Shows a create form when none exists yet (GET 404s), an edit form once one
 * does. Admin can submit either way; Autoridad only ever sees read-only content.
 */
export default function CompanyScreen() {
  const { role } = useRole();
  const readOnly = isReadOnlyRole(role);

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [description, setDescription] = useState("");
  const [vision, setVision] = useState("");
  const [objective, setObjective] = useState("");
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [nameError, setNameError] = useState("");
  const [industriesError, setIndustriesError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getEmpresa()
      .then((data) => {
        setEmpresa(data);
        if (data) {
          setName(data.name);
          setContext(data.context ?? "");
          setDescription(data.description ?? "");
          setVision(data.vision ?? "");
          setObjective(data.objective ?? "");
          setIndustries(data.industries ?? []);
        }
      })
      .catch(() => setLoadError("No se pudo cargar el contexto de la empresa."))
      .finally(() => setLoading(false));
  }, []);

  function toggleIndustry(value: Industry) {
    setIndustries((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaved(false);

    let hasError = false;
    if (!name.trim()) {
      setNameError("El nombre es obligatorio");
      hasError = true;
    } else {
      setNameError("");
    }
    if (industries.length === 0) {
      setIndustriesError("Seleccioná al menos una industria");
      hasError = true;
    } else {
      setIndustriesError("");
    }
    if (hasError) return;

    setSaving(true);
    try {
      const result = await upsertEmpresa({
        name: name.trim(),
        context: context.trim(),
        description: description.trim(),
        vision: vision.trim(),
        objective: objective.trim(),
        industries,
      });
      setEmpresa(result);
      setSaved(true);
    } catch {
      setSaveError("No se pudo guardar el contexto de la empresa. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto w-full px-8 py-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight mb-1">Empresa</h2>
        <p className="text-sm text-slate-500">Contexto y configuración de la empresa</p>
      </div>

      {loading && <div className="h-40 rounded-xl bg-[#10111e] border border-slate-800 animate-pulse" />}

      {loadError && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-6">
          {loadError}
        </div>
      )}

      {!loading && !loadError && readOnly && (
        <div className="bg-[#10111e] border border-slate-800 rounded-xl p-6 space-y-4">
          {empresa ? (
            <>
              <div>
                <h3 className="font-display text-base font-bold text-white mb-2">{empresa.name}</h3>
                {empresa.industries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {empresa.industries.map((i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-300"
                      >
                        {INDUSTRY_LABELS[i] ?? i}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {empresa.description && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Descripción</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{empresa.description}</p>
                </div>
              )}
              {empresa.vision && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Visión</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{empresa.vision}</p>
                </div>
              )}
              {empresa.objective && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Objetivo</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{empresa.objective}</p>
                </div>
              )}
              {empresa.context && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contexto</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{empresa.context}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm">Todavía no se cargó el contexto de la empresa.</p>
          )}
        </div>
      )}

      {!loading && !loadError && !readOnly && (
        <form onSubmit={handleSubmit} noValidate className="bg-[#10111e] border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-white mb-1">
            {empresa ? "Editar empresa" : "Crear empresa"}
          </h3>

          {saveError && <p className="text-xs text-red-400">{saveError}</p>}
          {saved && <p className="text-xs text-emerald-400">Contexto guardado.</p>}

          <div>
            <label htmlFor="empresa-name" className="block text-sm font-medium text-slate-400 mb-2">
              Nombre
            </label>
            <input
              id="empresa-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); }}
              className="field-input"
              placeholder="Ej: Konverza SA"
            />
            {nameError && <p className="text-xs text-red-400 mt-1.5">{nameError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Industrias</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  type="button"
                  onClick={() => toggleIndustry(ind.value)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    backgroundColor: industries.includes(ind.value) ? "rgba(99,102,241,0.15)" : "transparent",
                    borderColor: industries.includes(ind.value) ? "#6366F1" : "rgba(255,255,255,0.1)",
                    color: industries.includes(ind.value) ? "#A5B4FC" : "#7F8899",
                  }}
                >
                  {ind.label}
                </button>
              ))}
            </div>
            {industriesError && <p className="text-xs text-red-400 mt-1.5">{industriesError}</p>}
          </div>

          <div>
            <label htmlFor="empresa-description" className="block text-sm font-medium text-slate-400 mb-2">
              Descripción
            </label>
            <textarea
              id="empresa-description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
              rows={3}
              className="field-input resize-none"
              placeholder="¿Qué hace la empresa?"
            />
          </div>

          <div>
            <label htmlFor="empresa-vision" className="block text-sm font-medium text-slate-400 mb-2">
              Visión
            </label>
            <textarea
              id="empresa-vision"
              value={vision}
              onChange={(e) => { setVision(e.target.value); setSaved(false); }}
              rows={2}
              className="field-input resize-none"
              placeholder="¿A dónde quiere llegar la empresa?"
            />
          </div>

          <div>
            <label htmlFor="empresa-objective" className="block text-sm font-medium text-slate-400 mb-2">
              Objetivo
            </label>
            <textarea
              id="empresa-objective"
              value={objective}
              onChange={(e) => { setObjective(e.target.value); setSaved(false); }}
              rows={2}
              className="field-input resize-none"
              placeholder="Objetivo actual de la empresa"
            />
          </div>

          <div>
            <label htmlFor="empresa-context" className="block text-sm font-medium text-slate-400 mb-2">
              Contexto
            </label>
            <textarea
              id="empresa-context"
              value={context}
              onChange={(e) => { setContext(e.target.value); setSaved(false); }}
              rows={6}
              className="field-input resize-none"
              placeholder="Información de contexto de la empresa"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
          >
            {saving ? "Guardando..." : empresa ? "Guardar cambios" : "Crear empresa"}
          </button>
        </form>
      )}
    </main>
  );
}
