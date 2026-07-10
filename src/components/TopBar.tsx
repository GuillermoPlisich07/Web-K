import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, Bell, ChevronDown } from "lucide-react";
import { ROLE_LABELS, getPageTitle, type Role } from "../config/nav";
import { GRAD } from "../lib/theme";

const NOTIFICATIONS = [
  { title: "New simulation available", body: "Closing a SaaS Deal — Enterprise", time: "2m ago" },
  { title: "AI Coach insight", body: "Your objection handling improved 12%", time: "1h ago" },
  { title: "League update", body: "You're #2 in the Sales team league", time: "3h ago" },
];

interface Props {
  role: Role;
  onLogout: () => void;
}

export default function TopBar({ role, onLogout }: Props) {
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header
      className="flex items-center gap-4 px-6 lg:px-8 h-14 flex-shrink-0"
      style={{ backgroundColor: "#080B11", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-white tracking-tight">
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      {/* Search */}
      <div
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-56"
        style={{ backgroundColor: "#151D2B", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Search size={13} style={{ color: "#7F8899" }} />
        <span className="text-[#7F8899] text-xs">Search...</span>
        <span
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
          style={{ backgroundColor: "#1B2536", color: "#7F8899" }}
        >
          ⌘K
        </span>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setNotifOpen(!notifOpen);
            setAccountOpen(false);
          }}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer"
          style={{ color: "#7F8899" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#151D2B")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: GRAD }} />
        </button>
        {notifOpen && (
          <div
            className="absolute right-0 top-10 w-72 rounded-xl overflow-hidden shadow-2xl z-50"
            style={{ backgroundColor: "#151D2B", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <span className="text-sm font-semibold text-white">Notifications</span>
            </div>
            {NOTIFICATIONS.map((n) => (
              <div
                key={n.title}
                className="px-4 py-3 border-b cursor-pointer transition-colors duration-100"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1B2536")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <div className="text-xs font-medium text-white mb-0.5">{n.title}</div>
                <div className="text-xs" style={{ color: "#7F8899" }}>
                  {n.body}
                </div>
                <div className="text-[10px] mt-1" style={{ color: "#3D4A5E" }}>
                  {n.time}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account menu — role is read-only, sourced from the verified session */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setAccountOpen(!accountOpen);
            setNotifOpen(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer"
          style={{
            backgroundColor: "#151D2B",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "#B7C0D0",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: GRAD }} />
          {ROLE_LABELS[role]}
          <ChevronDown size={12} />
        </button>
        {accountOpen && (
          <div
            className="absolute right-0 top-10 w-40 rounded-xl overflow-hidden shadow-2xl z-50"
            style={{ backgroundColor: "#151D2B", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-2.5 text-xs text-left cursor-pointer transition-colors duration-100"
              style={{ color: "#7F8899" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1B2536")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
