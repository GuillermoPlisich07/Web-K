import { useState } from "react";
import ModalPortal from "../ModalPortal";
import type { UserRole } from "../../services/usersApi";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "EMPLOYEE", label: "Vendedor" },
  { value: "ADMIN", label: "Administrador" },
  { value: "EXEC", label: "Autoridad" },
];

interface CreateValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

interface EditValues {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  enabled: boolean;
}

interface Props {
  mode: "create" | "edit";
  initial: { firstName?: string; lastName?: string; email?: string; role: UserRole; enabled: boolean };
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmitCreate?: (values: CreateValues) => void;
  onSubmitEdit?: (values: EditValues) => void;
}

/**
 * Create/edit form for the Users admin screen. Both create and edit now
 * collect the same identity fields (nombre, apellido, email, rol) — edit
 * additionally allows resetting the password by filling in the optional
 * field, matching UpdateUserRequest on the backend (blank = unchanged).
 */
export default function UserFormModal({ mode, initial, saving, error, onCancel, onSubmitCreate, onSubmitEdit }: Props) {
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(initial.role);
  const [enabled, setEnabled] = useState(initial.enabled);

  const canSubmit =
    firstName.trim() && lastName.trim() && email.trim() && (mode === "edit" || password.trim());

  function handleSubmit() {
    if (mode === "create") {
      onSubmitCreate?.({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        role,
      });
    } else {
      onSubmitEdit?.({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: password.trim() ? password : undefined,
        role,
        enabled,
      });
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

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label htmlFor="user-form-first-name" className="block text-sm font-medium text-slate-400 mb-2">
                Nombre
              </label>
              <input
                id="user-form-first-name"
                type="text"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="user-form-last-name" className="block text-sm font-medium text-slate-400 mb-2">
                Apellido
              </label>
              <input
                id="user-form-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="field-input"
              />
            </div>
          </div>

          <label htmlFor="user-form-email" className="block text-sm font-medium text-slate-400 mb-2">
            Email
          </label>
          <input
            id="user-form-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@konverza.com"
            className="field-input mb-4"
          />

          <label htmlFor="user-form-password" className="block text-sm font-medium text-slate-400 mb-2">
            {mode === "create" ? "Contraseña" : "Nueva contraseña (opcional)"}
          </label>
          <input
            id="user-form-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "create" ? "Contraseña inicial" : "Dejar en blanco para no cambiarla"}
            className="field-input mb-4"
          />

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
