import { useEffect, useMemo, useState } from "react";
import { useRole } from "../context/RoleContext";
import { isReadOnlyRole } from "../lib/permissions";
import EntityFormModal, { type EntityFormValues } from "../components/crud/EntityFormModal";
import ConfirmDeleteModal from "../components/crud/ConfirmDeleteModal";
import SearchInput from "../components/SearchInput";
import {
  listProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  type Producto,
} from "../services/productsApi";

export default function ProductsScreen() {
  const { role } = useRole();
  const readOnly = isReadOnlyRole(role);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formModal, setFormModal] = useState<"create" | Producto | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteModal, setDeleteModal] = useState<Producto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listProductos()
      .then(setProductos)
      .catch(() => setError("No se pudieron cargar los productos."))
      .finally(() => setLoading(false));
  }, []);

  const filteredProductos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      (p.description ?? "").toLowerCase().includes(term) ||
      p.tags.some((t) => t.toLowerCase().includes(term))
    );
  }, [productos, search]);

  async function handleSubmit(values: EntityFormValues) {
    setSaving(true);
    setFormError("");
    try {
      if (formModal === "create") {
        const created = await createProducto(values);
        setProductos((prev) => [created, ...prev]);
      } else if (formModal) {
        const updated = await updateProducto(formModal.id, values);
        setProductos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
      setFormModal(null);
    } catch {
      setFormError("No se pudo guardar el producto. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteProducto(deleteModal.id);
      setProductos((prev) => prev.filter((p) => p.id !== deleteModal.id));
      setDeleteModal(null);
    } catch {
      setError("No se pudo eliminar el producto.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto w-full px-8 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight mb-1">Productos</h2>
          <p className="text-sm text-slate-500">Catálogo de productos de la empresa</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, descripción o tag..." />
          {!readOnly && (
            <button
              onClick={() => setFormModal("create")}
              className="bg-accent hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              + Nuevo producto
            </button>
          )}
        </div>
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

      {!loading && productos.length === 0 && !error && (
        <div className="text-center py-20">
          <p className="text-slate-500 text-sm">Todavía no hay productos cargados.</p>
        </div>
      )}

      {!loading && productos.length > 0 && filteredProductos.length === 0 && (
        <div className="text-center py-20">
          <p className="text-slate-500 text-sm mb-2">Ningún producto coincide con "{search}".</p>
          <button onClick={() => setSearch("")} className="text-accent text-sm hover:underline">
            Limpiar búsqueda
          </button>
        </div>
      )}

      {!loading && filteredProductos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProductos.map((p) => (
            <div key={p.id} className="bg-[#10111e] border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
              <h3 className="font-display text-base font-bold text-white">{p.name}</h3>
              {p.description && <p className="text-sm text-slate-400 leading-relaxed">{p.description}</p>}
              {(p.priceRange || p.keyDifferentiator) && (
                <div className="text-xs text-slate-400 space-y-0.5">
                  {p.priceRange && <p><span className="text-slate-500">Precio:</span> {p.priceRange}</p>}
                  {p.keyDifferentiator && <p><span className="text-slate-500">Diferencial:</span> {p.keyDifferentiator}</p>}
                </div>
              )}
              {p.paymentInfo && <p className="text-xs text-slate-500 line-clamp-2">{p.paymentInfo}</p>}
              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {p.context && <p className="text-xs text-slate-500 line-clamp-3">{p.context}</p>}
              {!readOnly && (
                <div className="flex gap-3 mt-auto pt-3">
                  <button
                    onClick={() => setFormModal(p)}
                    className="text-xs text-accent hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteModal(p)}
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
          title={formModal === "create" ? "Nuevo producto" : "Editar producto"}
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
          title="¿Eliminar producto?"
          itemName={deleteModal.name}
          deleting={deleting}
          onCancel={() => setDeleteModal(null)}
          onConfirm={handleDelete}
        />
      )}
    </main>
  );
}
