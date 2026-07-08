import {
  LayoutDashboard,
  Zap,
  History,
  Brain,
  BookOpen,
  BarChart2,
  Trophy,
  Target,
  Users,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Role = "employee" | "admin" | "exec";

export type NavSectionKey = "main" | "analyze" | "compete" | "manage" | "config";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  section: NavSectionKey;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { path: "/scenarios", label: "Training Scenarios", icon: Zap, section: "main" },
  { path: "/history", label: "Training History", icon: History, section: "main" },
  { path: "/ai-coach", label: "AI Coach", icon: Brain, section: "main" },
  { path: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, section: "main" },
  { path: "/analytics", label: "Analytics", icon: BarChart2, section: "analyze" },
  { path: "/leagues", label: "Leagues", icon: Trophy, section: "compete" },
  { path: "/challenges", label: "Challenges", icon: Target, section: "compete" },
  { path: "/users", label: "Users", icon: Users, section: "manage", adminOnly: true },
  { path: "/settings", label: "Settings", icon: Settings, section: "config" },
];

export const NAV_SECTIONS: { key: NavSectionKey; label: string }[] = [
  { key: "main", label: "Platform" },
  { key: "analyze", label: "Analytics" },
  { key: "compete", label: "Compete" },
  { key: "manage", label: "Manage" },
  { key: "config", label: "Account" },
];

export const ROLE_LABELS: Record<Role, string> = {
  employee: "Employee",
  admin: "Admin",
  exec: "Executive",
};

export function isNavItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/") return pathname === "/";
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function getPageTitle(pathname: string): string {
  const match = NAV_ITEMS.find((item) => isNavItemActive(pathname, item.path));
  return match?.label ?? "Konverza";
}
