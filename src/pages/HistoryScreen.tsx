import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from "../types";

const SPRING_URL = import.meta.env.VITE_SPRING_URL ?? "http://localhost:8080";

export default function HistoryScreen() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    fetch(`${SPRING_URL}/api/sessions`)
      .then((r) => r.json())
      .then(setSessions)
      .catch(console.error);
  }, []);

  return (
    <div className="text-white">
      <div className="max-w-4xl mx-auto px-8 py-10">
        {sessions.length === 0 ? (
          <p className="text-slate-500 font-mono text-sm">No hay sesiones completadas aun.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/report/${s.id}`)}
                className="w-full text-left bg-[#0c0d18] border border-slate-800 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white text-sm">{s.vendorName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.scenario?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-accent font-mono font-bold text-lg">
                      {s.overallScore ? s.overallScore.toFixed(1) : "--"}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {s.durationSeconds
                        ? `${Math.floor(s.durationSeconds / 60)}m ${s.durationSeconds % 60}s`
                        : ""}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
