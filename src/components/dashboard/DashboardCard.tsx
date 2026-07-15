import type { ReactNode } from "react";
import { COLORS } from "../../lib/theme";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function DashboardCard({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl p-5 min-w-0 ${className}`}
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      {children}
    </div>
  );
}
