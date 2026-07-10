import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "../services/profileApi";

type FieldErrors = { age?: string; personality?: string; selfDescription?: string };

/**
 * Account settings — currently just the self-service profile section
 * (add-users-empresa-profile). Same fields as the mandatory first-login gate,
 * but editable afterward with no gate behavior: the profile is already
 * complete by the time a user can reach this screen.
 */
export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [age, setAge] = useState("");
  const [personality, setPersonality] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        setAge(profile.age != null ? String(profile.age) : "");
        setPersonality(profile.personality ?? "");
        setSelfDescription(profile.selfDescription ?? "");
      })
      .catch(() => setLoadError("No se pudo cargar tu perfil."))
      .finally(() => setLoading(false));
  }, []);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaved(false);
    if (!validate()) return;

    setSaving(true);
    try {
      await updateMyProfile({
        age: Number(age),
        personality: personality.trim(),
        selfDescription: selfDescription.trim(),
      });
      setSaved(true);
    } catch {
      setSaveError("No se pudo guardar tu perfil. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto w-full px-8 py-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight mb-1">Settings</h2>
        <p className="text-sm text-slate-500">Tu perfil personal</p>
      </div>

      {loading && <div className="h-40 rounded-xl bg-[#10111e] border border-slate-800 animate-pulse" />}

      {loadError && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-6">
          {loadError}
        </div>
      )}

      {!loading && !loadError && (
        <form onSubmit={handleSubmit} noValidate className="bg-[#10111e] border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-white mb-1">Perfil</h3>

          {saveError && <p className="text-xs text-red-400">{saveError}</p>}
          {saved && <p className="text-xs text-emerald-400">Perfil guardado.</p>}

          <div>
            <label htmlFor="settings-age" className="block text-sm font-medium text-slate-400 mb-2">
              Edad
            </label>
            <input
              id="settings-age"
              type="number"
              value={age}
              onChange={(e) => { setAge(e.target.value); setSaved(false); }}
              className="field-input"
            />
            {fieldErrors.age && <p className="text-xs text-red-400 mt-1.5">{fieldErrors.age}</p>}
          </div>

          <div>
            <label htmlFor="settings-personality" className="block text-sm font-medium text-slate-400 mb-2">
              Personalidad
            </label>
            <input
              id="settings-personality"
              type="text"
              value={personality}
              onChange={(e) => { setPersonality(e.target.value); setSaved(false); }}
              className="field-input"
            />
            {fieldErrors.personality && <p className="text-xs text-red-400 mt-1.5">{fieldErrors.personality}</p>}
          </div>

          <div>
            <label htmlFor="settings-self-description" className="block text-sm font-medium text-slate-400 mb-2">
              ¿Quién soy?
            </label>
            <textarea
              id="settings-self-description"
              value={selfDescription}
              onChange={(e) => { setSelfDescription(e.target.value); setSaved(false); }}
              rows={4}
              className="field-input resize-none"
            />
            {fieldErrors.selfDescription && (
              <p className="text-xs text-red-400 mt-1.5">{fieldErrors.selfDescription}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </form>
      )}
    </main>
  );
}
