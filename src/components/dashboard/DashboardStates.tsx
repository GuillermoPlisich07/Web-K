import { COLORS } from "../../lib/theme";

export function DashboardLoadingState() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-loading">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-28 rounded-2xl animate-pulse"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
        />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
}

export function DashboardEmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-16" data-testid="dashboard-empty">
      <p className="text-white font-semibold mb-2">{title}</p>
      <p className="text-sm max-w-sm mx-auto" style={{ color: COLORS.textMuted }}>
        {description}
      </p>
    </div>
  );
}

export function DashboardErrorState({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm"
      style={{ backgroundColor: "rgba(127,29,29,0.4)", border: "1px solid rgba(185,28,28,0.6)", color: "#fca5a5" }}
    >
      {message}
    </div>
  );
}
