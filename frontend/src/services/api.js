import { INITIAL_ISSUES } from "../data/mockData";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const API_ORIGIN = new URL(API_URL).origin;
const STORAGE_KEY = "civiclens_issues_data";
const TOKEN_KEY = "civiclens_auth_token";
const USER_KEY = "civiclens_auth_user";
const BROKEN_DRAINAGE_IMAGE = "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80";

export const sessionService = {
  getToken() {
    return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
  },
  getUser() {
    const storedUser = window.localStorage.getItem(USER_KEY) || window.sessionStorage.getItem(USER_KEY);
    if (!storedUser) return null;
    try { return JSON.parse(storedUser); } catch { return null; }
  },
  saveSession({ token, user }, rememberMe) {
    this.clear();
    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(user));
  },
  updateUser(user) {
    const storage = window.localStorage.getItem(TOKEN_KEY) ? window.localStorage : window.sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  },
};

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  const token = sessionService.getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    return { success: false, error: "Unable to connect to server.", networkError: true };
  }

  const result = await response.json().catch(() => ({ success: false, error: "The server returned an invalid response." }));
  if (!response.ok) return { ...result, success: false, status: response.status };
  return result;
}

function normalizeIssue(issue) {
  if (!issue) return issue;
  return { ...issue, image: issue.image?.startsWith("/") ? `${API_ORIGIN}${issue.image}` : issue.image };
}

function getLocalStore() {
  const data = window.localStorage.getItem(STORAGE_KEY);
  if (!data) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ISSUES));
    return INITIAL_ISSUES;
  }
  const issues = JSON.parse(data);
  const drainageImage = INITIAL_ISSUES.find((issue) => issue.id === "CL-8894").image;
  const updatedIssues = issues.map((issue) => issue.image === BROKEN_DRAINAGE_IMAGE ? { ...issue, image: drainageImage } : issue);
  if (updatedIssues.some((issue, index) => issue !== issues[index])) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedIssues));
  return updatedIssues;
}

function filterLocalIssues(filters = {}) {
  let issues = getLocalStore();
  if (filters.category && filters.category !== "All") issues = issues.filter((issue) => issue.category === filters.category);
  if (filters.status && filters.status !== "All") issues = issues.filter((issue) => issue.status === filters.status);
  if (filters.severity && filters.severity !== "All") issues = issues.filter((issue) => issue.severity === filters.severity);
  if (filters.search) {
    const query = filters.search.toLowerCase();
    issues = issues.filter((issue) => issue.title.toLowerCase().includes(query) || issue.location.toLowerCase().includes(query) || issue.id.toLowerCase().includes(query));
  }
  if (filters.escalatedOnly) issues = issues.filter((issue) => issue.escalationLevel > 1 || issue.status === "Escalated");
  if (filters.neglectedOnly) issues = issues.filter((issue) => issue.neglectStatus === "DEADLINE EXCEEDED");
  if (filters.collectiveOnly) issues = issues.filter((issue) => issue.collectiveSignal);
  return issues;
}

function shouldUseLocalFallback(result) {
  return result.networkError || result.status === 503;
}

// Mirrors the policy the backend reports from services/escalationService.js so
// the Escalation Center can still state the real 14 day rule while the register
// is being served from the local fallback. The backend remains the source of
// truth; this only stops the page from showing nothing while it is offline.
const LOCAL_ESCALATION_POLICY = {
  realDeadlineDays: 14,
  attentionWindowDays: 2,
  ladder: [
    { level: 1, authority: "Local Ward Authority", overdueDays: null, neglectStatus: "ON TRACK", reason: "Within the 14 day municipal resolution window" },
    { level: 2, authority: "Municipal Zonal Directorate", overdueDays: 0, neglectStatus: "DEADLINE EXCEEDED", reason: "14 day resolution deadline crossed with no site resolution" },
    { level: 3, authority: "State Commissionerate", overdueDays: 7, neglectStatus: "DEADLINE EXCEEDED", reason: "Deadline exceeded by more than 7 days; zonal directorate passed the issue upward" },
    { level: 4, authority: "High Level Citizen Oversight", overdueDays: 14, neglectStatus: "DEADLINE EXCEEDED", reason: "Deadline exceeded by more than 14 days; escalated to highest civic oversight" },
  ],
  demo: { enabled: false, windowSeconds: 30 },
};

