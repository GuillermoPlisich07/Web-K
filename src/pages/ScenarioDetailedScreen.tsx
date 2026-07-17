import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClientPersona, Difficulty, Industry } from "../types";
import { apiFetch } from "../services/apiClient";
import TagInput from "../components/TagInput";
// ── Local helper types ────────────────────────────────────────────────────────

interface EmpresaOption { id: string; name: string }
interface ProductoOption { id: string; name: string }

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL ?? "http://localhost:8000";

type SectionKey = "identity" | "persona" | "objections" | "faq" | "evaluation" | "voice" | "preview";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "identity", label: "Identidad" },
  { key: "persona", label: "Personalidad del cliente" },
  { key: "objections", label: "Objeciones" },
  { key: "faq", label: "FAQ" },
  { key: "evaluation", label: "Evaluación" },
  { key: "voice", label: "Voz y avatar" },
  { key: "preview", label: "Vista previa" },
];

interface Objection { trigger: string; objection: string; hint: string }
interface FaqItem { question: string; answer: string }
interface Weights { persuasion: number; confidence: number; product_knowledge: number; objection_handling: number; pronunciation: number }

const DEFAULT_WEIGHTS: Weights = { persuasion: 25, confidence: 20, product_knowledge: 25, objection_handling: 20, pronunciation: 10 };

const WEIGHT_LABELS: Record<keyof Weights, string> = {
  persuasion: "Persuasión",
  confidence: "Confianza",
  product_knowledge: "Conocimiento del producto",
  objection_handling: "Manejo de objeciones",
  pronunciation: "Pronunciación y dicción",
};

const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: "SOFTWARE_B2B", label: "Software B2B" },
  { value: "FINANZAS", label: "Servicios financieros" },
  { value: "CONSULTORIA", label: "Consultoría" },
  { value: "TELCO", label: "Telecom" },
  { value: "SEGUROS", label: "Seguros" },
  { value: "RETAIL", label: "Retail" },
  { value: "SALUD", label: "Salud" },
  { value: "OTRO", label: "Otro" },
];

