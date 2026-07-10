import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Cell,
} from "recharts";
import { apiFetch } from "../services/apiClient";

interface SessionReport {
  id: string;
  vendorName?: string;
  scenarioName?: string;
  feedbackText: string;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  scorePersuasion: number;
  scoreConfidence: number;
  scoreProductKnowledge: number;
  scoreObjectionHandling: number;
  scorePronunciation: number;
  verbalAnalysis?: string;
  biometricSummary?: string;
  // Métricas de habla
  talkRatio?: number;
  avgSpeakingRateWpm?: number;
  longestMonologueSec?: number;
  totalQuestions?: number;
  fillerRate?: number;
  topFillers?: string;
  negativePhrases?: string;
  lexicalDiversity?: number;
  consistencyScore?: number;
  // Métricas faciales
  avgConfidenceIndex?: number;
  avgStressIndex?: number;
  avgEngagementIndex?: number;
  eyeContactRatio?: number;
  smileRatio?: number;
  browFurrowRatio?: number;
  lookingAwayEvents?: number;
  // Acústico agregado
  avgF0Mean?: number;
  avgJitter?: number;
  avgHnr?: number;
  acousticStressScore?: number;
  // Métricas adicionales
  openQuestionsRatio?: number;
  productTermsCoverage?: number;
  avgBlinkRate?: number;
  peakStressTurn?: number;
  peakConfidenceTurn?: number;
  // Sugerencias por turno
  turnSuggestions?: string;
}

interface VerbalAnalysis {
  avg_wpm?: number;
  rhythm_label?: string;
  wpm_trend?: number[];
  top_fillers?: { word: string; category: string; count: number }[];
  total_filler_count?: number;
  filler_ratio_per_100_words?: number;
  jargon_used?: string[];
  long_pauses?: number;
  total_words?: number;
  talk_ratio?: number;
  longest_monologue_sec?: number;
  total_questions?: number;
  lexical_diversity?: number;
  negative_phrases?: string[];
  consistency_score?: number;
}

interface BiometricSummary {
  avg_eye_contact_pct?: number;
  head_stability_pct?: number;
  face_emotion_distribution?: Record<string, number>;
  voice_emotion_distribution?: Record<string, number>;
  emotion_timeline?: { ts: number; emotion: string; source: string; confidence?: number }[];
  low_eye_contact_turns?: number[];
  avg_confidence_index?: number;
  avg_stress_index?: number;
  avg_engagement_index?: number;
  smile_ratio?: number;
  brow_furrow_ratio?: number;
  looking_away_events?: number;
}

function ScoreBar({ label, value }: { label: string; value: number | null | undefined }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-slate-400 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2">
        <div className="bg-accent h-2 rounded-full transition-all duration-700"
          style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="text-xs font-mono text-white w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function GaugeBar({ label, value, color }: { label: string; value: number | null | undefined; color: string }) {
  if (value == null) return null;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-mono text-slate-400">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function IndexBar({ label, value, color, max = 10 }: { label: string; value?: number | null; color: string; max?: number }) {
  if (value == null) return null;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-mono text-slate-400">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function BenchmarkRow({ metric, value, optimal, unit = "", status }: {
  metric: string; value?: number | null; optimal: string; unit?: string; status?: "ok" | "warn" | "bad";
}) {
  if (value == null) return null;
  const colors = { ok: "text-green-400", warn: "text-orange-400", bad: "text-red-400" };
  const icons = { ok: "✅", warn: "⚠", bad: "❌" };
  const s = status ?? "ok";
  return (
    <tr className="border-b border-slate-800">
      <td className="py-2 pr-4 text-xs text-slate-400 font-mono">{metric}</td>
      <td className={`py-2 pr-4 text-xs font-bold font-mono ${colors[s]}`}>{value}{unit}</td>
      <td className="py-2 pr-4 text-xs text-slate-500">{optimal}</td>
      <td className="py-2 text-sm">{icons[s]}</td>
    </tr>
  );
}

function parseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function parseList(raw: string): string[] {
  try { return JSON.parse(raw) || []; } catch { return []; }
}

