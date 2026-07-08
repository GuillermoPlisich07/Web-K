import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext";

export default function ScenarioChoiceScreen() {
  const navigate = useNavigate();
  const { role } = useRole();

  useEffect(() => {
    if (role === "employee") navigate("/scenarios/new/express", { replace: true });
  }, [role, navigate]);

  if (role === "employee") return null;

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <button onClick={() => navigate("/scenarios")} className="text-left group">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight group-hover:text-accent transition-colors">
            Ventas <span className="text-accent">IA</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">Plataforma de entrenamiento</p>
        </button>
        <button
          onClick={() => navigate("/scenarios")}
          className="text-sm text-slate-400 hover:text-accent transition-colors"
        >
          ← Volver
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-white mb-3">
            ¿Cómo querés crear el escenario?
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Elegí el flujo que mejor se adapta a tu tiempo y nivel de detalle que necesitás.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Express */}
          <div className="bg-[#0c0d18] border border-green-900/60 hover:border-green-700/80 rounded-2xl p-7 flex flex-col gap-4 transition-all duration-200 group">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-green-950 border border-green-800 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <span className="text-xs font-mono bg-green-950 text-green-400 border border-green-800 px-2.5 py-1 rounded-full">
                ~5 min
              </span>
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-white mb-2">Escenario rápido</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Completás 3 campos básicos y la IA genera el system prompt, las objeciones, el FAQ y las frases prohibidas.
              </p>
            </div>

            <ul className="space-y-1.5 mt-auto">
              {["Generación automática con IA", "Revisión y edición del contenido", "Listo para entrenar en minutos"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-green-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate("/scenarios/new/express")}
              className="mt-2 w-full bg-green-800 hover:bg-green-700 text-green-100 text-sm font-semibold rounded-xl py-3 transition-colors"
            >
              Crear escenario rápido →
            </button>
          </div>

          {/* Detallado */}
          <div className="bg-[#0c0d18] border border-violet-900/60 hover:border-violet-700/80 rounded-2xl p-7 flex flex-col gap-4 transition-all duration-200 group">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-violet-950 border border-violet-800 flex items-center justify-center text-2xl">
                🎛
              </div>
              <span className="text-xs font-mono bg-violet-950 text-violet-400 border border-violet-800 px-2.5 py-1 rounded-full">
                30–60 min
              </span>
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-white mb-2">Escenario completo</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Control total sobre cada campo: personalidad del cliente, objeciones, rúbrica de evaluación, voz y avatar.
              </p>
            </div>

            <ul className="space-y-1.5 mt-auto">
              {["Control total sobre cada campo", "Sugerencias de IA por sección", "Rúbrica de evaluación personalizada"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-violet-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate("/scenarios/new/detailed")}
              className="mt-2 w-full bg-violet-800 hover:bg-violet-700 text-violet-100 text-sm font-semibold rounded-xl py-3 transition-colors"
            >
              Crear escenario detallado →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
