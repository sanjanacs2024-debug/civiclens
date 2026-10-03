import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  Eye,
  FileText,
  Filter,
  Flame,
  Inbox,
  Layers,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  Settings,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";
import { API_URL, adminService } from "../services/api";
import { useAuth } from "../contexts/useAuth";

const STATUS_STYLES = {
  Reported: "bg-slate-100 text-slate-700 ring-slate-200",
  "Under Review": "bg-amber-100 text-amber-800 ring-amber-200",
  Acknowledged: "bg-sky-100 text-sky-800 ring-sky-200",
  "In Progress": "bg-[#006591]/10 text-[#006591] ring-[#006591]/25",
  Resolved: "bg-emerald-100 text-[#006c49] ring-emerald-200",
  Escalated: "bg-red-100 text-red-700 ring-red-200",
};

const ADMIN_STATUSES = ["Reported", "Under Review", "Acknowledged", "In Progress", "Resolved", "Escalated"];
const SEVERITY_STYLES = {
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Medium: "bg-sky-50 text-sky-700 ring-sky-200",
  High: "bg-amber-50 text-amber-800 ring-amber-200",
  Critical: "bg-red-50 text-red-700 ring-red-200",
};
const CATEGORY_COLORS = ["#006c49", "#006591", "#00a06c", "#7c3aed", "#dc2626", "#d97706"];

function StatusBadge({ value, style }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  const classes = style || STATUS_STYLES[value] || "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${classes}`}>
      {value}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysBetween(from, to = Date.now()) {
  if (!from) return null;
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((to - start) / 86400000));
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";
}

