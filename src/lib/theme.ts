/**
 * Shared design tokens — single source of truth for the brand gradient and
 * dark-surface palette already established by Sidebar/TopBar/ReportScreen.
 * Extracted from Sidebar.tsx/TopBar.tsx (previously duplicated in each) when
 * building the role dashboard (add-role-dashboard), which reuses the same
 * tokens instead of the mockups' literal hex values.
 */
export const GRAD =
  "linear-gradient(135deg, #F5C518 0%, #FF6130 28%, #E0177A 56%, #7B22B4 78%, #4050C8 100%)";

export const COLORS = {
  bg: "#080B11",
  surface: "#0A0E18",
  surfaceAlt: "#0c0d18",
  card: "rgba(18,26,42,0.72)",
  hover: "#151D2B",
  border: "rgba(255,255,255,0.06)",
  textMuted: "#7F8899",
  textFaint: "#3D4A5E",
} as const;
