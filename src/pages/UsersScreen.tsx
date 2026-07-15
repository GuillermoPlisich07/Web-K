import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRole } from "../context/RoleContext";
import { isReadOnlyRole } from "../lib/permissions";
import { GRAD } from "../lib/theme";
import UserFormModal from "../components/crud/UserFormModal";
import ConfirmDeleteModal from "../components/crud/ConfirmDeleteModal";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  type ManagedUser,
  type UserRole,
} from "../services/usersApi";

const ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: "Vendedor",
  ADMIN: "Administrador",
  EXEC: "Autoridad",
};

const ROLE_BADGE: Record<UserRole, { bg: string; text: string }> = {
  EMPLOYEE: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" },
  ADMIN: { bg: "rgba(168,85,247,0.1)", text: "#A855F7" },
  EXEC: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
};

function initials(firstName: string, lastName: string, email: string): string {
  if (firstName.trim() && lastName.trim()) {
    return (firstName.trim()[0] + lastName.trim()[0]).toUpperCase();
  }
  const localPart = email.split("@")[0] ?? email;
  const segments = localPart.split(/[._-]+/).filter(Boolean);
  const chars = segments.length > 1 ? [segments[0][0], segments[1][0]] : [localPart.slice(0, 2)];
  return chars.join("").toUpperCase();
}

export default function UsersScreen() {
  const { role } = useRole();
  const readOnly = isReadOnlyRole(role);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formModal, setFormModal] = useState<"create" | ManagedUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteModal, setDeleteModal] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => setError("No se pudieron cargar los usuarios."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(values: { firstName: string; lastName: string; email: string; password: string; role: UserRole }) {
    setSaving(true);
    setFormError("");
    try {
      const created = await createUser(values);
      setUsers((prev) => [created, ...prev]);
      setFormModal(null);
    } catch {
      setFormError("No se pudo crear el usuario. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(
    id: string,
    values: { firstName: string; lastName: string; email: string; password?: string; role: UserRole; enabled: boolean }
  ) {
    setSaving(true);
    setFormError("");
    try {
      const updated = await updateUser(id, values);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setFormModal(null);
    } catch {
      setFormError("No se pudo actualizar el usuario. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteUser(deleteModal.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteModal.id));
      setDeleteModal(null);
    } catch {
      setError("No se pudo eliminar el usuario.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto w-full px-8 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight mb-1">Usuarios</h2>
          <p className="text-sm text-slate-500">Cuentas de acceso a Konverza</p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setFormModal("create")}
            className="bg-accent hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
          >
            + Nuevo usuario
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-[#10111e] border border-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && users.length === 0 && !error && (
        <div className="text-center py-20">
          <p className="text-slate-500 text-sm">Todavía no hay usuarios cargados.</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="bg-[#10111e] border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Usuario</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                {!readOnly && <th className="px-5 py-3 font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-800 last:border-0 transition-colors duration-100 hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: u.enabled ? GRAD : "rgba(127,136,153,0.3)" }}
                      >
                        {initials(u.firstName, u.lastName, u.email)}
                      </div>
                      <div>
                        <div className="text-white">
                          {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : u.email}
                        </div>
                        {(u.firstName || u.lastName) && (
                          <div className="text-xs text-slate-500">{u.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="text-[10px] px-2 py-1 rounded font-medium"
                      style={{ backgroundColor: ROLE_BADGE[u.role].bg, color: ROLE_BADGE[u.role].text }}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: u.enabled ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: u.enabled ? "#34D399" : "#F87171",
                      }}
                    >
                      {u.enabled ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setFormModal(u)}
                          aria-label="Editar"
                          className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors hover:bg-white/5 text-[#7F8899] hover:text-white"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteModal(u)}
                          aria-label="Eliminar"
                          className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors hover:bg-white/5 text-[#7F8899] hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formModal && (
        <UserFormModal
          mode={formModal === "create" ? "create" : "edit"}
          initial={
            formModal === "create"
              ? { role: "EMPLOYEE", enabled: true }
              : {
                  firstName: formModal.firstName,
                  lastName: formModal.lastName,
                  email: formModal.email,
                  role: formModal.role,
                  enabled: formModal.enabled,
                }
          }
          saving={saving}
          error={formError}
          onCancel={() => setFormModal(null)}
          onSubmitCreate={handleCreate}
          onSubmitEdit={(values) => {
            if (formModal !== "create") handleEdit(formModal.id, values);
          }}
        />
      )}

      {deleteModal && (
        <ConfirmDeleteModal
          title="¿Eliminar usuario?"
          itemName={deleteModal.email}
          deleting={deleting}
          onCancel={() => setDeleteModal(null)}
          onConfirm={handleDelete}
        />
      )}
    </main>
  );
}
