export function formatScore(score: number | null): string {
  return score == null ? "—" : score.toFixed(1);
}

export function formatPercent(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}
