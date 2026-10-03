import {
  BarChart3,
  Building2,
  ChevronLeft,
  ClipboardList,
  FileText,
  Flame,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
} from "lucide-react";

const ADMIN_SECTIONS = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "issues", name: "Issues", icon: ClipboardList },
  { id: "users", name: "Users", icon: Users },
  { id: "reports", name: "Reports", icon: FileText },
  { id: "escalations", name: "Escalations", icon: Flame },
  { id: "authorities", name: "Authorities", icon: Building2 },
  { id: "analytics", name: "Analytics", icon: BarChart3 },
  { id: "settings", name: "Settings", icon: Settings },
];

export default function AdminSidebar({ active, onSelect, collapsed, onToggle, onLogout, mobileOpen, onCloseMobile }) {
  return (
    <>
      {mobileOpen && <button type="button" aria-label="Close admin menu" onClick={onCloseMobile} className="fixed inset-0 z-40 bg-[#0b3d2c]/50 lg:hidden" />}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#0b3d2c]/15 bg-[#0b3d2c] text-emerald-50 transition-all duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-64 lg:w-[76px]" : "w-64",
        ].join(" ")}
      >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00a06c] text-white">
          <Shield size={19} strokeWidth={2.2} />
        </span>
        {!collapsed && (
          <span className="leading-tight">
            <span className="block text-sm font-black tracking-tight">
              Civic<span className="text-[#5ee9b4]">Lens</span>
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/70">Admin</span>
          </span>
        )}
      </div>

      <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin sections">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                onSelect(section.id);
                if (onCloseMobile) onCloseMobile();
              }}
              title={collapsed ? section.name : undefined}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                isActive ? "bg-[#00a06c] text-white shadow-md" : "text-emerald-100/80 hover:bg-white/10 hover:text-white",
                collapsed ? "justify-center" : "",
              ].join(" ")}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="truncate">{section.name}</span>}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? "Log out" : undefined}
          className={[
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 hover:text-white",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-emerald-200/70 transition hover:bg-white/10 hover:text-white lg:flex"
        >
          <ChevronLeft size={15} className={collapsed ? "rotate-180 transition" : "transition"} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
