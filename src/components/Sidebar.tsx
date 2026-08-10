import { Link, useLocation } from "react-router-dom";
import { LogOut, Flame, ChevronRight } from "lucide-react";
import { NAV_ITEMS, NAV_SECTIONS, isNavItemActive, isNavItemVisible, type Role } from "../config/nav";
import { GRAD } from "../lib/theme";
import { useAuthStore } from "../store/authStore";

interface Props {
  role: Role;
  onLogout: () => void;
}

function getDisplayName(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const fn = firstName?.trim() ?? "";
  const ln = lastName?.trim() ?? "";
  if (fn && ln) return `${fn} ${ln}`;
  if (fn) return fn;
  if (ln) return ln;
  if (email && email.trim()) {
    const prefix = email.split("@")[0]?.trim();
    if (prefix) return prefix;
  }
  return "Usuario";
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const fn = firstName?.trim() ?? "";
  const ln = lastName?.trim() ?? "";
  if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
  if (fn) return fn[0].toUpperCase();
  if (ln) return ln[0].toUpperCase();
  if (email && email.trim()) {
    const prefix = email.split("@")[0]?.trim();
    if (prefix && prefix.length > 0) return prefix[0].toUpperCase();
  }
  return "U";
}

export default function Sidebar({ role, onLogout }: Props) {
  const location = useLocation();
  const visibleItems = NAV_ITEMS.filter((item) => isNavItemVisible(item, role));
  const firstName = useAuthStore((s) => s.firstName);
  const lastName = useAuthStore((s) => s.lastName);
  const email = useAuthStore((s) => s.email);
  const avatarUrl = useAuthStore((s) => s.avatarUrl);

  const displayName = getDisplayName(firstName, lastName, email);
  const initials = getInitials(firstName, lastName, email);

  return (
    <aside
      className="flex flex-col w-[220px] flex-shrink-0 h-screen sticky top-0 overflow-hidden"
      style={{ backgroundColor: "#0A0E18", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: GRAD }}
        >
          <span className="text-white font-bold text-xs">K</span>
        </div>
        <span className="font-semibold text-white text-sm tracking-tight">Konverza</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV_SECTIONS.map((section) => {
          const items = visibleItems.filter((i) => i.section === section.key);
          if (!items.length) return null;
          return (
            <div key={section.key} className="mb-5">
              <div className="px-2 mb-1.5">
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "#3D4A5E" }}
                >
                  {section.label}
                </span>
              </div>
              {items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(location.pathname, item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left mb-0.5 transition-all duration-150 cursor-pointer group"
                    style={{ backgroundColor: active ? "#1B2536" : "transparent" }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.backgroundColor = "#151D2B";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Icon
                      size={15}
                      strokeWidth={active ? 2 : 1.75}
                      style={{ color: active ? "#FFE08A" : "#7F8899" }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: active ? "#FFFFFF" : "#7F8899" }}
                    >
                      {item.label}
                    </span>
                    {active && (
                      <ChevronRight size={12} className="ml-auto" style={{ color: "#7F8899" }} />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Streak badge */}
      <div className="px-3 pb-3">
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
          style={{ backgroundColor: "#151D2B", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Flame size={14} style={{ color: "#FF9A3D" }} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white">12 day streak</div>
            <div className="text-[10px]" style={{ color: "#7F8899" }}>
              Keep it up!
            </div>
          </div>
          <div
            className="text-xs font-bold"
            style={{
              background: GRAD,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            🔥
          </div>
        </div>
      </div>

      {/* User */}
      <div
        className="px-3 pb-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}
      >
        <div className="flex items-center gap-2.5 px-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: GRAD }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate" title={displayName}>
              {displayName}
            </div>
            <div className="text-[10px] truncate" style={{ color: "#7F8899" }}>
              SDR · Level 14
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-[#7F8899] hover:text-white transition-colors cursor-pointer"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
