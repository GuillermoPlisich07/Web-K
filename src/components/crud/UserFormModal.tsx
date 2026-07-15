import { useState } from "react";
import ModalPortal from "../ModalPortal";
import type { UserRole } from "../../services/usersApi";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "EMPLOYEE", label: "Vendedor" },
  { value: "ADMIN", label: "Administrador" },
  { value: "EXEC", label: "Autoridad" },
];

interface CreateValues {
  email: string;
  password: string;
  role: UserRole;
}

interface EditValues {
  role: UserRole;
  enabled: boolean;
}

interface Props {
  mode: "create" | "edit";
  initial: EditValues & { email?: string };
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmitCreate?: (values: CreateValues) => void;
  onSubmitEdit?: (values: EditValues) => void;
}

/**
 * Create/edit form for the Users admin screen (add-users-empresa-profile).
 * Create needs email/password/role; edit only ever touches role/enabled
 * (matches UpdateUserRequest on the backend — email/password are immutable
 * after account creation).
 */
export default function UserFormModal({ mode, initial, saving, error, onCancel, onSubmitCreate, onSubmitEdit }: Props) {
  const [email, setEmail] = useState(initial.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(initial.role);
  const [enabled, setEnabled] = useState(initial.enabled);

  const canSubmit = mode === "create" ? email.trim() && password.trim() : true;

  function handleSubmit() {
    if (mode === "create") {
      onSubmitCreate?.({ email: email.trim(), password, role });
    } else {
      onSubmitEdit?.({ role, enabled });
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      >
        <div className="bg-[#10111e] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <h3 className="font-display text-lg font-bold text-white mb-5">
            {mode === "create" ? "Nuevo usuario" : "Editar usuario"}
          </h3>

          {mode === "create" && (
            <>
              <label htmlFor="user-form-email" className="block text-sm font-medium text-slate-400 mb-2">
                Email
              </label>
              <input
                id="user-form-email"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@konverza.com"
                className="field-input mb-4"
              />

              <label htmlFor="user-form-password" className="block text-sm font-medium text-slate-400 mb-2">
                Contraseña
              </label>
              <input
                id="user-form-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña inicial"
                className="field-input mb-4"
              />
            </>
          )}

          <label htmlFor="user-form-role" className="block text-sm font-medium text-slate-400 mb-2">
            Rol
          </label>
          <select
            id="user-form-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="field-input mb-4"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {mode === "edit" && (
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2 cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Habilitado
            </label>
          )}

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 border border-slate-700 text-slate-300 hover:text-white text-sm rounded-lg py-2.5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
              className="flex-1 bg-accent hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