export const apiService = {
  async register(payload) {
    return request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  },

  async login(payload) {
    return request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  },

  async getCurrentUser() {
    return request("/auth/me");
  },

  async getIssues(filters = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value && value !== "All") query.set(key, String(value));
    const result = await request(`/issues${query.size ? `?${query}` : ""}`);
    if (result.success) return { success: true, data: result.data.map(normalizeIssue), source: "api" };
    if (shouldUseLocalFallback(result)) return { success: true, data: filterLocalIssues(filters).map(normalizeIssue), source: "local-fallback" };
    return { ...result, data: [] };
  },

  async getEscalations() {
    const result = await request("/escalations");
    if (result.success) return { success: true, data: result.data.map(normalizeIssue), source: "api", escalation: result.escalation };
    if (shouldUseLocalFallback(result)) return { success: true, data: filterLocalIssues({ escalatedOnly: true }).map(normalizeIssue), source: "local-fallback", escalation: LOCAL_ESCALATION_POLICY };
    return { ...result, data: [] };
  },

  // Demo-only read. The backend refuses this unless ESCALATION_DEMO_MODE is on,
  // and the projection it returns is never written back to the register, so the
  // real 14 day deadlines on the issues themselves stay untouched.
  async getEscalationDemo(steps = 1) {
    const result = await request(`/escalations/demo?steps=${Math.max(1, Number(steps) || 1)}`);
    if (!result.success) return { ...result, data: [], demoAvailable: false };
    return {
      success: true,
      data: result.data.map(normalizeIssue),
      source: "api",
      escalation: result.escalation,
      demo: result.demo,
      demoAvailable: true,
    };
  },

  async getIssueById(id) {
    const result = await request(`/issues/${encodeURIComponent(id)}`);
    if (result.success) return { success: true, data: normalizeIssue(result.data) };
    if (shouldUseLocalFallback(result)) {
      const issue = getLocalStore().find((item) => item.id === id);
      return issue ? { success: true, data: normalizeIssue(issue), source: "local-fallback" } : { success: false, error: "Issue not found." };
    }
    return result;
  },

  async createIssue(payload) {
    const body = new FormData();
    for (const [key, value] of Object.entries(payload)) if (value !== undefined && value !== null && value !== "") body.append(key, value);
    const result = await request("/issues", { method: "POST", body });
    return result.success ? { ...result, data: normalizeIssue(result.data) } : result;
  },

  async addProgressUpdate(id, updateData) {
    const result = await request(`/issues/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(updateData) });
    return result.success ? { ...result, data: normalizeIssue(result.data) } : result;
  },

  async incrementReport(id) {
    const result = await request(`/issues/${encodeURIComponent(id)}/signals`, { method: "POST" });
    return result.success ? { ...result, data: normalizeIssue(result.data) } : result;
  },
};

const ADMIN_ROLES = ["admin", "super_admin"];

// Broadcast after a report is saved so an already-open Civic Map refetches the
// register instead of showing a stale snapshot.
export const ISSUES_CHANGED_EVENT = "civic-issues:changed";

// Mirrors the status groupings the backend aggregates in adminRoutes.js, so a
// count means the same thing whether it came from /admin/dashboard or from the
// public register.
const OPEN_ISSUE_STATUSES = ["Reported", "Under Review", "Acknowledged", "In Progress"];
const PENDING_REPORT_STATUSES = ["Reported", "Under Review"];

function buildQuery(filters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "" && value !== "All") query.set(key, String(value));
  }
  return query.size ? `?${query}` : "";
}

function groupCount(items, key) {
  const counts = new Map();
  for (const item of items) {
    const label = item[key] ?? "Unspecified";
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

// The Admin Dashboard counted zero issues because its numbers came only from
// /admin/dashboard, which is gated behind requireAdminOrSuperAdmin. The citizen
// account that files a report is not an admin, so that request is rejected and
// the cards fell back to 0 while the Civic Map showed the very same reports.
//
// Every issue in the register is already readable without a session on the
// public /issues route, so these totals are re-derived from that same source
// instead of inventing numbers. User accounts are NOT included here: /admin/users
// stays admin-only, so `users` is left null to mean "gated", never "zero users".
function buildDashboardStats(issues) {
  const matches = (statuses) => issues.filter((issue) => statuses.includes(issue.status)).length;

  return {
    issues: {
      total: issues.length,
      open: matches(OPEN_ISSUE_STATUSES),
      inProgress: issues.filter((issue) => issue.status === "In Progress").length,
      resolved: issues.filter((issue) => issue.status === "Resolved").length,
      escalated: issues.filter((issue) => issue.status === "Escalated" || Number(issue.escalationLevel) > 1).length,
      pendingReports: matches(PENDING_REPORT_STATUSES),
    },
    recentReports: issues.slice(0, 5),
    issuesByCategory: groupCount(issues, "category").map(({ label, count }) => ({ category: label, count })),
    issuesByStatus: groupCount(issues, "status").map(({ label, count }) => ({ status: label, count })),
    users: null,
  };
}

// An admin session is required for these routes, so a rejected call has to be
// told apart from a genuinely empty register before falling back.
function canFallBackToRegister(result) {
  return result.networkError || result.status === 503 || result.status === 401 || result.status === 403;
}

async function loadPublicRegister(filters) {
  const result = await request(`/issues${buildQuery(filters)}`);
  if (!result.success) return null;
  return result.data.map(normalizeIssue);
}

export const adminService = {
  isAdminRole(role) {
    return ADMIN_ROLES.includes(role);
  },
  getDashboard() {
    return request("/admin/dashboard").then(async (result) => {
      if (result.success) return result;
      // The dashboard statistics are counts of the public issue register, so a
      // rejected or unreachable admin call still resolves to the real reports
      // rather than to zero. Account statistics stay unavailable here.
      if (!canFallBackToRegister(result)) return result;
      const issues = await loadPublicRegister();
      if (!issues) return result;
      return { success: true, data: buildDashboardStats(issues), source: "public-register" };
    });
  },
  getUsers(filters = {}) {
    return request(`/admin/users${buildQuery(filters)}`);
  },
  getUser(id) {
    return request(`/admin/users/${encodeURIComponent(id)}`);
  },
  getIssues(filters = {}) {
    return request(`/admin/issues${buildQuery(filters)}`).then(async (result) => {
      if (result.success) return result;
      if (!canFallBackToRegister(result)) return result;
      const issues = await loadPublicRegister(filters);
      if (!issues) return result;
      return { success: true, data: issues, source: "public-register" };
    });
  },
  getIssue(id) {
    return request(`/admin/issues/${encodeURIComponent(id)}`);
  },
  updateIssueStatus(id, { status, description, percentage }) {
    return request(`/issues/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status, description, percentage }) });
  },
};

export { API_URL };