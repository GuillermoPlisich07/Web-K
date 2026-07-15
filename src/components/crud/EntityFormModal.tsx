import { useState } from "react";
import ModalPortal from "../ModalPortal";

export interface EntityFormValues {
  name: string;
  description: string;
  context: string;
}

interface Props {
  title: string;
  initial: EntityFormValues;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (values: EntityFormValues) => void;
}

/**
 * Generic create/edit form modal for Producto/Servicio — both share the exact
 * same field shape (name, description, context), so this one component
 * backs both ProductsScreen and ServicesScreen (add-products-services-management).
 */
export default function EntityFormModal({ title, initial, saving, error, onCancel, onSubmit }: Props) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [context, setContext] = useState(initial.context);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      >
        <div className="bg-[#10111e] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <h3 className="font-display text-lg font-bold text-white mb-5">{title}</h3>

          <label className="block text-sm font-medium text-slate-400 mb-2">Nombre</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: CRM para ventas B2B"
            className="field-input mb-4"
          />

          <label className="block text-sm font-medium text-slate-400 mb-2">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve"
            rows={2}
            className="field-input mb-4 resize-none"
          />

          <label className="block text-sm font-medium text-slate-400 mb-2">Contexto</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Información de contexto para el equipo de ventas"
            rows={4}
            className="field-input mb-2 resize-none"
          />

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 border border-slate-700 text-slate-300 hover:text-white text-sm rounded-lg py-2.5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSubmit({ name: name.trim(), description: description.trim(), context: context.trim() })}
              disabled={saving || !name.trim()}
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
