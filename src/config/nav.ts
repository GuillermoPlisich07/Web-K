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
  Building2,
  Package,
  Wrench,
  CreditCard,
  Plug,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { canView, type Resource } from "../lib/permissions";

export type Role = "employee" | "admin" | "exec";

export type NavSectionKey = "main" | "analyze" | "compete" | "manage" | "config";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  section: NavSectionKey;
  /** Permission-matrix resource gating visibility. Omit for ungated items (e.g. Settings). */
  resource?: Resource;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, section: "main", resource: "dashboard" },
  { path: "/scenarios", label: "Training Scenarios", icon: Zap, section: "main", resource: "practice" },
  { path: "/history", label: "Training History", icon: History, section: "main" },
  { path: "/ai-coach", label: "AI Coach", icon: Brain, section: "main", resource: "aiCoach" },
  { path: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, section: "main", resource: "knowledgeBase" },
  { path: "/analytics", label: "Analytics", icon: BarChart2, section: "analyze", resource: "analytics" },
  { path: "/leagues", label: "Leagues", icon: Trophy, section: "compete" },
  { path: "/challenges", label: "Challenges", icon: Target, section: "compete" },
  { path: "/products", label: "Productos", icon: Package, section: "manage", resource: "productos" },
  { path: "/services", label: "Servicios", icon: Wrench, section: "manage", resource: "servicios" },
  { path: "/company", label: "Empresa", icon: Building2, section: "manage", resource: "empresa" },
  { path: "/users", label: "Users", icon: Users, section: "manage", resource: "usuarios" },
  { path: "/billing", label: "Billing", icon: CreditCard, section: "manage", resource: "billing" },
  { path: "/integrations", label: "Integraciones", icon: Plug, section: "manage", resource: "integraciones" },
  { path: "/settings", label: "Settings", icon: Settings, section: "config" },
];

export function isNavItemVisible(item: NavItem, role: Role): boolean {
  return !item.resource || canView(role, item.resource);
}

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
