import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateMyProfile } from "../services/profileApi";
import { useAuthStore } from "../store/authStore";
import { logout as logoutRequest } from "../services/apiClient";

type FieldErrors = { age?: string; personality?: string; selfDescription?: string };

/**
 * Mandatory, unskippable first-login profile capture (add-users-empresa-profile).
 * Rendered by AppShell in place of the entire app chrome (no Sidebar/TopBar/
 * Outlet) whenever authStore.profileCompleted is false — there is no route to
 * navigate away from and no close/skip control, only submit or log out
 * (design.md's "Gate lives in AppShell, not as a route" decision).
 */
export default function ProfileCompletionGate() {
  const navigate = useNavigate();
  const setProfileCompleted = useAuthStore((s) => s.setProfileCompleted);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [age, setAge] = useState("");
  const [personality, setPersonality] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    await logoutRequest();
    clearSession();
    navigate("/login", { replace: true });
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    const ageNum = Number(age);
    if (!age.trim() || !Number.isInteger(ageNum) || ageNum < 16 || ageNum > 120) {
      errors.age = "Ingresá una edad válida (16-120)";
    }
    if (!personality.trim()) errors.personality = "Contanos tu personalidad";
    if (!selfDescription.trim()) errors.selfDescription = "Contanos quién sos";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setSaving(true);
    try {
      await updateMyProfile({
        age: Number(age),
        personality: personality.trim(),
        selfDescription: selfDescription.trim(),
      });
      setProfileCompleted(true);
    } catch {
      setFormError("No se pudo guardar tu perfil. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#080B11" }}>
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: "#0F1724", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl font-bold text-white tracking-tight mb-1">Completá tu perfil</h2>
        <p className="text-sm text-slate-400 mb-6">
          Antes de continuar necesitamos algunos datos tuyos. Esto solo se pide una vez.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <div role="alert" className="text-xs text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="gate-age" className="block text-sm font-medium text-slate-400 mb-2">
              Edad
            </label>
            <input
              id="gate-age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="field-input"
              placeholder="Ej: 28"
            />
            {fieldErrors.age && <p className="text-xs text-red-400 mt-1.5">{fieldErrors.age}</p>}
          </div>

          <div>
            <label htmlFor="gate-personality" className="block text-sm font-medium text-slate-400 mb-2">
              Personalidad
            </label>
            <input
              id="gate-personality"
              type="text"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="field-input"
              placeholder="Ej: Analítico, extrovertido"
            />
            {fieldErrors.personality && <p className="text-xs text-red-400 mt-1.5">{fieldErrors.personality}</p>}
          </div>

          <div>
            <label htmlFor="gate-self-description" className="block text-sm font-medium text-slate-400 mb-2">
              ¿Quién soy?
            </label>
            <textarea
              id="gate-self-description"
              value={selfDescription}
              onChange={(e) => setSelfDescription(e.target.value)}
              rows={4}
              className="field-input resize-none"
              placeholder="Contanos brevemente sobre vos"
            />
            {fieldErrors.selfDescription && (
              <p className="text-xs text-red-400 mt-1.5">{fieldErrors.selfDescription}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-accent hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors mt-2"
          >
            {saving ? "Guardando..." : "Continuar"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-center text-xs text-slate-500 hover:text-white transition-colors mt-5"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
