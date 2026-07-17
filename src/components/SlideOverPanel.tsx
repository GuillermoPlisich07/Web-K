import { type ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";
import ModalPortal from "./ModalPortal";

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind width class — defaults to roughly half the screen on desktop. */
  widthClassName?: string;
}

/**
 * Right-edge slide-over panel — first instance of this pattern in the app
 * (user-activity-detail-panel), alongside the existing centered
 * ModalPortal-based modals. Reuses ModalPortal for the same reason those do:
 * page-enter transforms on route ancestors would otherwise misposition a
 * fixed right-0 panel too.
 */
export default function SlideOverPanel({ title, subtitle, onClose, children, widthClassName = "w-full max-w-2xl" }: Props) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black/70 z-50 transition-opacity duration-300"
        style={{ opacity: entered ? 1 : 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className={`fixed inset-y-0 right-0 ${widthClassName} bg-[#10111e] border-l border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out`}
          style={{ transform: entered ? "translateX(0)" : "translateX(100%)" }}
        >
          <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-800 shrink-0">
            <div>
              <h3 className="font-display text-lg font-bold text-white">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
