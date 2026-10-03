const mongoose = require("mongoose");
const Issue = require("../models/Issue");

// The real-world resolution deadline. This is the single source of truth for the
// 14 day rule and is never rewritten by demo mode. The value itself lives on the
// Issue model because that is what stamps `expectedResolutionDate` onto a newly
// filed report, so the deadline written at creation and the deadline this
// service later reads can never drift apart.
const REAL_ESCALATION_DEADLINE_DAYS = Issue.REAL_ESCALATION_DEADLINE_DAYS;

// Presentation aid only. When ESCALATION_DEMO_MODE is on, the Escalation Center
// can advance an in-memory evaluation clock by this many seconds per step so a
// reviewer can watch the ladder react in a demo. It evaluates a projected state
// and never writes to MongoDB, so it cannot shorten the real 14 day deadline or
// leave simulated escalation state on a real issue.
const DEMO_ESCALATION_WINDOW_SECONDS = 30;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// How many 30 second demo steps it takes to walk the simulated clock across the
// real 14 day deadline. Derived from the real rule rather than guessed, so demo
// mode can always be fast-forwarded far enough to actually see an escalation
// happen, without that number ever feeding back into the rule itself.
const MAX_DEMO_STEPS = Math.ceil((REAL_ESCALATION_DEADLINE_DAYS * DAY_IN_MS) / 1000 / DEMO_ESCALATION_WINDOW_SECONDS);

// An issue moves to "ATTENTION" this long before its deadline so a Neglect
// Signal can be raised before the Red Flag fires.
const ATTENTION_WINDOW_DAYS = 2;

// The escalation ladder continues the tiers already named in the Escalation
// Ladder panel (Level 1 Local Ward Authority, Level 2 Municipal Zonal
// Directorate). Level 1 is the resting state; every higher tier is entered once
// the 14 day deadline, and then each further window, has been crossed.
const ESCALATION_LADDER = [
  {
    level: 1,
    authority: "Local Ward Authority",
    overdueDays: null,
    neglectStatus: "ON TRACK",
    reason: "Within the 14 day municipal resolution window",
  },
  {
    level: 2,
    authority: "Municipal Zonal Directorate",
    overdueDays: 0,
    neglectStatus: "DEADLINE EXCEEDED",
    reason: "14 day resolution deadline crossed with no site resolution",
  },
  {
    level: 3,
    authority: "State Commissionerate",
    overdueDays: 7,
    neglectStatus: "DEADLINE EXCEEDED",
    reason: "Deadline exceeded by more than 7 days; zonal directorate passed the issue upward",
  },
  {
    level: 4,
    authority: "High Level Citizen Oversight",
    overdueDays: 14,
    neglectStatus: "DEADLINE EXCEEDED",
    reason: "Deadline exceeded by more than 14 days; escalated to highest civic oversight",
  },
];

function demoModeEnabled() {
  return String(process.env.ESCALATION_DEMO_MODE || "").toLowerCase() === "true";
}

// What the Escalation Center is allowed to show the public: the real rule, the
// ladder it climbs, and whether the demo simulation is switched on. Sending the
// real window from the server means the number on screen is the number the
// engine actually used, rather than a value hard-coded in the UI.
function describeEscalationPolicy() {
  return {
    realDeadlineDays: REAL_ESCALATION_DEADLINE_DAYS,
    attentionWindowDays: ATTENTION_WINDOW_DAYS,
    ladder: ESCALATION_LADDER,
    // Demo values are reported separately from the real rule on purpose: they
    // describe a simulation and must never be read as the real deadline.
    demo: {
      enabled: demoModeEnabled(),
      windowSeconds: DEMO_ESCALATION_WINDOW_SECONDS,
      maxSteps: MAX_DEMO_STEPS,
    },
  };
}

// New issues are created with a 14 day window. Anything already stored with the
// old 7 day window is left alone: its deadline is real recorded data, and
// rewriting it would move a deadline a citizen was actually given.
function resolutionDeadlineDays() {
  return REAL_ESCALATION_DEADLINE_DAYS;
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Works out the state an issue should be in at `now`, using only the deadline
// already stored on the issue. Pure: it reads nothing and writes nothing, which
// is what lets demo mode reuse it to project a future state safely.
function evaluateEscalation(issue, now = new Date()) {
  const deadline = toDate(issue.expectedResolutionDate) || toDate(issue.createdAt);
  if (!deadline) {
    return { neglectStatus: "ON TRACK", escalationLevel: 1, status: issue.status, reason: "No deadline recorded" };
  }

  // A resolved issue is out of scope for escalation. Its level is left as the
  // high-water mark it reached, so the history is not erased.
  if (issue.status === "Resolved") {
    return { neglectStatus: "ON TRACK", escalationLevel: Number(issue.escalationLevel) || 1, status: "Resolved", reason: issue.escalationReason };
  }

  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / DAY_IN_MS);
  const daysOverdue = daysRemaining <= 0 ? Math.floor(-daysRemaining) : -1;

  let tier = ESCALATION_LADDER[0];
  if (daysOverdue >= 0) {
    for (const step of ESCALATION_LADDER) {
      if (step.overdueDays !== null && daysOverdue >= step.overdueDays) tier = step;
    }
  }

  let neglectStatus = "ON TRACK";
  if (daysOverdue >= 0) neglectStatus = tier.neglectStatus;
  else if (daysRemaining <= ATTENTION_WINDOW_DAYS) neglectStatus = "ATTENTION";

  return {
    neglectStatus,
    // Escalation only ever moves up while an issue is unresolved, so an issue
    // an administrator already escalated is never quietly demoted.
    escalationLevel: Math.max(Number(issue.escalationLevel) || 1, tier.level),
    status: tier.level > 1 ? "Escalated" : issue.status,
    reason: tier.reason,
    authority: tier.authority,
    daysRemaining,
    daysOverdue,
    deadline: deadline.toISOString(),
  };
}