export default function ReportScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<SessionReport | null>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [retries, setRetries] = useState(0);
  const [pollError, setPollError] = useState(false);

  const MAX_RETRIES = 20;

  useEffect(() => {
    if (!sessionId) return;
    const iv = setInterval(async () => {
      setRetries((n) => {
        if (n >= MAX_RETRIES) {
          clearInterval(iv);
          setLoading(false);
          setPollError(true);
          return n;
        }
        return n + 1;
      });
      try {
        const r = await apiFetch(`/api/sessions/${sessionId}/report`);
        if (r.ok) {
          const data = await r.json();
          setReport(data);
          setLoading(false);
          clearInterval(iv);
          const tr = await apiFetch(`/api/sessions/${sessionId}/transcript`);
          if (tr.ok) setTranscript(await tr.json());
        }
      } catch {
        // retry continues
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [sessionId]);

  if (pollError) {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-red-400 text-4xl mb-4">✕</p>
          <p className="text-slate-200 text-lg font-semibold mb-2">No se pudo cargar el reporte</p>
          <p className="text-slate-500 text-sm font-mono mb-6">
            El servidor tardó demasiado en responder. Revisá que el backend esté corriendo.
          </p>
          <button onClick={() => navigate("/scenarios")}
            className="bg-accent hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 py-3 transition-colors">
            Volver a escenarios
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-lg">Generando tu reporte...</p>
          <p className="text-slate-500 text-sm mt-1 font-mono">
            {retries > 0 ? `Intento ${retries}/${MAX_RETRIES}...` : "Analizando la sesion con IA"}
          </p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const va = parseJson<VerbalAnalysis>(report.verbalAnalysis);
  const bs = parseJson<BiometricSummary>(report.biometricSummary);
  const turnSuggestions: { turn: number; suggestion: string }[] =
    parseJson(report.turnSuggestions) ?? [];

  const radarData = [
    { subject: "Persuasion", A: report.scorePersuasion },
    { subject: "Confianza", A: report.scoreConfidence },
    { subject: "Conocimiento", A: report.scoreProductKnowledge },
    { subject: "Objeciones", A: report.scoreObjectionHandling },
    { subject: "Pronunciacion", A: report.scorePronunciation },
  ];

  const strengths = parseList(report.strengths);
  const weaknesses = parseList(report.weaknesses);
  const suggestions = parseList(report.suggestions);

  const overallAvg = (
    (report.scorePersuasion + report.scoreConfidence + report.scoreProductKnowledge +
      report.scoreObjectionHandling + report.scorePronunciation) / 5
  ).toFixed(1);

  const emotionTimeline = bs?.emotion_timeline || [];
  const minTs = emotionTimeline.length > 0 ? emotionTimeline[0].ts : 0;
  const timelineData = emotionTimeline
    .filter((_, i) => i % 3 === 0)
    .map((e) => ({ t: Math.round((e.ts - minTs) / 1000), conf: e.confidence ?? 0, emotion: e.emotion, source: e.source }));

  const wpmData = (va?.wpm_trend || []).map((w, i) => ({ turno: i + 1, wpm: w }));
  const fillerData = (va?.top_fillers || []).slice(0, 8).map((f) => ({
    word: `"${f.word}"`, count: f.count, cat: f.category,
  }));

  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Reporte de Sesion</h1>
            <p className="text-slate-400 text-sm">
              {report.vendorName || "Vendedor"} · {report.scenarioName || "Escenario"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-accent">{overallAvg}</div>
            <div className="text-xs font-mono text-slate-500">score general /10</div>
          </div>
        </div>

        {/* Radar + Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4">Perfil de competencias</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Radar dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-5">Puntajes detallados</h2>
            <div className="space-y-3">
              <ScoreBar label="Persuasion" value={report.scorePersuasion} />
              <ScoreBar label="Confianza" value={report.scoreConfidence} />
              <ScoreBar label="Conocimiento" value={report.scoreProductKnowledge} />
              <ScoreBar label="Objeciones" value={report.scoreObjectionHandling} />
              <ScoreBar label="Pronunciacion" value={report.scorePronunciation} />
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-3">Feedback del coach</h2>
          <p className="text-slate-300 leading-relaxed text-sm">{report.feedbackText}</p>
        </div>

        {/* Fortalezas / Debilidades / Sugerencias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-5">
            <h3 className="font-bold text-green-400 mb-3 text-sm">Fortalezas</h3>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-green-400 shrink-0 mt-0.5">✓</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-5">
            <h3 className="font-bold text-orange-400 mb-3 text-sm">Areas de mejora</h3>
            <ul className="space-y-2">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-orange-400 shrink-0 mt-0.5">!</span>{w}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-5">
            <h3 className="font-bold text-accent mb-3 text-sm">Sugerencias</h3>
            <ol className="space-y-2">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-accent shrink-0 mt-0.5 font-mono">{i + 1}.</span>{s}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Análisis biométrico */}
        {bs && (
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-5">Análisis biométrico</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <GaugeBar label="Contacto visual promedio" value={bs.avg_eye_contact_pct} color="#4ade80" />
                <GaugeBar label="Estabilidad de cabeza (mirada frontal)" value={bs.head_stability_pct} color="#22d3ee" />
                {bs.low_eye_contact_turns && bs.low_eye_contact_turns.length > 0 && (
                  <div className="bg-orange-950/40 border border-orange-800/50 rounded-lg p-3">
                    <p className="text-xs font-mono text-orange-400 mb-1">Bajo contacto visual en turnos:</p>
                    <p className="text-xs text-slate-300">{bs.low_eye_contact_turns.join(", ")}</p>
                  </div>
                )}
                {bs.voice_emotion_distribution && Object.keys(bs.voice_emotion_distribution).length > 0 && (
                  <div>
                    <p className="text-xs font-mono text-slate-400 mb-2">Emociones vocales (Hume AI)</p>
                    <div className="space-y-1.5">
                      {Object.entries(bs.voice_emotion_distribution)
                        .sort(([, a], [, b]) => b - a).slice(0, 5)
                        .map(([emotion, count]) => (
                          <div key={emotion} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-24 capitalize font-mono">{emotion}</span>
                            <div className="flex-1 bg-slate-800 h-1.5 rounded-full">
                              <div className="bg-violet-400 h-1.5 rounded-full"
                                style={{ width: `${(count / Math.max(...Object.values(bs.voice_emotion_distribution!))) * 100}%` }} />
                            </div>
                            <span className="text-xs font-mono text-slate-500">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              {timelineData.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-slate-400 mb-3">Timeline emocional (confianza)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(v) => `${v}s`} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ background: "#0c0d18", border: "1px solid #334155", borderRadius: 8 }}
                        formatter={(_: any, __: any, props: any) => [props.payload.emotion, props.payload.source]}
                        labelFormatter={(l) => `t=${l}s`}
                      />
                      <Line dataKey="conf" stroke="#818cf8" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Análisis verbal */}
        {va && (
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-5">Análisis verbal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent font-mono">{va.avg_wpm}</p>
                    <p className="text-xs text-slate-500 font-mono">palabras/min</p>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-mono ${
                      va.rhythm_label?.includes("óptimo") ? "text-green-400" :
                      (va.rhythm_label?.includes("lento") || va.rhythm_label?.includes("rápido")) ? "text-orange-400" : "text-red-400"
                    }`}>{va.rhythm_label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{va.total_words} palabras totales</p>
                  </div>
                </div>

                {va.filler_ratio_per_100_words !== undefined && (
                  <div className={`rounded-lg p-3 border ${
                    va.filler_ratio_per_100_words > 8 ? "bg-red-950/30 border-red-800/40" :
                    va.filler_ratio_per_100_words > 4 ? "bg-orange-950/30 border-orange-800/40" :
                    "bg-green-950/30 border-green-800/40"
                  }`}>
                    <p className="text-xs font-mono text-slate-400">Muletillas cada 100 palabras</p>
                    <p className={`text-xl font-bold font-mono mt-0.5 ${
                      va.filler_ratio_per_100_words > 8 ? "text-red-400" :
                      va.filler_ratio_per_100_words > 4 ? "text-orange-400" : "text-green-400"
                    }`}>{va.filler_ratio_per_100_words}</p>
                    <p className="text-xs text-slate-500">{va.total_filler_count} muletillas en total</p>
                  </div>
                )}

                {va.jargon_used && va.jargon_used.length > 0 && (
                  <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-lg p-3">
                    <p className="text-xs font-mono text-yellow-400 mb-1">Jerga corporativa detectada:</p>
                    <div className="flex flex-wrap gap-1">
                      {va.jargon_used.map((j) => (
                        <span key={j} className="text-xs bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded font-mono">{j}</span>
                      ))}
                    </div>
                  </div>
                )}

                {va.long_pauses !== undefined && va.long_pauses > 0 && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                    <p className="text-xs font-mono text-slate-400">Silencios largos (&gt;3s)</p>
                    <p className="text-lg font-bold font-mono text-slate-300">{va.long_pauses}</p>
                  </div>
                )}
              </div>

              <div>
                {fillerData.length > 0 && (
                  <div>
                    <p className="text-xs font-mono text-slate-400 mb-3">Muletillas más frecuentes</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={fillerData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
                        <YAxis type="category" dataKey="word" tick={{ fill: "#94a3b8", fontSize: 10 }} width={80} />
                        <Tooltip
                          contentStyle={{ background: "#0c0d18", border: "1px solid #334155", borderRadius: 8 }}
                          formatter={(val: any, _: any, props: any) => [`${val} veces`, props.payload.cat]}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {fillerData.map((_, i) => (
                            <Cell key={i} fill={i < 3 ? "#f87171" : "#818cf8"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {wpmData.length > 1 && (
                  <div className="mt-4">
                    <p className="text-xs font-mono text-slate-400 mb-2">Velocidad por turno (WPM)</p>
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={wpmData}>
                        <XAxis dataKey="turno" tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={(v) => `T${v}`} />
                        <YAxis hide domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ background: "#0c0d18", border: "1px solid #334155", borderRadius: 8 }}
                          formatter={(v: any) => [`${v} wpm`]} />
                        <Line dataKey="wpm" stroke="#22d3ee" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transcripcion colapsable */}
        <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl overflow-hidden">
          <button onClick={() => setTranscriptOpen(!transcriptOpen)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-800/50 transition-colors">
            <span className="font-bold text-white">Transcripcion completa</span>
            <span className="text-slate-400 font-mono text-sm">{transcriptOpen ? "▲ cerrar" : "▼ ver"}</span>
          </button>
          {transcriptOpen && (
            <div className="px-6 pb-6 space-y-3 max-h-96 overflow-y-auto">
              {transcript.map((t: any, i: number) => (
                <div key={i} className={`text-sm rounded-lg px-3 py-2 ${
                  t.speaker === "VENDOR" ? "bg-accent/10 border border-accent/20" : "bg-slate-800 border border-slate-700"
                }`}>
                  <div className="flex items-start gap-2">
                    <span className={`text-xs font-mono shrink-0 ${t.speaker === "VENDOR" ? "text-accent" : "text-cyan-400"}`}>
                      {t.speaker === "VENDOR" ? "VOS" : "CLIENTE"}
                    </span>
                    <span className="text-slate-300">{t.text}</span>
                  </div>
                  {t.speaker === "VENDOR" && (() => {
                    const sug = turnSuggestions.find(s => s.turn === t.turnNumber);
                    return sug ? (
                      <div className="mt-2 flex items-start gap-2 bg-indigo-950/40 border border-indigo-800/40 rounded-lg px-3 py-2">
                        <span className="text-indigo-400 text-xs font-mono shrink-0 mt-0.5">💡 Coach</span>
                        <p className="text-xs text-indigo-200 leading-relaxed">{sug.suggestion}</p>
                      </div>
                    ) : null;
                  })()}
                  {t.speaker === "VENDOR" && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {t.speakingRateWpm != null && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                          {Number(t.speakingRateWpm).toFixed(0)} wpm
                        </span>
                      )}
                      {t.acousticJitter != null && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${Number(t.acousticJitter) > 1.5 ? "bg-orange-900/50 text-orange-400" : "bg-slate-800 text-slate-500"}`}>
                          jitter {Number(t.acousticJitter).toFixed(2)}%
                        </span>
                      )}
                      {t.acousticHnr != null && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${Number(t.acousticHnr) < 10 ? "bg-red-900/50 text-red-400" : "bg-slate-800 text-slate-500"}`}>
                          HNR {Number(t.acousticHnr).toFixed(1)}dB
                        </span>
                      )}
                      {t.fillerCount != null && Number(t.fillerCount) > 0 && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400">
                          {t.fillerCount} muletilla{Number(t.fillerCount) > 1 ? "s" : ""}
                        </span>
                      )}
                      {t.questionCount != null && Number(t.questionCount) > 0 && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400">
                          ❓ pregunta
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {transcript.length === 0 && (
                <p className="text-slate-500 text-sm font-mono">Sin transcripcion disponible.</p>
              )}
            </div>
          )}
        </div>

        {/* Métricas de habla ampliadas */}
        {(report.talkRatio != null || va?.talk_ratio != null) && (
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-5">Tu Voz — Métricas conversacionales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Talk ratio */}
                {(report.talkRatio ?? va?.talk_ratio) != null && (() => {
                  const tr = report.talkRatio ?? va?.talk_ratio!;
                  return (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-mono text-slate-400">Talk ratio (óptimo: 43%)</span>
                        <span className={`text-xs font-bold font-mono ${tr > 65 ? "text-red-400" : tr > 55 ? "text-orange-400" : "text-green-400"}`}>{tr}%</span>
                      </div>
                      <div className="h-3 bg-slate-800 rounded-full overflow-hidden relative">
                        <div className="absolute left-0 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(tr, 100)}%`, backgroundColor: tr > 65 ? "#f87171" : tr > 55 ? "#fb923c" : "#4ade80" }} />
                        <div className="absolute h-full w-0.5 bg-yellow-400/60" style={{ left: "43%" }} />
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">Línea amarilla = óptimo 43%</p>
                    </div>
                  );
                })()}

                {/* Longest monologue */}
                {(report.longestMonologueSec ?? va?.longest_monologue_sec) != null && (() => {
                  const lm = report.longestMonologueSec ?? va?.longest_monologue_sec!;
                  return (
                    <div className={`rounded-lg p-3 border ${lm > 90 ? "bg-red-950/30 border-red-800/40" : "bg-green-950/30 border-green-800/40"}`}>
                      <p className="text-xs font-mono text-slate-400">Monólogo más largo</p>
                      <p className={`text-xl font-bold font-mono ${lm > 90 ? "text-red-400" : "text-green-400"}`}>{lm}s</p>
                      <p className="text-xs text-slate-500">Máximo recomendado: 90s</p>
                    </div>
                  );
                })()}

                {/* Questions */}
                {(report.totalQuestions ?? va?.total_questions) != null && (
                  <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                    <p className="text-xs font-mono text-slate-400">Preguntas al cliente</p>
                    <p className="text-xl font-bold font-mono text-accent">{report.totalQuestions ?? va?.total_questions}</p>
                    <p className="text-xs text-slate-500">Top performers: 11-14/hora</p>
                  </div>
                )}

                {/* Open questions ratio */}
                {report.openQuestionsRatio != null && (() => {
                  const oqr = report.openQuestionsRatio!;
                  return (
                    <div className={`rounded-lg p-3 border ${oqr < 40 ? "bg-orange-950/30 border-orange-800/40" : "bg-green-950/30 border-green-800/40"}`}>
                      <p className="text-xs font-mono text-slate-400">Preguntas abiertas vs cerradas</p>
                      <p className={`text-xl font-bold font-mono ${oqr < 40 ? "text-orange-400" : "text-green-400"}`}>{oqr}%</p>
                      <p className="text-xs text-slate-500">Óptimo: &gt;50% abiertas</p>
                    </div>
                  );
                })()}

                {/* Lexical diversity */}
                {(report.lexicalDiversity ?? va?.lexical_diversity) != null && (() => {
                  const ttr = report.lexicalDiversity ?? va?.lexical_diversity!;
                  return (
                    <div className={`rounded-lg p-3 border ${ttr < 0.35 ? "bg-red-950/30 border-red-800/40" : ttr < 0.50 ? "bg-orange-950/30 border-orange-800/40" : "bg-green-950/30 border-green-800/40"}`}>
                      <p className="text-xs font-mono text-slate-400">Diversidad léxica (TTR)</p>
                      <p className={`text-xl font-bold font-mono ${ttr < 0.35 ? "text-red-400" : ttr < 0.50 ? "text-orange-400" : "text-green-400"}`}>{ttr}</p>
                      <p className="text-xs text-slate-500">Óptimo: 0.50–0.70</p>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-4">
                {/* Negative phrases */}
                {(() => {
                  const negRaw = report.negativePhrases ?? null;
                  const negList: string[] = va?.negative_phrases ?? (negRaw ? parseList(negRaw) : []);
                  return negList.length > 0 ? (
                    <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3">
                      <p className="text-xs font-mono text-red-400 mb-2">Frases negativas detectadas ({negList.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {negList.map((p, i) => (
                          <span key={i} className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded font-mono">"{p}"</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-950/30 border border-green-800/40 rounded-lg p-3">
                      <p className="text-xs font-mono text-green-400">✓ Sin frases negativas detectadas</p>
                    </div>
                  );
                })()}

                {/* Consistency score */}
                {(report.consistencyScore ?? va?.consistency_score) != null && (() => {
                  const cs = report.consistencyScore ?? va?.consistency_score!;
                  return (
                    <div className={`rounded-lg p-3 border ${cs > 0.5 ? "bg-orange-950/30 border-orange-800/40" : "bg-green-950/30 border-green-800/40"}`}>
                      <p className="text-xs font-mono text-slate-400">Consistencia del habla</p>
                      <p className={`text-xl font-bold font-mono ${cs > 0.5 ? "text-orange-400" : "text-green-400"}`}>{cs}</p>
                      <p className="text-xs text-slate-500">Coeficiente de variación (menor = más consistente)</p>
                    </div>
                  );
                })()}

                {/* Product terms coverage */}
                {report.productTermsCoverage != null && (() => {
                  const ptc = report.productTermsCoverage!;
                  return (
                    <div className={`rounded-lg p-3 border ${ptc < 30 ? "bg-red-950/30 border-red-800/40" : ptc < 60 ? "bg-orange-950/30 border-orange-800/40" : "bg-green-950/30 border-green-800/40"}`}>
                      <p className="text-xs font-mono text-slate-400">Cobertura del producto (%)</p>
                      <p className={`text-xl font-bold font-mono ${ptc < 30 ? "text-red-400" : ptc < 60 ? "text-orange-400" : "text-green-400"}`}>{ptc}%</p>
                      <p className="text-xs text-slate-500">Términos clave del escenario mencionados</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Métricas faciales ampliadas */}
        {(report.avgConfidenceIndex != null || bs?.avg_confidence_index != null) && (
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-5">Tu Expresión — Índices compuestos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <IndexBar label="Índice de confianza" value={report.avgConfidenceIndex ?? bs?.avg_confidence_index} color="#4ade80" />
                <IndexBar label="Índice de estrés" value={report.avgStressIndex ?? bs?.avg_stress_index} color="#f87171" />
                <IndexBar label="Índice de engagement" value={report.avgEngagementIndex ?? bs?.avg_engagement_index} color="#818cf8" />
              </div>
              <div className="space-y-3">
                <GaugeBar label="Sonrisa" value={report.smileRatio ?? bs?.smile_ratio} color="#fbbf24" />
                <GaugeBar label="Ceño fruncido" value={report.browFurrowRatio ?? bs?.brow_furrow_ratio} color="#f87171" />
                {(report.lookingAwayEvents ?? bs?.looking_away_events) != null && (
                  <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                    <p className="text-xs font-mono text-slate-400">Veces que miró fuera de cámara</p>
                    <p className={`text-xl font-bold font-mono ${(report.lookingAwayEvents ?? bs?.looking_away_events)! > 5 ? "text-orange-400" : "text-green-400"}`}>
                      {report.lookingAwayEvents ?? bs?.looking_away_events}
                    </p>
                  </div>
                )}
                {report.avgBlinkRate != null && (() => {
                  const br = report.avgBlinkRate!;
                  const status = br < 10 || br > 40 ? "text-orange-400" : "text-green-400";
                  return (
                    <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                      <p className="text-xs font-mono text-slate-400">Tasa de parpadeo</p>
                      <p className={`text-xl font-bold font-mono ${status}`}>{br} bpm</p>
                      <p className="text-xs text-slate-500">Normal: 15–20 bpm; &gt;40 = nervioso</p>
                    </div>
                  );
                })()}
                {(report.peakStressTurn != null || report.peakConfidenceTurn != null) && (
                  <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-mono text-slate-400 mb-1">Momentos clave</p>
                    {report.peakStressTurn != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-red-400 w-24">Mayor estrés</span>
                        <span className="text-xs font-bold font-mono text-red-300">Turno {report.peakStressTurn}</span>
                      </div>
                    )}
                    {report.peakConfidenceTurn != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-green-400 w-24">Mayor confianza</span>
                        <span className="text-xs font-bold font-mono text-green-300">Turno {report.peakConfidenceTurn}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calidad vocal acústica */}
        {(report.avgJitter != null || report.avgHnr != null) && (
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4">Calidad vocal — Análisis acústico</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {report.avgF0Mean != null && (
                <div className="text-center bg-slate-800/40 rounded-xl p-3">
                  <p className="text-2xl font-bold font-mono text-accent">{report.avgF0Mean}</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">Hz — tono promedio</p>
                </div>
              )}
              {report.avgJitter != null && (
                <div className={`text-center rounded-xl p-3 ${report.avgJitter > 1.0 ? "bg-orange-900/30" : "bg-green-900/30"}`}>
                  <p className={`text-2xl font-bold font-mono ${report.avgJitter > 1.0 ? "text-orange-400" : "text-green-400"}`}>
                    {report.avgJitter}%
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">jitter — irregularidad vocal</p>
                  <p className="text-xs text-slate-600">óptimo &lt; 1.0%</p>
                </div>
              )}
              {report.avgHnr != null && (
                <div className={`text-center rounded-xl p-3 ${report.avgHnr < 10 ? "bg-red-900/30" : report.avgHnr < 15 ? "bg-orange-900/30" : "bg-green-900/30"}`}>
                  <p className={`text-2xl font-bold font-mono ${report.avgHnr < 10 ? "text-red-400" : report.avgHnr < 15 ? "text-orange-400" : "text-green-400"}`}>
                    {report.avgHnr}dB
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">HNR — calidad de voz</p>
                  <p className="text-xs text-slate-600">óptimo &gt; 15dB</p>
                </div>
              )}
              {report.acousticStressScore != null && (
                <div className={`text-center rounded-xl p-3 ${report.acousticStressScore > 6 ? "bg-red-900/30" : report.acousticStressScore > 4 ? "bg-orange-900/30" : "bg-green-900/30"}`}>
                  <p className={`text-2xl font-bold font-mono ${report.acousticStressScore > 6 ? "text-red-400" : report.acousticStressScore > 4 ? "text-orange-400" : "text-green-400"}`}>
                    {report.acousticStressScore}/10
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">estrés acústico</p>
                  <p className="text-xs text-slate-600">óptimo &lt; 4</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabla comparativa vs benchmarks */}
        {(report.talkRatio != null || report.avgConfidenceIndex != null) && (
          <div className="bg-[#0c0d18] border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4">Comparativa vs benchmarks (Gong Labs 2025)</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs font-mono text-slate-500 pb-2 pr-4">Métrica</th>
                  <th className="text-left text-xs font-mono text-slate-500 pb-2 pr-4">Tu score</th>
                  <th className="text-left text-xs font-mono text-slate-500 pb-2 pr-4">Óptimo</th>
                  <th className="text-left text-xs font-mono text-slate-500 pb-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                <BenchmarkRow metric="Talk ratio" value={report.talkRatio ?? va?.talk_ratio} unit="%" optimal="43%"
                  status={(report.talkRatio ?? va?.talk_ratio ?? 0) > 65 ? "bad" : (report.talkRatio ?? va?.talk_ratio ?? 0) > 55 ? "warn" : "ok"} />
                <BenchmarkRow metric="WPM promedio" value={report.avgSpeakingRateWpm ?? va?.avg_wpm} unit=" wpm" optimal="130–160 wpm"
                  status={(report.avgSpeakingRateWpm ?? va?.avg_wpm ?? 130) < 110 ? "warn" : (report.avgSpeakingRateWpm ?? va?.avg_wpm ?? 130) > 190 ? "warn" : "ok"} />
                <BenchmarkRow metric="Monólogo máximo" value={report.longestMonologueSec ?? va?.longest_monologue_sec} unit="s" optimal="< 90s"
                  status={(report.longestMonologueSec ?? va?.longest_monologue_sec ?? 0) > 90 ? "warn" : "ok"} />
                <BenchmarkRow metric="Muletillas / 100 palabras" value={report.fillerRate ?? va?.filler_ratio_per_100_words} optimal="< 3"
                  status={(report.fillerRate ?? va?.filler_ratio_per_100_words ?? 0) > 8 ? "bad" : (report.fillerRate ?? va?.filler_ratio_per_100_words ?? 0) > 4 ? "warn" : "ok"} />
                <BenchmarkRow metric="Preguntas al cliente" value={report.totalQuestions ?? va?.total_questions} optimal="11-14/hora"
                  status={(report.totalQuestions ?? va?.total_questions ?? 0) < 3 ? "warn" : "ok"} />
                <BenchmarkRow metric="Índice de confianza" value={report.avgConfidenceIndex ?? bs?.avg_confidence_index} unit="/10" optimal="> 7"
                  status={(report.avgConfidenceIndex ?? bs?.avg_confidence_index ?? 0) >= 7 ? "ok" : (report.avgConfidenceIndex ?? bs?.avg_confidence_index ?? 0) >= 5 ? "warn" : "bad"} />
                <BenchmarkRow metric="Índice de estrés" value={report.avgStressIndex ?? bs?.avg_stress_index} unit="/10" optimal="< 4"
                  status={(report.avgStressIndex ?? bs?.avg_stress_index ?? 0) <= 4 ? "ok" : (report.avgStressIndex ?? bs?.avg_stress_index ?? 0) <= 6 ? "warn" : "bad"} />
                <BenchmarkRow metric="Jitter vocal (nerviosismo)" value={report.avgJitter} unit="%" optimal="< 1.0%"
                  status={report.avgJitter == null ? "ok" : report.avgJitter < 1.0 ? "ok" : report.avgJitter < 2.5 ? "warn" : "bad"} />
                <BenchmarkRow metric="HNR vocal (calidad voz)" value={report.avgHnr} unit="dB" optimal="> 15 dB"
                  status={report.avgHnr == null ? "ok" : report.avgHnr >= 15 ? "ok" : report.avgHnr >= 10 ? "warn" : "bad"} />
                <BenchmarkRow metric="Estrés acústico" value={report.acousticStressScore} unit="/10" optimal="< 4"
                  status={report.acousticStressScore == null ? "ok" : report.acousticStressScore <= 4 ? "ok" : report.acousticStressScore <= 6 ? "warn" : "bad"} />
                <BenchmarkRow metric="Preguntas abiertas" value={report.openQuestionsRatio} unit="%" optimal="> 50%"
                  status={report.openQuestionsRatio == null ? "ok" : report.openQuestionsRatio >= 50 ? "ok" : report.openQuestionsRatio >= 30 ? "warn" : "bad"} />
                <BenchmarkRow metric="Cobertura del producto" value={report.productTermsCoverage} unit="%" optimal="> 60%"
                  status={report.productTermsCoverage == null ? "ok" : report.productTermsCoverage >= 60 ? "ok" : report.productTermsCoverage >= 30 ? "warn" : "bad"} />
                <BenchmarkRow metric="Tasa de parpadeo" value={report.avgBlinkRate} unit=" bpm" optimal="15–20 bpm"
                  status={report.avgBlinkRate == null ? "ok" : (report.avgBlinkRate >= 10 && report.avgBlinkRate <= 30) ? "ok" : "warn"} />
              </tbody>
            </table>
          </div>
        )}

        <button onClick={() => navigate("/scenarios")}
          className="w-full bg-accent hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 py-4 transition-colors">
          Nueva sesion →
        </button>
      </div>
    </div>
  );
}
