import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body instead of in place. Keeps fixed
 * inset-0 modals anchored to the real viewport regardless of transform/filter
 * left on page ancestors by the page-enter transition (frontend-visual-refresh).
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
