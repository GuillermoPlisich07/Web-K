import { useEffect, useState } from "react";
import { useRole } from "../context/RoleContext";
import { isReadOnlyRole } from "../lib/permissions";
import EntityFormModal, { type EntityFormValues } from "../components/crud/EntityFormModal";
import ConfirmDeleteModal from "../components/crud/ConfirmDeleteModal";
import {
  listServicios,
  createServicio,
  updateServicio,
  deleteServicio,
  type Servicio,
} from "../services/servicesApi";

export default function ServicesScreen() {
  const { role } = useRole();
  const readOnly = isReadOnlyRole(role);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formModal, setFormModal] = useState<"create" | Servicio | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteModal, setDeleteModal] = useState<Servicio | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listServicios()
      .then(setServicios)
      .catch(() => setError("No se pudieron cargar los servicios."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(values: EntityFormValues) {
    setSaving(true);
    setFormError("");
    try {
      if (formModal === "create") {
        const created = await createServicio(values);
        setServicios((prev) => [created, ...prev]);
      } else if (formModal) {
        const updated = await updateServicio(formModal.id, values);
        setServicios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      }
      setFormModal(null);
    } catch {
      setFormError("No se pudo guardar el servicio. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteServicio(deleteModal.id);
      setServicios((prev) => prev.filter((s) => s.id !== deleteModal.id));
      setDeleteModal(null);
    } catch {
      setError("No se pudo eliminar el servicio.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto w-full px-8 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight mb-1">Servicios</h2>
          <p className="text-sm text-slate-500">Catálogo de servicios de la empresa</p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setFormModal("create")}
            className="bg-accent hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
          >
            + Nuevo servicio
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-[#10111e] border border-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && servicios.length === 0 && !error && (
        <div className="text-center py-20">
          <p className="text-slate-500 text-sm">Todavía no hay servicios cargados.</p>
        </div>
      )}

      {!loading && servicios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {servicios.map((s) => (
            <div key={s.id} className="bg-[#10111e] border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
              <h3 className="font-display text-base font-bold text-white">{s.name}</h3>
              {s.description && <p className="text-sm text-slate-400 leading-relaxed">{s.description}</p>}
              {(s.priceRange || s.keyDifferentiator) && (
                <div className="text-xs text-slate-400 space-y-0.5">
                  {s.priceRange && <p><span className="text-slate-500">Precio:</span> {s.priceRange}</p>}
                  {s.keyDifferentiator && <p><span className="text-slate-500">Diferencial:</span> {s.keyDifferentiator}</p>}
                </div>
              )}
              {s.paymentInfo && <p className="text-xs text-slate-500 line-clamp-2">{s.paymentInfo}</p>}
              {s.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {s.context && <p className="text-xs text-slate-500 line-clamp-3">{s.context}</p>}
              {!readOnly && (
                <div className="flex gap-3 mt-auto pt-3">
                  <button
                    onClick={() => setFormModal(s)}
                    className="text-xs text-accent hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteModal(s)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formModal && (
        <EntityFormModal
          title={formModal === "create" ? "Nuevo servicio" : "Editar servicio"}
          initial={
            formModal === "create"
              ? { name: "", description: "", context: "", priceRange: "", keyDifferentiator: "", paymentInfo: "", tags: [] }
              : {
                  name: formModal.name,
                  description: formModal.description ?? "",
                  context: formModal.context ?? "",
                  priceRange: formModal.priceRange ?? "",
                  keyDifferentiator: formModal.keyDifferentiator ?? "",
                  paymentInfo: formModal.paymentInfo ?? "",
                  tags: formModal.tags,
                }
          }
          saving={saving}
          error={formError}
          onCancel={() => setFormModal(null)}
          onSubmit={handleSubmit}
        />
      )}

      {deleteModal && (
        <ConfirmDeleteModal
          title="¿Eliminar servicio?"
          itemName={deleteModal.name}
          deleting={deleting}
          onCancel={() => setDeleteModal(null)}
          onConfirm={handleDelete}
        />
      )}
    </main>
  );
}
