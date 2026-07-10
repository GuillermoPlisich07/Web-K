interface Props {
  title: string;
  itemName: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Generic delete-confirmation modal, mirroring ScenariosListScreen's existing pattern. */
export default function ConfirmDeleteModal({ title, itemName, deleting, onCancel, onConfirm }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-[#10111e] border border-red-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-display text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-1 leading-relaxed">
          <span className="text-white font-medium">{itemName}</span>
        </p>
        <p className="text-xs text-slate-500 mb-5">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-700 text-slate-300 hover:text-white text-sm rounded-lg py-2.5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