const PERSONA_OPTIONS: { value: ClientPersona; label: string; desc: string; color: string }[] = [
  { value: "ANGRY", label: "Enojado", desc: "Agresivo, impaciente", color: "border-red-700 bg-red-950/50 text-red-300" },
  { value: "DIFFICULT", label: "Difícil", desc: "Escéptico, resistente", color: "border-orange-700 bg-orange-950/50 text-orange-300" },
  { value: "INDIFFERENT", label: "Indiferente", desc: "Poco interesado, distraído", color: "border-slate-600 bg-slate-800/50 text-slate-300" },
  { value: "DEMANDING", label: "Exigente", desc: "Analítico, exige detalles", color: "border-yellow-700 bg-yellow-950/50 text-yellow-300" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; color: string }[] = [
  { value: "EASY", label: "Fácil", color: "border-green-700 text-green-400 bg-green-950/40" },
  { value: "MEDIUM", label: "Media", color: "border-yellow-700 text-yellow-400 bg-yellow-950/40" },
  { value: "HARD", label: "Difícil", color: "border-red-700 text-red-400 bg-red-950/40" },
];

export default function ScenarioDetailedScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [activeSection, setActiveSection] = useState<SectionKey>("identity");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loadingInitial, setLoadingInitial] = useState(isEdit);
  const [scenarioId, setScenarioId] = useState<string | null>(id ?? null);

  // identity
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [clientPersona, setClientPersona] = useState<ClientPersona | "">("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [maxDurationMinutes, setMaxDurationMinutes] = useState(30);

  // persona
  const [systemPrompt, setSystemPrompt] = useState("");

  // objections
  const [objections, setObjections] = useState<Objection[]>([]);

  // faq
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);

  // evaluation
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);

  // voice
  const [avatarVoiceId, setAvatarVoiceId] = useState("");
  const [forbiddenPhrases, setForbiddenPhrases] = useState<string[]>([]);
  const [phraseInput, setPhraseInput] = useState("");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState("");

  // scenario context (structured builder)
  const [vendedorRol, setVendedorRol] = useState("");
  const [escenarioObjetivo, setEscenarioObjetivo] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [productoId, setProductoId] = useState("");
  const [empresaList, setEmpresaList] = useState<EmpresaOption[]>([]);
  const [productoList, setProductoList] = useState<ProductoOption[]>([]);

  // Fetch empresa & productos for the dropdowns (ADMIN only, best-effort)
  const fetchContextLists = useCallback(() => {
    apiFetch("/api/empresa")
      .then(r => r.ok ? r.json() : null)
      .then(e => {
        if (e?.id) {
          setEmpresaList([{ id: e.id, name: e.name }]);
          if (!isEdit) setIndustries(e.industries ?? []);
        }
      })
      .catch(() => { /* not critical — dropdowns just stay empty */ });
    apiFetch("/api/productos")
      .then(r => r.ok ? r.json() : [])
      .then((list: { id: string; name: string }[]) => setProductoList(list))
      .catch(() => { });
  }, []);

  useEffect(() => { fetchContextLists(); }, [fetchContextLists]);

  useEffect(() => {
    if (!isEdit || !id) return;
    apiFetch(`/api/scenarios/${id}`)
      .then(r => r.json())
      .then(s => {
        setName(s.name ?? "");
        setDescription(s.description ?? "");
        setIndustries(s.industries ?? []);
        setClientPersona(s.clientPersona ?? "");
        setDifficulty(s.difficulty ?? "");
        setMaxDurationMinutes(s.maxDurationMinutes ?? 30);
        setSystemPrompt(s.systemPrompt ?? "");
        setAvatarVoiceId(s.avatarVoiceId ?? "");
        setVendedorRol(s.vendedorRol ?? "");
        setEscenarioObjetivo(s.escenarioObjetivo ?? "");
        setEmpresaId(s.empresaId ?? "");
        setProductoId(s.productoId ?? "");
        try { const o = JSON.parse(s.objectionsGuide ?? "[]"); setObjections(Array.isArray(o) ? o : []); } catch { setObjections([]); }
        try { const f = JSON.parse(s.faq ?? "[]"); setFaqItems(Array.isArray(f) ? f : []); } catch { setFaqItems([]); }
        try { const w = JSON.parse(s.evaluationWeights ?? "{}"); setWeights({ ...DEFAULT_WEIGHTS, ...w }); } catch { setWeights(DEFAULT_WEIGHTS); }
        try { const fp = JSON.parse(s.forbiddenPhrases ?? "[]"); setForbiddenPhrases(Array.isArray(fp) ? fp : []); } catch { setForbiddenPhrases([]); }
      })
      .catch(() => setError("No se pudo cargar el escenario."))
      .finally(() => setLoadingInitial(false));
  }, [id, isEdit]);

  function buildBody() {
    return {
      name,
      description,
      clientPersona: clientPersona || "INDIFFERENT",
      difficulty: difficulty || "MEDIUM",
      industries,
      maxDurationMinutes,
      systemPrompt,
      objectionsGuide: JSON.stringify(objections),
      faq: JSON.stringify(faqItems),
      evaluationWeights: JSON.stringify(weights),
      forbiddenPhrases: JSON.stringify(forbiddenPhrases),
      avatarVoiceId,
      vendedorRol: vendedorRol || null,
      escenarioObjetivo: escenarioObjetivo || null,
      empresaId: empresaId || null,
      productoId: productoId || null,
    };
  }

  async function handleSave() {
    if (!name.trim()) { setError("El nombre es obligatorio."); setActiveSection("identity"); return; }
    if (!clientPersona) { setError("Seleccioná el tipo de cliente."); setActiveSection("identity"); return; }
    if (!difficulty) { setError("Seleccioná la dificultad."); setActiveSection("identity"); return; }
    setSaving(true);
    setError("");
    try {
      const url = scenarioId ? `/api/scenarios/${scenarioId}` : "/api/scenarios";
      const method = scenarioId ? "PUT" : "POST";
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildBody()) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setScenarioId(saved.id);
      navigate("/scenarios");
    } catch {
      setError("Error al guardar. Verificá que Spring Boot esté corriendo.");
    } finally {
      setSaving(false);
    }
  }

  async function ensureId(): Promise<string | null> {
    if (scenarioId) return scenarioId;
    if (!name.trim() || !clientPersona || !difficulty) return null;
    try {
      const res = await apiFetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) return null;
      const saved = await res.json();
      setScenarioId(saved.id);
      return saved.id;
    } catch { return null; }
  }

  async function handleAiSuggest(section: string) {
    setAiLoading(p => ({ ...p, [section]: true }));
    setError("");
    try {
      let sid = scenarioId;
      if (!sid) {
        sid = await ensureId();
        if (!sid) { setError("Completá nombre, tipo de cliente y dificultad antes de usar IA."); return; }
      }
      const res = await apiFetch(`/api/scenarios/${sid}/regenerate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (section === "system_prompt") setSystemPrompt(data.content);
      else if (section === "objections_guide") { try { setObjections(JSON.parse(data.content)); } catch { } }
      else if (section === "faq") { try { setFaqItems(JSON.parse(data.content)); } catch { } }
      else if (section === "forbidden_phrases") { try { setForbiddenPhrases(JSON.parse(data.content)); } catch { } }
    } catch {
      setError("Error al generar con IA.");
    } finally {
      setAiLoading(p => ({ ...p, [section]: false }));
    }
  }

  async function handleTtsPreview() {
    if (!avatarVoiceId.trim()) { setTtsError("Ingresá un Persona ID para escuchar la voz."); return; }
    setTtsLoading(true);
    setTtsError("");
    try {
      const res = await fetch(`${FASTAPI_URL}/tts/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: avatarVoiceId.trim(), persona: clientPersona || "DEMANDING" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const raw = atob(data.audio_base64);
      const pcm = new Int16Array(raw.length / 2);
      for (let i = 0; i < pcm.length; i++) {
        pcm[i] = (raw.charCodeAt(i * 2) & 0xff) | ((raw.charCodeAt(i * 2 + 1) & 0xff) << 8);
      }
      const ctx = new AudioContext({ sampleRate: 16000 });
      const buffer = ctx.createBuffer(1, pcm.length, 16000);
      const chan = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) chan[i] = pcm[i] / 32768;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start();
    } catch {
      setTtsError("Error al previsualizar. Verificá que FastAPI esté corriendo y el Persona ID sea válido.");
    } finally {
      setTtsLoading(false);
    }
  }

  const weightsTotal = Object.values(weights).reduce((a, b) => a + b, 0);
  const wordCount = systemPrompt.trim().split(/\s+/).filter(Boolean).length;

  function isComplete(key: SectionKey): boolean {
    switch (key) {
      case "identity": return !!name.trim() && !!clientPersona && !!difficulty;
      case "persona": return wordCount >= 30;
      case "objections": return objections.length > 0;
      case "faq": return faqItems.length > 0;
      case "evaluation": return weightsTotal === 100;
      case "voice": return !!avatarVoiceId.trim();
      case "preview": return true;
    }
  }

  const completedCount = SECTIONS.filter(s => isComplete(s.key)).length;

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center">
        <p className="text-slate-400 font-mono animate-pulse">Cargando escenario...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-8 py-4 flex items-center justify-between shrink-0">
        <button onClick={() => navigate("/scenarios")} className="text-left group">
          <h1 className="font-display text-xl font-bold text-white tracking-tight group-hover:text-accent transition-colors">
            Ventas <span className="text-accent">IA</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">Plataforma de entrenamiento</p>
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 font-mono">
            {isEdit ? "Editando escenario" : "Nuevo escenario completo"}
          </span>
          <button onClick={() => navigate("/scenarios")} className="text-sm text-slate-400 hover:text-accent transition-colors">
            ← Volver
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-slate-800 flex flex-col bg-[#09090f]">
          <nav className="flex-1 py-4 overflow-y-auto">
            {SECTIONS.map((s, i) => {
              const done = isComplete(s.key);
              const active = activeSection === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${active
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${done ? "bg-green-500" : "bg-slate-600"}`} />
                  <span className="truncate">{i + 1}. {s.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-800 space-y-2">
            <p className="text-xs text-slate-500 font-mono text-center">
              {completedCount}/{SECTIONS.length} secciones completas
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-accent hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
            >
              {saving ? "Guardando..." : "Guardar escenario"}
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            {error && (
              <div className="mb-6 bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* 1. IDENTIDAD */}
            {activeSection === "identity" && (
              <section className="space-y-6">
                <SectionHeader title="Identidad" sub="Los datos básicos que definen el escenario." />

                <Field label="Nombre del escenario *">
                  <input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="Ej: Venta de software a empresa escéptica" className="field-input" />
                  <p className="text-xs text-slate-500 mt-1 text-right">{name.length}/80</p>
                </Field>

                <Field label="Descripción breve">
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Contexto para el vendedor antes de empezar..." className="field-input resize-none" />
                </Field>

                <Field label="Industria">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {INDUSTRY_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        onClick={() => setIndustries(prev => prev.includes(o.value) ? prev.filter(i => i !== o.value) : [...prev, o.value])}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${industries.includes(o.value)
                            ? "border-accent bg-accent/20 text-white"
                            : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500"
                          }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Tipo de cliente *">
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {PERSONA_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        onClick={() => setClientPersona(o.value)}
                        className={`text-left p-4 rounded-xl border transition-all ${clientPersona === o.value
                            ? o.color + " border-2"
                            : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-500"
                          }`}
                      >
                        <p className="font-semibold text-sm">{o.label}</p>
                        <p className="text-xs mt-0.5 opacity-70">{o.desc}</p>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Dificultad *">
                  <div className="flex gap-3 mt-1">
                    {DIFFICULTY_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        onClick={() => setDifficulty(o.value)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${difficulty === o.value
                            ? o.color + " border-2"
                            : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-500"
                          }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label={`Duración máxima: ${maxDurationMinutes} min`}>
                  <input type="range" min={5} max={90} step={5} value={maxDurationMinutes} onChange={e => setMaxDurationMinutes(Number(e.target.value))} className="w-full accent-indigo-500 mt-1" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1"><span>5 min</span><span>90 min</span></div>
                </Field>

                {/* ── Structured Scenario Builder ── */}
                <div className="bg-[#0c0d18] border border-slate-700 rounded-xl p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-0.5">Contexto del escenario</h3>
                    <p className="text-xs text-slate-500">Datos estructurados usados para ensamblar el system prompt final.</p>
                  </div>

                  <Field label="Rol del vendedor">
                    <input
                      id="scenario-vendedor-rol"
                      value={vendedorRol}
                      onChange={e => setVendedorRol(e.target.value)}
                      placeholder="Ej. SDR, Account Executive, Asesor de Inversiones"
                      className="field-input"
                    />
                  </Field>

                  <Field label="Objetivo del escenario">
                    <textarea
                      id="scenario-objetivo"
                      value={escenarioObjetivo}
                      onChange={e => setEscenarioObjetivo(e.target.value)}
                      rows={2}
                      placeholder="Ej. Agendar una demo de 15 minutos, Evitar la cancelación del contrato..."
                      className="field-input resize-none"
                    />
                  </Field>

                  <Field label="Empresa vinculada">
                    <select
                      id="scenario-empresa-id"
                      value={empresaId}
                      onChange={e => setEmpresaId(e.target.value)}
                      className="field-input"
                    >
                      <option value="">— Sin empresa vinculada —</option>
                      {empresaList.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                    {empresaList.length === 0 && (
                      <p className="text-xs text-slate-600 mt-1">Configurá la empresa en Ajustes para poder vincularla aquí.</p>
                    )}
                  </Field>

                  <Field label="Producto vinculado">
                    <select
                      id="scenario-producto-id"
                      value={productoId}
                      onChange={e => setProductoId(e.target.value)}
                      className="field-input"
                    >
                      <option value="">— Sin producto vinculado —</option>
                      {productoList.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {productoList.length === 0 && (
                      <p className="text-xs text-slate-600 mt-1">Agregá productos en la sección Productos para poder vincularlos aquí.</p>
                    )}
                  </Field>
                </div>

                <NavButtons label="Siguiente: Personalidad →" onNext={() => setActiveSection("persona")} />
              </section>
            )}

            {/* 3. PERSONALIDAD */}
            {activeSection === "persona" && (
              <section className="space-y-6">
                <SectionHeader title="Personalidad del cliente" sub="El system prompt que le da vida al avatar del cliente." />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">System prompt</label>
                    <button
                      onClick={() => handleAiSuggest("system_prompt")}
                      disabled={aiLoading["system_prompt"]}
                      className="text-xs bg-violet-900/60 hover:bg-violet-800/60 border border-violet-700 text-violet-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {aiLoading["system_prompt"] ? "Generando..." : "✦ Generar borrador con IA"}
                    </button>
                  </div>
                  <textarea
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    rows={14}
                    placeholder="Instrucción completa para el avatar. Describí: personalidad, historia de fondo, cómo reacciona ante objeciones, tono de voz. Usá voseo rioplatense..."
                    className="field-input resize-none font-mono text-sm leading-relaxed"
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={wordCount >= 30 ? "text-green-400" : "text-slate-500"}>
                      {wordCount} palabras{wordCount < 30 ? " (mínimo 30)" : ""}
                    </span>
                    <span className="text-slate-500">{systemPrompt.length} caracteres</span>
                  </div>
                </div>

                <NavButtons onPrev={() => setActiveSection("identity")} label="Siguiente: Objeciones →" onNext={() => setActiveSection("objections")} />
              </section>
            )}

            {/* 4. OBJECIONES */}
            {activeSection === "objections" && (
              <section className="space-y-6">
                <div className="flex items-start justify-between">
                  <SectionHeader title="Objeciones" sub="Situaciones donde el cliente pone resistencia." />
                  <button
                    onClick={() => handleAiSuggest("objections_guide")}
                    disabled={aiLoading["objections_guide"]}
                    className="text-xs bg-violet-900/60 hover:bg-violet-800/60 border border-violet-700 text-violet-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0 mt-1"
                  >
                    {aiLoading["objections_guide"] ? "Generando..." : "✦ Sugerir con IA"}
                  </button>
                </div>

                <div className="space-y-3">
                  {objections.map((o, i) => (
                    <div key={i} className="bg-[#0c0d18] border border-slate-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-500">Objeción #{i + 1}</span>
                        <button onClick={() => setObjections(objections.filter((_, j) => j !== i))} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                          Eliminar
                        </button>
                      </div>
                      <input
                        value={o.trigger}
                        onChange={e => setObjections(objections.map((x, j) => j === i ? { ...x, trigger: e.target.value } : x))}
                        placeholder="Situación / disparador de la objeción..."
                        className="field-input text-sm"
                      />
                      <input
                        value={o.objection}
                        onChange={e => setObjections(objections.map((x, j) => j === i ? { ...x, objection: e.target.value } : x))}
                        placeholder="Texto exacto de la objeción del cliente..."
                        className="field-input text-sm"
                      />
                      <input
                        value={o.hint}
                        onChange={e => setObjections(objections.map((x, j) => j === i ? { ...x, hint: e.target.value } : x))}
                        placeholder="Pista para el vendedor (no visible al cliente)..."
                        className="field-input text-sm"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setObjections([...objections, { trigger: "", objection: "", hint: "" }])}
                  className="w-full py-3 border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-xl text-sm transition-colors"
                >
                  + Agregar objeción
                </button>

                <NavButtons onPrev={() => setActiveSection("persona")} label="Siguiente: FAQ →" onNext={() => setActiveSection("faq")} />
              </section>
            )}

            {/* 5. FAQ */}
            {activeSection === "faq" && (
              <section className="space-y-6">
                <div className="flex items-start justify-between">
                  <SectionHeader title="FAQ" sub="Preguntas frecuentes que el vendedor debe saber responder." />
                  <button
                    onClick={() => handleAiSuggest("faq")}
                    disabled={aiLoading["faq"]}
                    className="text-xs bg-violet-900/60 hover:bg-violet-800/60 border border-violet-700 text-violet-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0 mt-1"
                  >
                    {aiLoading["faq"] ? "Generando..." : "✦ Sugerir con IA"}
                  </button>
                </div>

                <div className="space-y-3">
                  {faqItems.map((f, i) => (
                    <div key={i} className="bg-[#0c0d18] border border-slate-700 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-500">Pregunta #{i + 1}</span>
                        <button onClick={() => setFaqItems(faqItems.filter((_, j) => j !== i))} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                          Eliminar
                        </button>
                      </div>
                      <input
                        value={f.question}
                        onChange={e => setFaqItems(faqItems.map((x, j) => j === i ? { ...x, question: e.target.value } : x))}
                        placeholder="¿Cuál es la pregunta del cliente?"
                        className="field-input text-sm"
                      />
                      <textarea
                        value={f.answer}
                        onChange={e => setFaqItems(faqItems.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))}
                        rows={2}
                        placeholder="Respuesta esperada del vendedor..."
                        className="field-input text-sm resize-none"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setFaqItems([...faqItems, { question: "", answer: "" }])}
                  className="w-full py-3 border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-xl text-sm transition-colors"
                >
                  + Agregar pregunta
                </button>

                <NavButtons onPrev={() => setActiveSection("objections")} label="Siguiente: Evaluación →" onNext={() => setActiveSection("evaluation")} />
              </section>
            )}

            {/* 6. EVALUACIÓN */}
            {activeSection === "evaluation" && (
              <section className="space-y-6">
                <SectionHeader title="Configuración de evaluación" sub="Peso de cada dimensión en la puntuación final. Deben sumar 100%." />

                <div className="space-y-5">
                  {(Object.keys(weights) as (keyof Weights)[]).map(k => (
                    <div key={k}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm text-slate-300">{WEIGHT_LABELS[k]}</label>
                        <span className="text-sm font-mono text-white">{weights[k]}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} step={5}
                        value={weights[k]}
                        onChange={e => setWeights({ ...weights, [k]: Number(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  ))}
                </div>

                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-mono ${weightsTotal === 100
                    ? "bg-green-950/40 border-green-800 text-green-400"
                    : "bg-red-950/40 border-red-800 text-red-400"
                  }`}>
                  <span>Total</span>
                  <span>{weightsTotal}% {weightsTotal !== 100 && `— ajustá los sliders para llegar a 100`}</span>
                </div>

                {/* Frases prohibidas */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold text-sm">Frases prohibidas</h3>
                      <p className="text-xs text-slate-400 mt-0.5">El vendedor no debe usar estas frases.</p>
                    </div>
                    <button
                      onClick={() => handleAiSuggest("forbidden_phrases")}
                      disabled={aiLoading["forbidden_phrases"]}
                      className="text-xs bg-violet-900/60 hover:bg-violet-800/60 border border-violet-700 text-violet-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {aiLoading["forbidden_phrases"] ? "Generando..." : "✦ Sugerir con IA"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {forbiddenPhrases.map((p, i) => (
                      <span key={i} className="flex items-center gap-1 bg-red-950/30 border border-red-800/60 text-red-300 text-xs px-2.5 py-1.5 rounded-lg">
                        {p}
                        <button onClick={() => setForbiddenPhrases(forbiddenPhrases.filter((_, j) => j !== i))} className="ml-1 text-red-500 hover:text-red-300">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={phraseInput}
                      onChange={e => setPhraseInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && phraseInput.trim()) {
                          e.preventDefault();
                          setForbiddenPhrases([...forbiddenPhrases, phraseInput.trim()]);
                          setPhraseInput("");
                        }
                      }}
                      placeholder='Ej: "No te preocupes, igual te va a gustar"'
                      className="field-input flex-1"
                    />
                    <button
                      onClick={() => { if (phraseInput.trim()) { setForbiddenPhrases([...forbiddenPhrases, phraseInput.trim()]); setPhraseInput(""); } }}
                      className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                <NavButtons onPrev={() => setActiveSection("faq")} label="Siguiente: Voz y avatar →" onNext={() => setActiveSection("voice")} />
              </section>
            )}

            {/* 7. VOZ Y AVATAR */}
            {activeSection === "voice" && (
              <section className="space-y-6">
                <SectionHeader title="Voz y avatar" sub="Configuración del avatar Tavus para este escenario." />

                <Field label="Tavus Persona ID">
                  <input
                    value={avatarVoiceId}
                    onChange={e => { setAvatarVoiceId(e.target.value); setTtsError(""); }}
                    placeholder="pa_xxxxxxxxxxxxxxxxx"
                    className="field-input font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    ID de la persona en Tavus CVI. Dejá vacío para usar la persona por defecto según el tipo de cliente.
                  </p>
                </Field>

                <div>
                  <button
                    onClick={handleTtsPreview}
                    disabled={ttsLoading || !avatarVoiceId.trim()}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-600 text-slate-200 text-sm px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <span>{ttsLoading ? "⏳" : "▶"}</span>
                    <span>{ttsLoading ? "Reproduciendo..." : "Escuchar voz de prueba"}</span>
                  </button>
                  {ttsError && <p className="text-red-400 text-xs mt-2">{ttsError}</p>}
                  <p className="text-xs text-slate-500 mt-1.5">
                    Reproduce una frase de muestra con la voz del avatar. Requiere que FastAPI esté corriendo.
                  </p>
                </div>

                <div className="bg-[#0c0d18] border border-slate-700 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Personas por defecto (desde .env)</h4>
                  <div className="space-y-1.5">
                    {(["ANGRY", "DIFFICULT", "INDIFFERENT", "DEMANDING"] as ClientPersona[]).map(p => (
                      <div key={p} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-500">{p}</span>
                        <span className="text-slate-400">TAVUS_PERSONA_{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <NavButtons onPrev={() => setActiveSection("evaluation")} label="Ver vista previa →" onNext={() => setActiveSection("preview")} />
              </section>
            )}

            {/* 8. VISTA PREVIA */}
            {activeSection === "preview" && (
              <section className="space-y-6">
                <SectionHeader title="Vista previa" sub="Resumen del escenario antes de guardar." />

                <div className="space-y-4">
                  <PreviewBlock label="Identidad">
                    <PreviewRow label="Nombre" value={name || "—"} />
                    <PreviewRow label="Industrias" value={industries.length > 0 ? industries.join(", ") : "—"} />
                    <PreviewRow label="Cliente" value={clientPersona || "—"} />
                    <PreviewRow label="Dificultad" value={difficulty || "—"} />
                    <PreviewRow label="Duración" value={`${maxDurationMinutes} min`} />
                    {description && <PreviewRow label="Descripción" value={description} />}
                    {vendedorRol && <PreviewRow label="Rol vendedor" value={vendedorRol} />}
                    {escenarioObjetivo && <PreviewRow label="Objetivo" value={escenarioObjetivo} />}
                    {empresaId && empresaList.find(e => e.id === empresaId) && (
                      <PreviewRow label="Empresa" value={empresaList.find(e => e.id === empresaId)!.name} />
                    )}
                    {productoId && productoList.find(p => p.id === productoId) && (
                      <PreviewRow label="Producto" value={productoList.find(p => p.id === productoId)!.name} />
                    )}
                  </PreviewBlock>



                  <PreviewBlock label="System prompt">
                    <p className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                      {systemPrompt || "—"}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">{wordCount} palabras</p>
                  </PreviewBlock>

                  <PreviewBlock label={`Objeciones (${objections.length})`}>
                    {objections.length === 0
                      ? <p className="text-xs text-slate-500">Sin objeciones definidas.</p>
                      : objections.map((o, i) => (
                        <div key={i} className="border-b border-slate-700/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                          <p className="text-xs text-slate-300">{o.objection || "—"}</p>
                          {o.hint && <p className="text-xs text-slate-500 mt-0.5">Pista: {o.hint}</p>}
                        </div>
                      ))
                    }
                  </PreviewBlock>

                  <PreviewBlock label={`FAQ (${faqItems.length} items)`}>
                    {faqItems.length === 0
                      ? <p className="text-xs text-slate-500">Sin preguntas definidas.</p>
                      : faqItems.slice(0, 4).map((f, i) => (
                        <p key={i} className="text-xs text-slate-400 border-b border-slate-700/50 pb-1.5 mb-1.5 last:border-0">
                          <span className="text-slate-300">Q:</span> {f.question || "—"}
                        </p>
                      ))
                    }
                    {faqItems.length > 4 && <p className="text-xs text-slate-500">+ {faqItems.length - 4} más</p>}
                  </PreviewBlock>

                  <PreviewBlock label="Evaluación">
                    {(Object.keys(weights) as (keyof Weights)[]).map(k => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-slate-400">{WEIGHT_LABELS[k]}</span>
                        <span className="text-slate-300 font-mono">{weights[k]}%</span>
                      </div>
                    ))}
                    <div className={`flex justify-between text-xs font-semibold mt-2 pt-2 border-t border-slate-700 ${weightsTotal === 100 ? "text-green-400" : "text-red-400"}`}>
                      <span>Total</span>
                      <span>{weightsTotal}%</span>
                    </div>
                  </PreviewBlock>

                  {forbiddenPhrases.length > 0 && (
                    <PreviewBlock label={`Frases prohibidas (${forbiddenPhrases.length})`}>
                      <div className="flex flex-wrap gap-1.5">
                        {forbiddenPhrases.map((p, i) => (
                          <span key={i} className="text-xs bg-red-950/30 border border-red-800/50 text-red-400 px-2 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </PreviewBlock>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-accent hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl py-4 transition-colors font-display"
                  >
                    {saving ? "Guardando..." : isEdit ? "Guardar cambios →" : "Crear escenario →"}
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    {completedCount}/{SECTIONS.length} secciones completas
                  </p>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-white mb-1">{title}</h2>
      <p className="text-sm text-slate-400">{sub}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function NavButtons({
  onPrev, onNext, label,
}: {
  onPrev?: () => void; onNext?: () => void; label?: string;
}) {
  return (
    <div className="flex justify-between pt-4 border-t border-slate-800">
      {onPrev
        ? <button onClick={onPrev} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">← Anterior</button>
        : <span />
      }
      {onNext && (
        <button onClick={onNext} className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors">
          {label ?? "Siguiente →"}
        </button>
      )}
    </div>
  );
}

function PreviewBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0c0d18] border border-slate-700 rounded-xl p-4">
      <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">{label}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className="text-slate-500 w-24 shrink-0">{label}</span>
      <span className="text-slate-300">{value}</span>
    </div>
  );
}
