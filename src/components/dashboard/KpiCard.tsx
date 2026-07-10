import type { LucideIcon } from "lucide-react";
import DashboardCard from "./DashboardCard";
import GradText from "./GradText";
import { COLORS } from "../../lib/theme";

interface Props {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  gradientValue?: boolean;
}

export default function KpiCard({ label, value, sub, icon: Icon, gradientValue }: Props) {
  return (
    <DashboardCard>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
          {label}
        </span>
        <Icon size={13} style={{ color: COLORS.textMuted }} />
      </div>
      <div className="text-3xl font-bold mb-1">
        {gradientValue ? <GradText>{value}</GradText> : <span className="text-white">{value}</span>}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: COLORS.textMuted }}>
          {sub}
        </div>
      )}
    </DashboardCard>
  );
}
