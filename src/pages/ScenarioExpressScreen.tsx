import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClientPersona, Difficulty, Industry, Scenario } from "../types";
import { apiFetch } from "../services/apiClient";
import { INDUSTRIES } from "../lib/industries";

type Step = "form" | "loading" | "review";

interface FormData {
  name: string;
  industry: Industry | "";
  clientPersona: ClientPersona | "";
  difficulty: Difficulty | "";
  productName: string;
  priceRange: string;
  keyDifferentiator: string;
}

const PERSONAS: { value: ClientPersona; icon: string; label: string; desc: string }[] = [
  { value: "ANGRY",       icon: "😤", label: "Enojado",      desc: "Historial de problemas, tono agresivo" },
  { value: "DIFFICULT",   icon: "🤨", label: "Difícil",      desc: "Escéptico, muchas objeciones" },
  { value: "INDIFFERENT", icon: "😑", label: "Indiferente",  desc: "No está convencido, hay que generarle interés" },
  { value: "DEMANDING",   icon: "😠", label: "Exigente",     desc: "Quiere todo perfecto, presiona en precio" },
];

const LOADER_MESSAGES = [
  "Analizando el tipo de cliente...",
  "Generando objeciones realistas...",
  "Escribiendo el system prompt...",
  "Construyendo el FAQ...",
  "Casi listo...",
];

function parseJsonField(raw?: string): unknown[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as unknown[]; } catch { return []; }
}

