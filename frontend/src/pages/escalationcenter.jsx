import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Flame,
  Timer,
  Landmark,
  Info,
  Play,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { apiService } from "../services/api";
import Navbar from "../components/Navbar";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Reads the deadline that is already stored on the issue. The escalation engine
// on the server decides the real escalation state; this only formats the same
// stored date for display, so the countdown can never disagree with the level.
function deadlineView(issue) {
  const deadline = issue.expectedResolutionDate ? new Date(issue.expectedResolutionDate) : null;
  if (!deadline || Number.isNaN(deadline.getTime())) return null;

  const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / DAY_IN_MS);
  if (daysRemaining <= 0) {
    const daysOverdue = Math.floor(-daysRemaining);
    return { deadline, daysRemaining, daysOverdue, text: `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` };
  }
  return { deadline, daysRemaining, daysOverdue: -1, text: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining` };
}

function NeglectBadge({ issue }) {
  if (issue.neglectStatus === "DEADLINE EXCEEDED") {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-800 flex items-center gap-1">
        <AlertTriangle size={12} /> Red Flag: Deadline Exceeded
      </span>
    );
  }
  if (issue.neglectStatus === "ATTENTION") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 flex items-center gap-1">
        <Timer size={12} /> Neglect Signal: Attention
      </span>
    );
  }
  return null;
}

export default function Escalation() {
  const [escalated, setEscalated] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState(null);

  // Demo state is held separately from the real register on purpose, so nothing
  // simulated can be confused with what the 14 day rule actually decided.
  const [demoSteps, setDemoSteps] = useState(0);
  const [demoProjection, setDemoProjection] = useState(null);
  const [demoNotice, setDemoNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiService.getEscalations().then((res) => {
      if (cancelled) return;
      if (res.success) {
        setEscalated(res.data);
        setPolicy(res.escalation || null);
      } else {
        setError(res.error || "Escalation register unavailable.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const realDeadlineDays = policy?.realDeadlineDays ?? 14;
  const ladder = policy?.ladder ?? [];
  const demoEnabled = Boolean(policy?.demo?.enabled);
  const demoWindowSeconds = policy?.demo?.windowSeconds ?? 30;
  const demoMaxSteps = policy?.demo?.maxSteps ?? 40320;

  const runDemo = useCallback(async (steps) => {
    // Step 0 is "no simulation": clear the projection instead of asking the
    // server for a one-step offset, so Reset returns to the untouched view.
    if (steps < 1) {
      setDemoSteps(0);
      setDemoProjection(null);
      setDemoNotice(null);
      return;
    }
    setDemoSteps(steps);
    const res = await apiService.getEscalationDemo(steps);
    if (res.success) {
      setDemoProjection(res.data);
      setDemoNotice(null);
    } else {
      setDemoProjection(null);
      setDemoNotice(res.error || "Demo simulation is not available.");
    }
  }, []);

  // Highest tier any issue in the register has actually reached, so the ladder
  // can show which rung is live right now.
  const levelCounts = useMemo(() => {
    const counts = new Map();
    for (const issue of escalated) {
      const level = Number(issue.escalationLevel) || 1;
      counts.set(level, (counts.get(level) || 0) + 1);
    }
    return counts;
  }, [escalated]);

  const highestActiveLevel = useMemo(() => {
    let highest = 1;
    for (const issue of escalated) {
      const level = Number(issue.escalationLevel) || 1;
      if (level > highest) highest = level;
    }
    return highest;
  }, [escalated]);

  return (
    <div className="min-h-screen bg-[#e7fff2] text-[#102c20]">

      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-8">

        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-red-600">
            Escalation Center
          </span>
          <h1 className="text-3xl font-black text-[#102c20]">Objective Escalation Ladder</h1>
          <p className="text-xs text-slate-600 mt-1">
            Issues that have exceeded resolution deadlines or breached collective signal thresholds.
          </p>
        </div>

        {/* The real rule, stated as the server reports it. */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-[#006c49]/15 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e7fff2] text-[#006c49]">
            <Landmark size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-[#102c20]">Real-world rule</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              An unresolved civic issue becomes eligible for the next escalation level after{" "}
              <strong className="text-[#006c49]">{realDeadlineDays} days</strong>, measured from the
              resolution deadline stored on the report. Further levels unlock every 7 days beyond
              that deadline.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">

          {/* Escalation Ladder */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
              <h2 className="text-sm font-extrabold text-[#006c49] uppercase tracking-wider">Escalation Ladder</h2>
              <ol className="mt-5 space-y-3">
                {ladder.map((tier) => {
                  const reached = tier.level <= highestActiveLevel;
                  const live = tier.level === highestActiveLevel;
                  return (
                    <li
                      key={tier.level}
                      className={`rounded-2xl border p-4 ${
                        live
                          ? "border-red-300 bg-red-50"
                          : reached
                            ? "border-[#006c49]/30 bg-[#e7fff2]"
                            : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black ${reached ? "text-[#006c49]" : "text-slate-400"}`}>
                          LEVEL {tier.level}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {levelCounts.get(tier.level) || 0} active
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm font-bold text-[#102c20]">{tier.authority}</h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{tier.reason}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">

            {/* Demo mode. Opt-in via ESCALATION_DEMO_MODE and strictly read-only:
                it projects what the same 14 day rule would say on a simulated
                clock, and it never changes the real register above. */}
            <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Timer size={20} className="mt-0.5 text-amber-600" />
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">
                      Demo Mode — Simulation Only
                    </h2>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-amber-900/80">
                      Advances a simulated clock in <strong>{demoWindowSeconds}-second</strong> steps so
                      the ladder can be seen reacting during a presentation. The real rule above stays at{" "}
                      <strong>{realDeadlineDays} days</strong>, and nothing shown here is saved to any
                      report.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => runDemo(demoSteps + 1)}
                    disabled={!demoEnabled}
                    className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Play size={14} /> Advance {demoWindowSeconds}s
                  </button>
                  <button
                    type="button"
                    onClick={() => runDemo(demoMaxSteps)}
                    disabled={!demoEnabled}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Timer size={14} /> Simulate {realDeadlineDays} days
                  </button>
                  <button
                    type="button"
                    onClick={() => runDemo(0)}
                    disabled={!demoEnabled || demoSteps === 0}
                    className="flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>
              </div>

              {!demoEnabled && (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-2 text-[11px] font-medium text-amber-900/80">
                  <Info size={13} /> Demo mode is switched off. Set ESCALATION_DEMO_MODE=true on the
                  server to enable the {demoWindowSeconds}-second simulation.
                </p>
              )}

              {demoNotice && (
                <p className="mt-4 rounded-2xl bg-white/70 px-4 py-2 text-[11px] font-medium text-amber-900/80">
                  {demoNotice}
                </p>
              )}

              {demoProjection && (
                <div className="mt-5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/70">
                    Simulated result after {demoSteps} × {demoWindowSeconds}s
                  </p>
                  {demoProjection.length === 0 && (
                    <p className="rounded-2xl bg-white/70 px-4 py-3 text-xs text-amber-900/80">
                      No unresolved reports to simulate.
                    </p>
                  )}
                  {demoProjection.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold text-slate-400">{item.id}</span>
                        <p className="truncate text-xs font-bold text-[#102c20]">{item.title}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          Level {item.escalationLevel}
                        </span>
                        {item.neglectStatus !== "ON TRACK" && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            {item.neglectStatus}
                          </span>
                        )}
                        {typeof item.daysOverdue === "number" && item.daysOverdue >= 0 && (
                          <span className="text-[10px] font-bold text-amber-700">
                            +{item.daysOverdue}d simulated
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-3xl border border-red-200 bg-red-50 p-5 text-xs font-bold text-red-700">
                {error}
              </p>
            )}

            <div className="space-y-4">
              {escalated.length === 0 && !error && (
                <p className="rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
                  No reports have breached the {realDeadlineDays}-day resolution deadline or the
                  collective signal threshold.
                </p>
              )}

              {escalated.map((item) => {
                const deadline = deadlineView(item);
                const level = Number(item.escalationLevel) || 1;
                const authority = ladder.find((tier) => tier.level === level)?.authority;
                const timeline = [...(item.progressUpdates || [])].sort(
                  (a, b) => new Date(b.date) - new Date(a.date),
                );

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-red-200 bg-white p-6 shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">{item.id}</span>
                          <NeglectBadge issue={item} />
                          {item.collectiveSignal && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 flex items-center gap-1">
                              <Flame size={12} /> Collective Signal ({item.collectiveSignalCount})
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 text-lg font-bold text-[#102c20]">{item.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.location} • Escalation Level {level}
                          {authority ? ` — ${authority}` : ""}
                        </p>
                        {deadline && (
                          <p className="mt-1 text-[11px] font-bold text-slate-400">
                            {realDeadlineDays}-day deadline {deadline.deadline.toLocaleDateString()} •{" "}
                            <span className={deadline.daysOverdue >= 0 ? "text-red-600" : "text-[#006c49]"}>
                              {deadline.text}
                            </span>
                          </p>
                        )}
                        {item.escalationReason && (
                          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
                            {item.escalationReason}
                          </p>
                        )}
                      </div>

                      <Link
                        to={`/issue/${item.id}`}
                        className="shrink-0 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700"
                      >
                        Inspect Telemetry
                      </Link>
                    </div>

                    {timeline.length > 0 && (
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Escalation Timeline
                        </h4>
                        <ol className="mt-3 space-y-3 border-l border-red-100 pl-4">
                          {timeline.map((entry, index) => {
                            const byEngine = entry.updatedBy === "CivicLens Escalation Engine";
                            return (
                              <li key={entry.id || entry._id || index} className="relative">
                                <span
                                  className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                                    byEngine ? "bg-red-600" : "bg-[#126747]"
                                  }`}
                                />
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <strong className="text-xs text-[#19332a]">
                                    {entry.status}
                                    {byEngine && " (automatic)"}
                                  </strong>
                                  <time className="text-[10px] text-slate-400" dateTime={entry.date}>
                                    {new Date(entry.date).toLocaleString()}
                                  </time>
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">{entry.description}</p>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Link
              to="/explore"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#006c49] hover:underline"
            >
              Browse the full civic register <ChevronRight size={14} />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
