import { useEffect, useState } from "react";
import { useRole } from "../context/RoleContext";
import { isReadOnlyRole } from "../lib/permissions";
import { getEmpresa, upsertEmpresa, type Empresa } from "../services/empresaApi";

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
  const [nameError, setNameError] = useState("");
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
        }
      })
      .catch(() => setLoadError("No se pudo cargar el contexto de la empresa."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaved(false);
    if (!name.trim()) {
      setNameError("El nombre es obligatorio");
      return;
    }
    setNameError("");

    setSaving(true);
    try {
      const result = await upsertEmpresa({ name: name.trim(), context: context.trim() });
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
        <div className="bg-[#10111e] border border-slate-800 rounded-xl p-6">
          {empresa ? (
            <>
              <h3 className="font-display text-base font-bold text-white mb-2">{empresa.name}</h3>
              {empresa.context && <p className="text-sm text-slate-400 leading-relaxed">{empresa.context}</p>}
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