export default function ScenarioExpressScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [loaderMsg, setLoaderMsg] = useState(0);
  const [apiError, setApiError] = useState("");

  const [form, setForm] = useState<FormData>({
    name: "", industry: "", clientPersona: "", difficulty: "",
    productName: "", priceRange: "", keyDifferentiator: "",
  });
  const [productDescription, setProductDescription] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | "productDescription", string>>>({});

  const [scenario, setScenario] = useState<Scenario | null>(null);
  // Campos editables en revisión
  const [editSystemPrompt,    setEditSystemPrompt]    = useState("");
  const [editObjections,      setEditObjections]      = useState<unknown[]>([]);
  const [editFaq,             setEditFaq]             = useState<unknown[]>([]);
  const [editForbidden,       setEditForbidden]       = useState<string[]>([]);
  const [newForbidden,        setNewForbidden]        = useState("");
  const [regenLoading,        setRegenLoading]        = useState<string | null>(null);
  const [regenError,          setRegenError]          = useState("");
  const [saving,              setSaving]              = useState(false);

  // Rotar mensajes del loader
  useEffect(() => {
    if (step !== "loading") return;
    const iv = setInterval(() => setLoaderMsg((m) => (m + 1) % LOADER_MESSAGES.length), 1800);
    return () => clearInterval(iv);
  }, [step]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim())            e.name = "Requerido";
    if (!form.industry)               e.industry = "Seleccioná una industria";
    if (!form.clientPersona)          e.clientPersona = "Seleccioná un tipo de cliente";
    if (!form.difficulty)             e.difficulty = "Seleccioná dificultad";
    if (!form.productName.trim())     e.productName = "Requerido";
    if (!productDescription.trim())   e.productDescription = "Requerido";
    if (!form.priceRange.trim())      e.priceRange = "Requerido";
    if (!form.keyDifferentiator.trim()) e.keyDifferentiator = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleGenerate() {
    if (!validate()) return;
    setStep("loading");
    setApiError("");
    try {
      const res = await apiFetch("/api/scenarios/express", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          industry: form.industry,
          clientPersona: form.clientPersona,
          difficulty: form.difficulty,
          productName: form.productName,
          productDescription,
          priceRange: form.priceRange,
          keyDifferentiator: form.keyDifferentiator,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Error generando el escenario");
      }
      const data = await res.json() as Scenario;
      setScenario(data);
      setEditSystemPrompt(data.systemPrompt ?? "");
      setEditObjections(parseJsonField(data.objectionsGuide));
      setEditFaq(parseJsonField(data.faq));
      setEditForbidden(parseJsonField(data.forbiddenPhrases) as string[]);
      setStep("review");
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error desconocido");
      setStep("form");
    }
  }

  async function handleRegenSection(section: string) {
    if (!scenario) return;
    setRegenLoading(section);
    setRegenError("");
    try {
      const res = await apiFetch(`/api/scenarios/${scenario.id}/regenerate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { section: string; content: string };
      if (section === "system_prompt")    setEditSystemPrompt(data.content);
      if (section === "objections_guide") setEditObjections(parseJsonField(data.content));
      if (section === "faq")              setEditFaq(parseJsonField(data.content));
      if (section === "forbidden_phrases") setEditForbidden(parseJsonField(data.content) as string[]);
    } catch {
      setRegenError("Error regenerando. Intentá de nuevo.");
    } finally {
      setRegenLoading(null);
    }
  }

  async function handleSave() {
    if (!scenario) return;
    setSaving(true);
    try {
      await apiFetch(`/api/scenarios/${scenario.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenario.name,
          clientPersona: scenario.clientPersona,
          difficulty: scenario.difficulty,
          industry: scenario.industry,
          systemPrompt: editSystemPrompt,
          productContext: scenario.productContext,
          objectionsGuide: JSON.stringify(editObjections),
          faq: JSON.stringify(editFaq),
          forbiddenPhrases: JSON.stringify(editForbidden),
          paymentInfo: scenario.paymentInfo,
          avatarVoiceId: scenario.avatarVoiceId,
          maxDurationMinutes: scenario.maxDurationMinutes,
        }),
      });
      navigate("/scenarios");
    } catch {
      setApiError("Error guardando el escenario. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // ── FORM ──────────────────────────────────────────────────────────
  if (step === "form") return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⚡</span>
            <h2 className="font-display text-2xl font-bold text-white">Escenario rápido</h2>
          </div>
          <p className="text-sm text-slate-400">Completá los campos y la IA genera el contenido completo.</p>
        </div>

        {apiError && (
          <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-6 flex items-center justify-between gap-3">
            <span>{apiError}</span>
            <button onClick={() => setApiError("")} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        <div className="space-y-8">
          {/* Nombre */}
          <Field label="Nombre del escenario" error={errors.name}>
            <div className="relative">
              <input
                type="text"
                maxLength={60}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Venta de CRM a empresa mediana"
                className={inputCls(!!errors.name)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 font-mono">
                {form.name.length}/60
              </span>
            </div>
          </Field>

          {/* Industria */}
          <Field label="Industria / Tipo de producto" error={errors.industry}>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  type="button"
                  onClick={() => setForm({ ...form, industry: ind.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                    form.industry === ind.value
                      ? "border-green-600 bg-green-950 text-green-300"
                      : "border-slate-700 bg-[#10111e] text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Tipo de cliente */}
          <Field label="Tipo de cliente" error={errors.clientPersona}>
            <div className="grid grid-cols-2 gap-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, clientPersona: p.value })}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    form.clientPersona === p.value
                      ? "border-accent bg-[#10111e]"
                      : "border-slate-800 bg-[#0c0d18] hover:border-slate-600"
                  }`}
                >
                  <div className="text-2xl mb-1">{p.icon}</div>
                  <div className="font-semibold text-sm text-white">{p.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-snug">{p.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          {/* Dificultad */}
          <Field label="Dificultad" error={errors.difficulty}>
            <div className="flex gap-3">
              {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, difficulty: d })}
                  className={`flex-1 py-2 rounded-lg text-sm font-mono border transition-colors ${
                    form.difficulty === d
                      ? d === "EASY"   ? "border-green-600 bg-green-950 text-green-300"
                      : d === "MEDIUM" ? "border-yellow-600 bg-yellow-950 text-yellow-300"
                      :                  "border-red-600 bg-red-950 text-red-300"
                      : "border-slate-700 bg-[#10111e] text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {d === "EASY" ? "Fácil" : d === "MEDIUM" ? "Medio" : "Difícil"}
                </button>
              ))}
            </div>
          </Field>

          {/* Nombre del producto */}
          <Field label="¿Qué vendés?" error={errors.productName}>
            <textarea
              rows={3}
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Ej: Software de gestión de inventario en la nube para almacenes medianos"
              className={`${inputCls(!!errors.productDescription)} resize-none`}
            />
            <input
              type="text"
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              placeholder="Nombre corto del producto (Ej: InventCloud Pro)"
              className={`${inputCls(!!errors.productName)} mt-2`}
            />
          </Field>

          {/* Precio */}
          <Field label="Precio o rango" error={errors.priceRange}>
            <input
              type="text"
              value={form.priceRange}
              onChange={(e) => setForm({ ...form, priceRange: e.target.value })}
              placeholder='Ej: USD 500/mes por empresa'
              className={inputCls(!!errors.priceRange)}
            />
          </Field>

          {/* Diferencial */}
          <Field label="Principal diferencial" error={errors.keyDifferentiator}>
            <input
              type="text"
              value={form.keyDifferentiator}
              onChange={(e) => setForm({ ...form, keyDifferentiator: e.target.value })}
              placeholder="Ej: Implementación en 48hs, sin costo de licencia inicial"
              className={inputCls(!!errors.keyDifferentiator)}
            />
          </Field>
        </div>

        <button
          onClick={handleGenerate}
          className="mt-10 w-full bg-accent hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 py-4 transition-colors font-display tracking-wide"
        >
          Generar escenario →
        </button>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => navigate("/scenarios/new")}
            className="text-sm text-slate-400 hover:text-accent transition-colors"
          >
            ← Cancelar
          </button>
        </div>
      </main>
    </div>
  );

  // ── LOADING ───────────────────────────────────────────────────────
  if (step === "loading") return (
    <div className="min-h-screen bg-[#07080d] flex items-center justify-center">
      <div className="text-center max-w-sm px-8">
        <div className="w-16 h-16 rounded-2xl bg-[#10111e] border border-slate-700 flex items-center justify-center mx-auto mb-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-white font-semibold text-lg mb-2 font-display transition-all">
          {LOADER_MESSAGES[loaderMsg]}
        </p>
        <p className="text-slate-500 text-sm">La IA está construyendo tu escenario personalizado</p>
        <div className="flex justify-center gap-1.5 mt-6">
          {LOADER_MESSAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === loaderMsg ? "w-6 bg-accent" : "w-2 bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // ── REVIEW ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col">
      <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-10 space-y-4">
        <div className="mb-2">
          <h1 className="font-display text-xl font-bold text-white">Revisión del escenario generado</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{scenario?.name}</p>
        </div>

        {apiError && (
          <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
            {apiError}
          </div>
        )}
        {regenError && (
          <div className="bg-orange-950 border border-orange-800 rounded-lg px-4 py-3 text-orange-300 text-sm">
            {regenError}
          </div>
        )}

        {/* Identidad */}
        <ReviewSection title="Identidad del escenario">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Nombre</span><p className="text-white mt-0.5">{scenario?.name}</p></div>
            <div><span className="text-slate-500">Cliente</span><p className="text-white mt-0.5">{scenario?.clientPersona}</p></div>
            <div><span className="text-slate-500">Dificultad</span><p className="text-white mt-0.5">{scenario?.difficulty}</p></div>
            <div><span className="text-slate-500">Industria</span><p className="text-white mt-0.5">{scenario?.industry ?? "—"}</p></div>
          </div>
        </ReviewSection>

        {/* System prompt */}
        <ReviewSection
          title="Personalidad del cliente"
          onRegen={() => handleRegenSection("system_prompt")}
          regenLoading={regenLoading === "system_prompt"}
        >
          <textarea
            rows={8}
            value={editSystemPrompt}
            onChange={(e) => setEditSystemPrompt(e.target.value)}
            className="w-full bg-[#07080d] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-accent resize-none"
          />
        </ReviewSection>

        {/* Objeciones */}
        <ReviewSection
          title={`Objeciones (${editObjections.length})`}
          onRegen={() => handleRegenSection("objections_guide")}
          regenLoading={regenLoading === "objections_guide"}
        >
          <div className="space-y-3">
            {(editObjections as { trigger?: string; objection?: string; hint?: string }[]).map((obj, i) => (
              <details key={i} className="bg-[#07080d] border border-slate-800 rounded-lg">
                <summary className="px-4 py-3 cursor-pointer text-sm text-slate-300 list-none flex items-center gap-2">
                  <span className="text-accent font-mono text-xs">{i + 1}.</span>
                  <span className="flex-1">{obj.objection ?? "Sin texto"}</span>
                  <span className="text-slate-600 text-xs">▾</span>
                </summary>
                <div className="px-4 pb-3 pt-1 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
                  <p><span className="text-slate-500">Trigger: </span>{obj.trigger}</p>
                  <p><span className="text-slate-500">Hint: </span>{obj.hint}</p>
                </div>
              </details>
            ))}
          </div>
        </ReviewSection>

        {/* FAQ */}
        <ReviewSection
          title={`FAQ (${editFaq.length})`}
          onRegen={() => handleRegenSection("faq")}
          regenLoading={regenLoading === "faq"}
        >
          <div className="space-y-2">
            {(editFaq as { question?: string; answer?: string }[]).map((item, i) => (
              <div key={i} className="bg-[#07080d] border border-slate-800 rounded-lg px-4 py-3">
                <p className="text-sm text-white mb-1">{item.question}</p>
                <p className="text-xs text-slate-400">{item.answer}</p>
              </div>
            ))}
          </div>
        </ReviewSection>

        {/* Frases prohibidas */}
        <ReviewSection
          title="Frases prohibidas"
          onRegen={() => handleRegenSection("forbidden_phrases")}
          regenLoading={regenLoading === "forbidden_phrases"}
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {editForbidden.map((phrase, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 bg-red-950/60 border border-red-900 text-red-300 text-xs px-2.5 py-1 rounded-full"
              >
                {phrase}
                <button
                  onClick={() => setEditForbidden(editForbidden.filter((_, j) => j !== i))}
                  className="text-red-500 hover:text-red-300 ml-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newForbidden}
              onChange={(e) => setNewForbidden(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newForbidden.trim()) {
                  setEditForbidden([...editForbidden, newForbidden.trim()]);
                  setNewForbidden("");
                }
              }}
              placeholder="Agregar frase prohibida..."
              className="flex-1 bg-[#07080d] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent"
            />
            <button
              onClick={() => {
                if (newForbidden.trim()) {
                  setEditForbidden([...editForbidden, newForbidden.trim()]);
                  setNewForbidden("");
                }
              }}
              className="bg-[#10111e] border border-slate-700 hover:border-accent text-slate-300 text-sm px-3 rounded-lg transition-colors"
            >
              +
            </button>
          </div>
        </ReviewSection>

        {/* Botones finales */}
        <div className="flex items-center gap-3 pt-4 pb-8">
          <button
            onClick={() => navigate("/scenarios/new")}
            className="text-sm text-slate-400 hover:text-accent transition-colors mr-auto"
          >
            ← Cancelar
          </button>
          <button
            onClick={() => setStep("form")}
            className="flex-1 border border-slate-700 text-slate-300 hover:text-white text-sm rounded-xl py-3 transition-colors"
          >
            ← Volver a configurar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] bg-green-700 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl py-3 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar escenario ✓"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function ReviewSection({
  title, children, onRegen, regenLoading,
}: {
  title: string;
  children: React.ReactNode;
  onRegen?: () => void;
  regenLoading?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-[#0c0d18] border border-slate-800 rounded-xl overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer select-none"
      >
        <span className="font-semibold text-white text-sm">{title}</span>
        <div className="flex items-center gap-3">
          {onRegen && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRegen(); }}
              disabled={regenLoading}
              className="text-xs text-slate-500 hover:text-accent border border-slate-700 hover:border-accent px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
            >
              {regenLoading ? "..." : "↺ Regenerar"}
            </button>
          )}
          <span className="text-slate-600 text-sm">{open ? "▾" : "▸"}</span>
        </div>
      </div>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full bg-[#10111e] border ${hasError ? "border-red-700" : "border-slate-700"} rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors text-sm`;
}