// Returns only the fields that genuinely need to be written, or an empty object
// when the issue is healthy and the stored record is already correct.
//
// A report that is still inside its 14 day window is deliberately left untouched:
// rewriting `escalationReason` on a perfectly healthy report would be editing a
// citizen's real record for no reason, and it would fight the reason text that
// was recorded at filing time.
function changedFields(issue, next) {
  if (next.escalationLevel <= 1 && next.neglectStatus === "ON TRACK") return {};

  const update = {};
  if (issue.neglectStatus !== next.neglectStatus) update.neglectStatus = next.neglectStatus;
  if ((Number(issue.escalationLevel) || 1) !== next.escalationLevel) update.escalationLevel = next.escalationLevel;
  if (issue.status !== next.status) update.status = next.status;
  if ((issue.escalationReason || "") !== next.reason) update.escalationReason = next.reason;
  return update;
}

// Recalculates and persists escalation state for the given issues.
//
// Writing only the fields that actually moved is what keeps this idempotent: a
// second sweep over the same register is a no-op, so reloading the page or
// running this on every request cannot manufacture duplicate escalation records.
async function persistEscalationState(issues, now = new Date()) {
  if (!issues.length) return { updated: 0, escalated: 0 };

  let updated = 0;
  let escalated = 0;

  for (const issue of issues) {
    const next = evaluateEscalation(issue, now);
    const update = changedFields(issue, next);
    const levelRose = update.escalationLevel !== undefined && update.escalationLevel > (Number(issue.escalationLevel) || 1);

    if (Object.keys(update).length === 0) continue;

    // One progress entry per actual level change, pushed in the same round trip
    // as the level itself so the timeline can never disagree with the level.
    const operator = {};
    if (levelRose) {
      operator.$push = {
        progressUpdates: {
          status: "Escalated",
          description: `${next.reason}. Escalated to level ${next.escalationLevel} (${next.authority}).`,
          percentage: 0,
          updatedBy: "CivicLens Escalation Engine",
        },
      };
    }

    await Issue.updateOne({ id: issue.id }, { $set: update, ...operator });
    updated += 1;
    if (next.escalationLevel > 1) escalated += 1;
  }

  return { updated, escalated };
}

// Full-register sweep. This is the deadline-driven pass: it reads the stored
// 14 day deadline on every issue and persists whatever moved.
async function recalculateEscalations(now = new Date()) {
  if (mongoose.connection.readyState !== 1) return { updated: 0, escalated: 0 };
  const issues = await Issue.find({
    status: { $ne: "Resolved" },
    expectedResolutionDate: { $ne: null },
  }).lean();
  return persistEscalationState(issues, now);
}

async function recalculateForIssue(id, now = new Date()) {
  if (mongoose.connection.readyState !== 1) return { updated: 0, escalated: 0 };
  const issue = await Issue.findOne({ id }).lean();
  if (!issue) return { updated: 0, escalated: 0 };
  return persistEscalationState([issue], now);
}

// Demo mode asks for the same calculation, evaluated with the clock pushed
// forward, and returns the projection without saving anything.
function projectForDemo(issue, advanceSeconds) {
  const now = new Date(Date.now() + advanceSeconds * 1000);
  const next = evaluateEscalation(issue, now);
  return {
    ...issue,
    neglectStatus: next.neglectStatus,
    escalationLevel: next.escalationLevel,
    escalationReason: next.reason,
    status: next.status,
    escalationAuthority: next.authority,
    daysRemaining: next.daysRemaining,
    daysOverdue: next.daysOverdue,
    demoProjected: true,
  };
}

module.exports = {
  REAL_ESCALATION_DEADLINE_DAYS,
  DEMO_ESCALATION_WINDOW_SECONDS,
  MAX_DEMO_STEPS,
  ESCALATION_LADDER,
  demoModeEnabled,
  describeEscalationPolicy,
  resolutionDeadlineDays,
  evaluateEscalation,
  recalculateEscalations,
  recalculateForIssue,
  projectForDemo,
};