function StatCard({ icon: Icon, label, value, tone = "green", hint }) {
  const tones = {
    green: "bg-[#006c49] text-white",
    blue: "bg-[#006591] text-white",
    amber: "bg-amber-500 text-white",
    red: "bg-red-600 text-white",
    slate: "bg-[#0b3d2c] text-white",
  };
  return (
    <div className="rounded-2xl border border-[#0b3d2c]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-[#102c20]">{value}</p>
          {hint && <p className="mt-1 text-[11px] font-medium text-slate-400">{hint}</p>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, action, children }) {
  return (
    <section className="rounded-2xl border border-[#0b3d2c]/10 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0b3d2c]/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon size={17} className="text-[#006c49]" />}
          <div>
            <h2 className="text-sm font-extrabold text-[#102c20]">{title}</h2>
            {subtitle && <p className="text-[11px] font-medium text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function LoadingRows({ rows = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">Loading CivicLens admin data...</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-emerald-50" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-emerald-50" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-emerald-50/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StateMessage({ tone = "info", icon: Icon, title, message, action }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
    empty: "border-dashed border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <div className={`flex flex-col items-center gap-2 rounded-2xl border px-5 py-8 text-center ${tones[tone]}`}>
      {Icon && <Icon size={22} />}
      <p className="text-sm font-extrabold">{title}</p>
      {message && <p className="max-w-md text-xs font-medium opacity-80">{message}</p>}
      {action}
    </div>
  );
}

function BarList({ items, emptyLabel = "No data available yet." }) {
  if (!items.length) return <p className="py-6 text-center text-xs font-medium text-slate-400">{emptyLabel}</p>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.label}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="truncate pr-3">{item.label}</span>
            <span className="text-[#102c20]">{item.value}</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-emerald-50">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max((item.value / max) * 100, 3)}%`, backgroundColor: item.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Donut({ resolved, pending, escalated }) {
  const total = resolved + pending;
  if (!total) return <p className="py-6 text-center text-xs font-medium text-slate-400">No issues to chart yet.</p>;
  const resolvedPct = (resolved / total) * 100;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        className="relative h-32 w-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(#006c49 0 ${resolvedPct}%, #006591 ${resolvedPct}% 100%)` }}
        role="img"
        aria-label={`${Math.round(resolvedPct)} percent resolved`}
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-black text-[#102c20]">{Math.round(resolvedPct)}%</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resolved</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-xs font-bold text-slate-600">
        <li className="flex items-center justify-between"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#006c49]" />Resolved</span><span>{resolved}</span></li>
        <li className="flex items-center justify-between"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#006591]" />Pending</span><span>{pending}</span></li>
        <li className="flex items-center justify-between"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-red-500" />Escalated</span><span>{escalated}</span></li>
      </ul>
    </div>
  );
}

function AccessGate({ user, loading, onDevEntry, isDev, onSignIn, onHome }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4fbf7] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#0b3d2c]/10 bg-white p-8 text-center shadow-lg">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#006c49] text-white">
          <Lock size={24} />
        </span>
        <h1 className="mt-5 text-xl font-black text-[#102c20]">Administrator access required</h1>
        {loading ? (
          <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Checking your CivicLens session...
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
              {user
                ? `You are signed in as ${user.name} (${user.role}). This account does not have administrator privileges, so dashboard data is not loaded.`
                : "Sign in with an administrator account to open the CivicLens Admin Dashboard."}
            </p>
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
              Authorization is enforced by the existing backend: <code className="text-[#006c49]">requireAuth</code> +{" "}
              <code className="text-[#006c49]">requireAdminOrSuperAdmin</code> on every <code className="text-[#006c49]">/api/admin/*</code> route.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {!user && (
                <button type="button" onClick={onSignIn} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#006c49] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-[#005a3d]">
                  Sign in as administrator <ArrowRight size={14} />
                </button>
              )}
              <button type="button" onClick={onHome} className="rounded-xl border border-[#0b3d2c]/15 px-5 py-2.5 text-xs font-bold text-[#006c49] hover:bg-emerald-50">
                Back to CivicLens home
              </button>
              {isDev && (
                <button type="button" onClick={onDevEntry} className="mt-2 rounded-xl border border-dashed border-amber-400 bg-amber-50 px-5 py-2.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100">
                  Enter dashboard in development mode (no admin account in database)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const isDev = Boolean(import.meta.env.DEV);
  const [devMode, setDevMode] = useState(false);
  const [section, setSection] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [data, setData] = useState({ stats: null, statsSource: null, issues: [], issuesSource: null, users: [], recentReports: [] });

  const isAdmin = adminService.isAdminRole(user?.role);
  const canView = isAdmin || devMode;

  const fetchAdminData = useCallback(async () => {
    const [dashboard, issues, users] = await Promise.all([
      adminService.getDashboard(),
      adminService.getIssues(),
      adminService.getUsers(),
    ]);

    // The issue statistics and the account list come from differently gated
    // routes, so they are judged separately: a non-admin session still gets real
    // issue numbers, it just cannot read accounts.
    const issueData = dashboard.success ? dashboard : issues;
    let notice = null;

    if (!issueData.success) {
      const offline = issueData.networkError || issueData.status === 503;
      notice = {
        tone: offline ? "offline" : "error",
        title: offline ? "Unable to load data — backend unavailable" : "Unable to load data",
        message: offline
          ? `CivicLens API at ${API_URL} is not responding right now. Start the backend and use Retry.`
          : issueData.error || "The admin endpoints returned an unexpected response.",
      };
    } else if (!users.success) {
      const offline = users.networkError || users.status === 503;
      const unauthorized = users.status === 401 || users.status === 403;
      notice = {
        tone: offline ? "offline" : unauthorized ? "unauthorized" : "error",
        title: offline
          ? "Backend offline"
          : unauthorized
            ? "Account data is admin-only"
            : "Unable to load accounts",
        message: offline
          ? `CivicLens API at ${API_URL} is not responding right now. Start the backend and use Retry.`
          : unauthorized
            ? "Issue figures below are live from the public register. User Management and Authorities need a sign-in with an admin or super admin account."
            : users.error || "The admin user endpoints returned an unexpected response.",
      };
    }

    return {
      notice,
      data: {
        stats: dashboard.success ? dashboard.data : null,
        statsSource: dashboard.success ? dashboard.source || "api" : null,
        issues: issues.success ? issues.data : [],
        issuesSource: issues.success ? issues.source || "api" : null,
        users: users.success ? users.data : [],
        recentReports: dashboard.success ? dashboard.data.recentReports || [] : [],
      },
    };
  }, []);

  const applyAdminData = useCallback((snapshot) => {
    if (snapshot.notice) setNotice(snapshot.notice);
    setData(snapshot.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!canView) return undefined;
    let cancelled = false;
    const run = async () => {
      const snapshot = await fetchAdminData();
      if (cancelled) return;
      applyAdminData(snapshot);
    };
    run();
    return () => { cancelled = true; };
  }, [canView, fetchAdminData, applyAdminData]);

  const refresh = async () => {
    setRefreshing(true);
    setLoading(true);
    setNotice(null);
    const snapshot = await fetchAdminData();
    applyAdminData(snapshot);
    setRefreshing(false);
  };

  const stats = data.stats;
  const issueStats = stats?.issues || {};
  const userStats = stats?.users || {};
  // The backend leaves user statistics out when the register had to be read from
  // the public route, so null means "gated", not "no accounts exist".
  const usersGated = stats !== null && userStats.total == null;
  const registerSource = data.statsSource === "public-register" || data.issuesSource === "public-register";

  const visibleIssues = useMemo(() => {
    return data.issues.filter((issue) => {
      const matchesStatus = statusFilter === "All" || issue.status === statusFilter;
      const term = search.trim().toLowerCase();
      const matchesSearch = !term || [issue.id, issue.title, issue.location, issue.category].some((field) => String(field || "").toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [data.issues, search, statusFilter]);

  const escalations = useMemo(
    () => data.issues.filter((issue) => issue.status === "Escalated" || issue.escalationLevel > 1 || issue.neglectStatus === "DEADLINE EXCEEDED"),
    [data.issues],
  );

  const authorities = useMemo(
    () => data.users.filter((account) => ["admin", "super_admin", "department_officer", "field_worker"].includes(account.role)),
    [data.users],
  );

  const reportCountByUser = useMemo(() => {
    const counts = new Map();
    for (const issue of data.issues) {
      const key = issue.reportedBy ? String(issue.reportedBy) : (issue.reporter?.name || "unknown");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [data.issues]);

  const activity = useMemo(() => {
    const entries = [];
    for (const issue of data.issues) {
      entries.push({ at: issue.createdAt, type: "Report", title: issue.title, detail: `${issue.id} reported by ${issue.reporter?.name || "a citizen"}`, tone: "green" });
      for (const update of issue.progressUpdates || []) {
        const type = update.status === "Resolved" ? "Resolution" : update.status === "Escalated" ? "Escalation" : "Status change";
        entries.push({
          at: update.date,
          type,
          title: issue.title,
          detail: `${update.status} · ${update.percentage}% · by ${update.updatedBy || "authority"}`,
          tone: update.status === "Resolved" ? "green" : update.status === "Escalated" ? "red" : "blue",
        });
      }
      if (issue.status === "Escalated" || issue.escalationLevel > 1) {
        entries.push({ at: issue.updatedAt || issue.createdAt, type: "Escalation", title: issue.title, detail: `Escalated to level ${issue.escalationLevel} · ${issue.department}`, tone: "red" });
      }
    }
    return entries.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0, 12);
  }, [data.issues]);

  const byCategory = useMemo(() => {
    if (stats?.issuesByCategory?.length) return stats.issuesByCategory.map((row) => ({ label: row.category, value: row.count }));
    const counts = new Map();
    for (const issue of data.issues) counts.set(issue.category, (counts.get(issue.category) || 0) + 1);
    return [...counts.entries()].map(([label, value]) => ({ label, value }));
  }, [data.issues, stats]);

  const byStatus = useMemo(() => {
    if (stats?.issuesByStatus?.length) return stats.issuesByStatus.map((row) => ({ label: row.status, value: row.count }));
    const counts = new Map();
    for (const issue of data.issues) counts.set(issue.status, (counts.get(issue.status) || 0) + 1);
    return [...counts.entries()].map(([label, value]) => ({ label, value }));
  }, [data.issues, stats]);

  const byLocation = useMemo(() => {
    const counts = new Map();
    for (const issue of data.issues) {
      const area = String(issue.location || "Unspecified").split(",").slice(-1)[0].trim() || "Unspecified";
      counts.set(area, (counts.get(area) || 0) + 1);
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [data.issues]);

  const byDepartment = useMemo(() => {
    const counts = new Map();
    for (const issue of data.issues) {
      const department = issue.department || "Unassigned";
      counts.set(department, (counts.get(department) || 0) + 1);
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [data.issues]);

  const applyStatus = async (issue, status) => {
    setNotice(null);
    const percentage = status === "Resolved" ? 100 : issue.status === "Reported" ? 15 : 50;
    const result = await adminService.updateIssueStatus(issue.id, {
      status,
      description: `Status set to ${status} from the CivicLens Admin Dashboard.`,
      percentage,
    });
    if (!result.success) {
      setNotice({
        tone: result.status === 401 || result.status === 403 ? "unauthorized" : "error",
        title: "Unable to update issue",
        message: result.error || `The backend rejected the ${status.toLowerCase()} action.`,
      });
      return;
    }
    setData((current) => ({
      ...current,
      issues: current.issues.map((item) => (item.id === issue.id ? { ...item, status, progressUpdates: [...(item.progressUpdates || []), { status, description: "Updated from Admin Dashboard", percentage, updatedBy: user?.name || "Admin", date: new Date().toISOString() }] } : item)),
    }));
    setNotice({ tone: "success", title: `${issue.id} updated`, message: `Status changed to ${status}.` });
  };

  const handleLogout = () => {
    signOut();
    navigate("/", { replace: true });
  };

  if (authLoading || !canView) {
    return (
      <AccessGate
        user={user}
        loading={authLoading}
        isDev={isDev}
        onDevEntry={() => setDevMode(true)}
        onSignIn={() => navigate("/login", { state: { from: { pathname: "/admin" }, notice: "Sign in with an administrator account to open the Admin Dashboard." } })}
        onHome={() => navigate("/")}
      />
    );
  }

  const connectionLabel = notice?.tone === "offline" ? "Backend offline" : registerSource ? "Live · register" : stats ? "Live" : "Connecting";
  const issuesSourceLabel = registerSource ? "Live from GET /issues (public register)" : "Live from GET /api/admin/dashboard";
  const issuesListSourceLabel = registerSource ? "Live from GET /issues (public register)" : "Live from GET /api/admin/issues";

  return (
    <div className="min-h-screen bg-[#f4fbf7] text-[#102c20]">
      <AdminSidebar active={section} onSelect={setSection} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} onLogout={handleLogout} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className={collapsed ? "lg:pl-[76px]" : "lg:pl-64"}>
        <header className="sticky top-0 z-30 border-b border-[#0b3d2c]/10 bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <button type="button" onClick={() => setMobileOpen((open) => !open)} className="rounded-xl border border-[#0b3d2c]/15 p-2 text-[#006c49] lg:hidden" aria-label="Toggle admin menu">
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div>
              <h1 className="text-base font-black text-[#102c20]">Admin Dashboard</h1>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#006c49]">CivicLens operations control</p>
            </div>

            <div className="relative ml-auto w-full max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search issues, users, locations"
                className="w-full rounded-xl border border-[#0b3d2c]/15 bg-[#f4fbf7] py-2 pl-9 pr-3 text-xs font-semibold text-[#102c20] outline-none focus:border-[#006c49]"
              />
            </div>

            <button type="button" onClick={refresh} className="inline-flex items-center gap-1.5 rounded-xl border border-[#0b3d2c]/15 px-3 py-2 text-xs font-bold text-[#006c49] hover:bg-emerald-50">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>

            <button type="button" onClick={() => setSection("escalations")} className="relative rounded-xl border border-[#0b3d2c]/15 p-2 text-[#006c49] hover:bg-emerald-50" aria-label="Escalation notifications">
              <Bell size={16} />
              {escalations.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white">{escalations.length}</span>}
            </button>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#0b3d2c]/10 bg-[#f4fbf7] px-3 py-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#006c49] text-[11px] font-black text-white">{initials(user?.name || "Admin")}</span>
              <span className="leading-tight">
                <span className="block text-xs font-extrabold text-[#102c20]">{user?.name || "Development session"}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {user?.role ? user.role.replace("_", " ") : "dev mode"} · {connectionLabel}
                </span>
              </span>
            </div>
          </div>
        </header>

        <main className="space-y-5 px-4 py-6 sm:px-6">
          {notice && notice.tone !== "success" && (
            <div
              className={[
                "flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3",
                notice.tone === "offline" ? "border-red-200 bg-red-50 text-red-900" : notice.tone === "unauthorized" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700",
              ].join(" ")}
              role="alert"
            >
              <Database size={16} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold">{notice.title}</p>
                <p className="text-[11px] font-medium opacity-80">{notice.message}</p>
              </div>
              <button type="button" onClick={refresh} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold shadow-sm">Retry</button>
            </div>
          )}
          {notice?.tone === "success" && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-[#006c49]" role="status">
              <CheckCircle2 size={15} /> {notice.message}
            </div>
          )}

          {section === "dashboard" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard icon={Inbox} label="Total Issues" value={loading ? "—" : issueStats.total ?? 0} tone="green" hint={registerSource ? "Live from the public issue register" : "GET /api/admin/dashboard"} />
                <StatCard icon={Clock} label="Pending Issues" value={loading ? "—" : issueStats.open ?? 0} tone="amber" hint="Reported + Under Review + Acknowledged + In Progress" />
                <StatCard icon={CheckCircle2} label="Resolved Issues" value={loading ? "—" : issueStats.resolved ?? 0} tone="blue" hint="Status = Resolved" />
                <StatCard icon={Flame} label="Escalated Issues" value={loading ? "—" : issueStats.escalated ?? 0} tone="red" hint="Escalated or level > 1" />
                <StatCard icon={Users} label="Total Users" value={loading ? "—" : usersGated ? "—" : userStats.total ?? 0} tone="slate" hint={usersGated ? "Admin session required" : `${userStats.active ?? 0} active`} />
                <StatCard icon={Building2} label="Active Authorities" value={loading ? "—" : usersGated ? "—" : authorities.length} tone="green" hint={usersGated ? "Admin session required" : "No /authorities endpoint — derived from users"} />
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="Issues by Category" subtitle={issuesSourceLabel} icon={Layers}>
                  {loading ? <LoadingRows rows={3} /> : <BarList items={byCategory} />}
                </Panel>
                <Panel title="Issues by Status" subtitle={issuesSourceLabel} icon={BarChart3}>
                  {loading ? <LoadingRows rows={3} /> : <BarList items={byStatus} />}
                </Panel>
                <Panel title="Resolved vs Pending" subtitle="Computed from dashboard statistics" icon={TrendingUp}>
                  {loading ? <LoadingRows rows={2} /> : <Donut resolved={issueStats.resolved ?? 0} pending={issueStats.open ?? 0} escalated={issueStats.escalated ?? 0} />}
                </Panel>
                <Panel title="Top Reported Areas" subtitle={`Derived from ${issuesListSourceLabel} locations`} icon={MapPin}>
                  {loading ? <LoadingRows rows={3} /> : <BarList items={byLocation} emptyLabel="No location data in the loaded issues." />}
                </Panel>
              </div>

              <Panel title="Recent Activity" subtitle="Reports, status changes, escalations and resolutions" icon={Activity}>
                {loading ? <LoadingRows /> : activity.length === 0 ? (
                  <StateMessage tone="empty" icon={Activity} title="No recent activity" message="Reports and status updates will appear here as they happen." />
                ) : (
                  <ol className="space-y-3">
                    {activity.map((entry, index) => (
                      <li key={`${entry.title}-${entry.at}-${index}`} className="flex items-start gap-3">
                        <span
                          className={[
                            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                            entry.tone === "red" ? "bg-red-500" : entry.tone === "blue" ? "bg-[#006591]" : "bg-[#006c49]",
                          ].join(" ")}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-[#102c20]">
                            <span className="mr-2 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#006c49]">{entry.type}</span>
                            {entry.title}
                          </p>
                          <p className="truncate text-[11px] font-medium text-slate-500">{entry.detail}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatDate(entry.at)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            </>
          )}

          {section === "issues" && (
            <Panel
              title="Issue Management"
              subtitle={`${issuesListSourceLabel} · actions use the existing PUT /api/issues/:id`}
              icon={ClipboardList}
              action={
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-[#0b3d2c]/15 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#102c20]">
                    {["All", ...ADMIN_STATUSES].map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              }
            >
              {loading ? <LoadingRows rows={5} /> : visibleIssues.length === 0 ? (
                <StateMessage tone="empty" icon={Inbox} title="No issues to show" message={data.issues.length ? "No issue matches the current search or status filter." : "No issues have been reported yet, or the admin session is not authorized to read them."} />
              ) : (
                <>
                  <div className="custom-scrollbar hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[900px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#0b3d2c]/10 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="py-2.5 pr-3">Issue ID</th>
                          <th className="py-2.5 pr-3">Title</th>
                          <th className="py-2.5 pr-3">Category</th>
                          <th className="py-2.5 pr-3">Location</th>
                          <th className="py-2.5 pr-3">Reported</th>
                          <th className="py-2.5 pr-3">Status</th>
                          <th className="py-2.5 pr-3">Level</th>
                          <th className="py-2.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleIssues.map((issue) => (
                          <tr key={issue.id} className="border-b border-[#0b3d2c]/5 align-middle">
                            <td className="py-3 pr-3 font-mono text-[11px] font-bold text-slate-500">{issue.id}</td>
                            <td className="py-3 pr-3 font-extrabold text-[#102c20]">
                              {issue.title}
                              <span className="mt-1 block"><StatusBadge value={issue.severity} style={SEVERITY_STYLES[issue.severity]} /></span>
                            </td>
                            <td className="py-3 pr-3 font-medium text-slate-600">{issue.category}</td>
                            <td className="py-3 pr-3 font-medium text-slate-600">{issue.location}</td>
                            <td className="py-3 pr-3 font-medium text-slate-500">{formatDate(issue.createdAt)}</td>
                            <td className="py-3 pr-3"><StatusBadge value={issue.status} /></td>
                            <td className="py-3 pr-3 font-bold text-[#102c20]">{issue.escalationLevel ?? 1}</td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1.5">
                                <button type="button" onClick={() => navigate(`/issue/${issue.id}`)} className="inline-flex items-center gap-1 rounded-lg border border-[#0b3d2c]/15 px-2 py-1 text-[10px] font-bold text-[#006c49] hover:bg-emerald-50"><Eye size={12} /> View</button>
                                <button type="button" onClick={() => applyStatus(issue, "In Progress")} className="rounded-lg border border-[#0b3d2c]/15 px-2 py-1 text-[10px] font-bold text-[#006591] hover:bg-sky-50">Update status</button>
                                <button type="button" onClick={() => applyStatus(issue, "Escalated")} className="rounded-lg border border-red-200 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50">Escalate</button>
                                <button type="button" onClick={() => applyStatus(issue, "Resolved")} className="rounded-lg border border-emerald-200 px-2 py-1 text-[10px] font-bold text-[#006c49] hover:bg-emerald-50">Resolve</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ul className="space-y-3 lg:hidden">
                    {visibleIssues.map((issue) => (
                      <li key={issue.id} className="rounded-2xl border border-[#0b3d2c]/10 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] font-bold text-slate-400">{issue.id}</p>
                            <p className="truncate text-sm font-extrabold text-[#102c20]">{issue.title}</p>
                          </div>
                          <StatusBadge value={issue.status} />
                        </div>
                        <p className="mt-1.5 text-[11px] font-medium text-slate-500">{issue.category} · {issue.location}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-400">Reported {formatDate(issue.createdAt)} · Level {issue.escalationLevel ?? 1}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => navigate(`/issue/${issue.id}`)} className="inline-flex items-center gap-1 rounded-lg border border-[#0b3d2c]/15 px-2.5 py-1.5 text-[10px] font-bold text-[#006c49]"><Eye size={12} /> View</button>
                          <button type="button" onClick={() => applyStatus(issue, "In Progress")} className="rounded-lg border border-[#0b3d2c]/15 px-2.5 py-1.5 text-[10px] font-bold text-[#006591]">Update status</button>
                          <button type="button" onClick={() => applyStatus(issue, "Escalated")} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-bold text-red-600">Escalate</button>
                          <button type="button" onClick={() => applyStatus(issue, "Resolved")} className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[10px] font-bold text-[#006c49]">Resolve</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          )}

          {section === "users" && (
            <Panel title="User Management" subtitle="GET /api/admin/users" icon={Users}>
              {loading ? <LoadingRows rows={5} /> : data.users.length === 0 ? (
                <StateMessage tone="empty" icon={Users} title="No users available" message="No accounts were returned. This section needs an admin or super admin session." />
              ) : (
                <div className="custom-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#0b3d2c]/10 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 pr-3">User</th>
                        <th className="py-2.5 pr-3">Email</th>
                        <th className="py-2.5 pr-3">Role</th>
                        <th className="py-2.5 pr-3">Reports</th>
                        <th className="py-2.5 pr-3">Account</th>
                        <th className="py-2.5">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((account) => (
                        <tr key={account._id || account.id} className="border-b border-[#0b3d2c]/5">
                          <td className="py-3 pr-3">
                            <span className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[10px] font-black text-[#006c49]">{initials(account.name)}</span>
                              <span className="font-extrabold text-[#102c20]">{account.name}</span>
                            </span>
                          </td>
                          <td className="py-3 pr-3 font-medium text-slate-600"><span className="inline-flex items-center gap-1"><Mail size={12} className="text-slate-400" />{account.email}</span></td>
                          <td className="py-3 pr-3"><span className="rounded-full bg-[#006591]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#006591]">{(account.role || "unset").replace("_", " ")}</span></td>
                          <td className="py-3 pr-3 font-black text-[#102c20]">{reportCountByUser.get(String(account._id || account.id)) || reportCountByUser.get(account.name) || 0}</td>
                          <td className="py-3 pr-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${account.isActive === false ? "bg-red-50 text-red-700" : "bg-emerald-50 text-[#006c49]"}`}>
                              {account.isActive === false ? "Deactivated" : "Active"}
                            </span>
                          </td>
                          <td className="py-3 font-medium text-slate-500">{formatDate(account.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {section === "reports" && (
            <Panel title="Incoming Reports" subtitle={`recentReports · ${issuesSourceLabel}`} icon={FileText}>
              {loading ? <LoadingRows rows={4} /> : data.recentReports.length === 0 ? (
                <StateMessage tone="empty" icon={FileText} title="No recent reports" message="New citizen reports will appear here first." />
              ) : (
                <ul className="space-y-3">
                  {data.recentReports.map((issue) => (
                    <li key={issue.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0b3d2c]/10 p-4">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] font-bold text-slate-400">{issue.id}</p>
                        <p className="truncate text-sm font-extrabold text-[#102c20]">{issue.title}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500"><MapPin size={11} /> {issue.location} · {formatDate(issue.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={issue.status} />
                        <button type="button" onClick={() => { setSection("issues"); setSearch(issue.id); }} className="rounded-lg border border-[#0b3d2c]/15 px-2.5 py-1.5 text-[10px] font-bold text-[#006c49] hover:bg-emerald-50">Open in Issues</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {section === "escalations" && (
            <Panel title="Escalation Center" subtitle={`Escalated issues · ${issuesListSourceLabel}`} icon={Flame}>
              {loading ? <LoadingRows rows={4} /> : escalations.length === 0 ? (
                <StateMessage tone="empty" icon={CheckCircle2} title="No escalations" message="Nothing has breached the escalation ladder. Deadline-exceeded and level 2+ issues appear here." />
              ) : (
                <ul className="space-y-3">
                  {escalations.map((issue) => {
                    const pendingDays = daysBetween(issue.createdAt);
                    const overdue = issue.expectedResolutionDate && new Date(issue.expectedResolutionDate) < new Date();
                    return (
                      <li key={issue.id} className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-slate-500">{issue.id}</span>
                              <StatusBadge value={issue.status} />
                              {issue.neglectStatus === "DEADLINE EXCEEDED" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white"><AlertTriangle size={11} /> Deadline exceeded</span>
                              )}
                            </p>
                            <p className="mt-1.5 text-sm font-extrabold text-[#102c20]">{issue.title}</p>
                            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500"><MapPin size={11} /> {issue.location}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Escalation level</p>
                            <p className="text-2xl font-black text-red-600">{issue.escalationLevel ?? 1}</p>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                          <div className="rounded-xl bg-white px-3 py-2"><dt className="font-bold uppercase tracking-wider text-slate-400">Days pending</dt><dd className="font-black text-[#102c20]">{pendingDays ?? "—"}</dd></div>
                          <div className="rounded-xl bg-white px-3 py-2"><dt className="font-bold uppercase tracking-wider text-slate-400">Current authority</dt><dd className="truncate font-black text-[#102c20]">{issue.department || "Unassigned"}</dd></div>
                          <div className="rounded-xl bg-white px-3 py-2"><dt className="font-bold uppercase tracking-wider text-slate-400">Next escalation</dt><dd className={`font-black ${overdue ? "text-red-600" : "text-[#102c20]"}`}>{overdue ? "Overdue" : formatDate(issue.expectedResolutionDate)}</dd></div>
                          <div className="rounded-xl bg-white px-3 py-2"><dt className="font-bold uppercase tracking-wider text-slate-400">Reason</dt><dd className="truncate font-black text-[#102c20]">{issue.escalationReason || "—"}</dd></div>
                        </dl>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => navigate(`/issue/${issue.id}`)} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#006c49] shadow-sm"><Eye size={12} /> View issue</button>
                          <button type="button" onClick={() => applyStatus(issue, "In Progress")} className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#006591] shadow-sm">Update status</button>
                          <button type="button" onClick={() => applyStatus(issue, "Resolved")} className="rounded-lg bg-[#006c49] px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm">Mark resolved</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}

          {section === "authorities" && (
            <Panel title="Authorities" subtitle="No /api/admin/departments endpoint exists — derived from GET /api/admin/users" icon={Building2}>
              {loading ? <LoadingRows rows={4} /> : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Authority accounts</h3>
                    {authorities.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs font-medium text-slate-500">{usersGated ? "Account data needs an admin or super admin session." : "No admin, super admin, department officer or field worker accounts exist yet."}</p>
                    ) : (
                      <ul className="space-y-2">
                        {authorities.map((account) => (
                          <li key={account._id || account.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#0b3d2c]/10 px-3 py-2">
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-extrabold text-[#102c20]">{account.name}</span>
                              <span className="block truncate text-[11px] font-medium text-slate-500">{account.department || "No department"}</span>
                            </span>
                            <span className="shrink-0 rounded-full bg-[#006591]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#006591]">{(account.role || "").replace("_", " ")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Departments handling issues</h3>
                    <BarList items={byDepartment} emptyLabel="No department data in the loaded issues." />
                  </div>
                </div>
              )}
            </Panel>
          )}

          {section === "analytics" && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Panel title="Issues by Category" subtitle={`${issuesSourceLabel} → issuesByCategory`} icon={Layers}>
                {loading ? <LoadingRows rows={3} /> : <BarList items={byCategory} />}
              </Panel>
              <Panel title="Issues by Status" subtitle={`${issuesSourceLabel} → issuesByStatus`} icon={BarChart3}>
                {loading ? <LoadingRows rows={3} /> : <BarList items={byStatus} />}
              </Panel>
              <Panel title="Resolved vs Pending" subtitle="Computed from dashboard statistics" icon={TrendingUp}>
                {loading ? <LoadingRows rows={2} /> : <Donut resolved={issueStats.resolved ?? 0} pending={issueStats.open ?? 0} escalated={issueStats.escalated ?? 0} />}
              </Panel>
              <Panel title="Escalation Pressure" subtitle="Escalated issues and neglected deadlines" icon={Flame}>
                {loading ? <LoadingRows rows={2} /> : (
                  <ul className="space-y-2 text-xs font-bold text-slate-600">
                    <li className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2"><span>Escalated issues</span><span className="text-red-600">{issueStats.escalated ?? 0}</span></li>
                    <li className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2"><span>Deadline exceeded</span><span className="text-amber-700">{data.issues.filter((issue) => issue.neglectStatus === "DEADLINE EXCEEDED").length}</span></li>
                    <li className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2"><span>In progress</span><span className="text-[#006c49]">{issueStats.inProgress ?? 0}</span></li>
                    <li className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2"><span>Collective signals raised</span><span className="text-[#006591]">{data.issues.filter((issue) => issue.collectiveSignal).length}</span></li>
                  </ul>
                )}
              </Panel>
            </div>
          )}

          {section === "settings" && (
            <Panel title="Dashboard Settings" subtitle="Informational — the backend exposes no settings endpoint" icon={Settings}>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#0b3d2c]/10 px-4 py-3"><dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">API base URL</dt><dd className="mt-1 font-mono text-xs font-bold text-[#102c20]">{API_URL}</dd></div>
                <div className="rounded-xl border border-[#0b3d2c]/10 px-4 py-3"><dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Session role</dt><dd className="mt-1 text-xs font-bold text-[#102c20]">{user?.role || "development mode (no session)"}</dd></div>
                <div className="rounded-xl border border-[#0b3d2c]/10 px-4 py-3"><dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Authorization</dt><dd className="mt-1 text-xs font-bold text-[#102c20]">Backend enforced (requireAuth + requireAdminOrSuperAdmin)</dd></div>
                <div className="rounded-xl border border-[#0b3d2c]/10 px-4 py-3"><dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Data freshness</dt><dd className="mt-1 text-xs font-bold text-[#102c20]">{stats ? "Live from MongoDB" : "Unavailable"}</dd></div>
              </dl>
              <p className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-[11px] font-semibold text-amber-900">
                No <code>PUT/PATCH /api/admin/*</code> settings route exists in <code>backend/routes/adminRoutes.js</code>, so nothing here mutates data. Add the endpoint on the backend, then call it from <code>adminService</code> in <code>src/services/api.js</code>.
              </p>
            </Panel>
          )}
        </main>
      </div>
    </div>
  );
}
