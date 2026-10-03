import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Clock3,
  Construction,
  Droplets,
  FileSearch,
  Flame,
  Gauge,
  Image as ImageIcon,
  MapPin,
  MapPinned,
  ScanLine,
  Shield,
  Sparkles,
  Tags,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { INITIAL_ISSUES } from "../data/mockData";
import { apiService } from "../services/api";
import { useAuth } from "../contexts/useAuth";
import Navbar from "../components/Navbar";
import CivicLensLogo from "../components/CivicLensLogo";
import CountUp from "../components/CountUp";
import "../App.css";

const categoryCards = [
  {
    title: "Roads & Infrastructure",
    description: "Potholes, broken footpaths and damaged public infrastructure.",
    icon: Construction,
    issue: INITIAL_ISSUES.find((item) => item.category === "Roads & Infrastructure"),
  },
  {
    title: "Waste & Cleanliness",
    description: "Uncollected waste, dumping and blocked public walkways.",
    icon: Trash2,
    issue: INITIAL_ISSUES.find((item) => item.category === "Waste & Cleanliness"),
  },
  {
    title: "Water & Drainage",
    description: "Drainage overflow, leaks and waterlogged streets.",
    icon: Droplets,
    issue: INITIAL_ISSUES.find((item) => item.category === "Water & Drainage"),
  },
  {
    title: "Public Safety",
    description: "Streetlight outages and hazards in shared public spaces.",
    icon: Shield,
    issue: INITIAL_ISSUES.find((item) => item.category === "Public Safety"),
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Capture",
    description: "A citizen photographs a civic issue and adds the location and context that describe it.",
    icon: Camera,
    visual: "capture",
  },
  {
    number: "02",
    title: "Understand",
    description: "AI-assisted analysis reviews the image and helps suggest an issue category, severity and description.",
    icon: ScanLine,
    visual: "understand",
  },
  {
    number: "03",
    title: "Track",
    description: "The issue becomes visible in the register and its progress can be followed over time.",
    icon: Activity,
    visual: "track",
  },
  {
    number: "04",
    title: "Escalate",
    description: "If configured response timelines are missed, the issue can move through the escalation process.",
    icon: AlertTriangle,
    visual: "escalate",
  },
];

const escalationStages = ["Report", "Authority response", "Track progress", "Deadline missed", "Escalation"];

const signalSteps = [
  { label: "12 citizens", detail: "Independent reports", icon: Users },
  { label: "Same area", detail: "Shared location context", icon: MapPin },
  { label: "Similar issue", detail: "Matching observation type", icon: Tags },
];

const neglectStages = [
  { title: "Issue reported", detail: "Photo, location and description are saved to the issue register." },
  { title: "Response expected", detail: "A department and an expected resolution date are recorded on the issue." },
  { title: "No progress recorded", detail: "The expected date passes without a new progress update on the record." },
  { title: "Issue remains visible", detail: "The issue stays listed with its neglect status instead of disappearing." },
  { title: "Escalation review", detail: "The record moves into the escalation workflow for further visibility." },
];

const escalationLadder = [
  {
    level: "Level 1",
    title: "Initial civic response",
    detail: "The report is logged with its category, severity, department and an expected resolution date.",
    state: "Open",
  },
  {
    level: "Level 2",
    title: "Escalation after configured deadline",
    detail: "When the configured response timeline passes without recorded progress, the issue is flagged and raised for escalation review.",
    state: "Escalated",
  },
  {
    level: "Further escalation",
    title: "If the issue remains unresolved",
    detail: "Issues that stay unresolved continue to carry their escalation level and remain listed in the Escalation Center until a resolution is recorded.",
    state: "Unresolved",
  },
];

const aiFlow = [
  { label: "Photo", icon: ImageIcon },
  { label: "AI Analysis", icon: ScanLine },
  { label: "Issue Category", icon: Tags },
  { label: "Severity", icon: Gauge },
  { label: "Suggested Description", icon: FileSearch },
];

function formatIssueDate(value) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function WorkflowVisual({ type }) {
  if (type === "capture") {
    return (
      <div className="workflow-visual capture-visual" aria-hidden="true">
        <div className="capture-frame"><Camera size={30} strokeWidth={1.6} /></div>
        <span className="visual-caption"><MapPin size={12} /> Location attached</span>
      </div>
    );
  }

  if (type === "understand") {
    return (
      <div className="workflow-visual understand-visual" aria-hidden="true">
        <div className="scan-orbit"><ScanLine size={30} strokeWidth={1.6} /></div>
        <span className="visual-tag">Suggested category</span>
        <span className="visual-tag visual-tag-secondary">Severity: Medium</span>
      </div>
    );
  }

  if (type === "track") {
    return (
      <div className="workflow-visual track-visual" aria-hidden="true">
        <span className="track-line" />
        <span className="track-node track-node-done"><CheckCircle2 size={15} /></span>
        <span className="track-node track-node-current"><Clock3 size={15} /></span>
        <span className="track-node"><span /></span>
        <div className="track-labels"><span>Reported</span><span>In progress</span><span>Resolved</span></div>
      </div>
    );
  }

  return (
    <div className="workflow-visual escalate-visual" aria-hidden="true">
      <div className="deadline-mark"><AlertTriangle size={22} /></div>
      <div className="deadline-copy"><span>Resolution window</span><strong>Deadline passed</strong></div>
      <ArrowRight size={18} className="deadline-arrow" />
      <span className="escalation-pill">Escalation review</span>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [issues, setIssues] = useState(INITIAL_ISSUES);
  const pageRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    apiService.getIssues().then((result) => {
      if (isCurrent && result.success) setIssues(result.data);
    });

    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const targets = Array.from(root.querySelectorAll("[data-reveal]"));
    if (typeof IntersectionObserver === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((target) => target.classList.add("is-revealed"));
      return undefined;
    }

    // Reveal once the section reaches the lower quarter of the viewport.
    const TRIGGER = 0.82;
    const reveal = (target) => {
      target.classList.remove("is-reveal-pending");
      target.classList.add("is-revealed");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: `0px 0px -${Math.round((1 - TRIGGER) * 100)}% 0px` },
    );

    targets.forEach((target) => {
      // Anything already at or above the trigger line is shown straight away,
      // so a restored scroll position can never leave a section stuck hidden.
      if (target.getBoundingClientRect().top <= window.innerHeight * TRIGGER) {
        reveal(target);
        return;
      }
      target.classList.add("is-reveal-pending");
      observer.observe(target);
    });

    return () => observer.disconnect();
  }, []);

  const activeCount = issues.filter((issue) => issue.status !== "Resolved").length;
  const resolvedCount = issues.filter((issue) => issue.status === "Resolved").length;
  const escalatedCount = issues.filter(
    (issue) => issue.status === "Escalated" || issue.neglectStatus === "DEADLINE EXCEEDED",
  ).length;
  const recentIssues = issues.slice(0, 6);
  const categoryCount = (category) => issues.filter((issue) => issue.category === category).length;
  const signalReports = issues.reduce((total, issue) => total + (issue.reportCount || 0), 0);
  const strongestSignal = issues.reduce((top, issue) => Math.max(top, issue.collectiveSignalCount || 0), 0);

  return (
    <div className="home-page" ref={pageRef}>
      <Navbar />

      <main>
        <section className="hero-section">
          <div className="hero-inner">
            <div className="hero-copy">
              <CivicLensLogo
                className="mb-6 flex items-center"
                height={62}
                maxWidth={260}
                fallback={
                  <span className="flex items-center gap-3">
                    <span className="grid h-[62px] w-[62px] place-items-center rounded-2xl bg-[#126747] text-white"><Shield size={30} strokeWidth={2} /></span>
                    <span className="text-3xl font-black tracking-tight text-[#102c20]">Civic<span className="text-[#126747]">Lens</span></span>
                  </span>
                }
              />
              <p className="eyebrow"><span className="eyebrow-dot" /> Civic issues, brought into view</p>
              <h1>Make civic issues <em>impossible to ignore.</em></h1>
              <p className="hero-description">
                CivicLens helps citizens capture civic problems with a photo and a location, use AI-assisted understanding to describe them consistently, track their progress in a shared register, and escalate prolonged inaction once a configured response timeline is missed.
              </p>
              <div className="hero-actions">
                <Link to="/report" className="button button-primary button-large"><Camera size={18} /> Report an Issue</Link>
                <Link to="/explore" className="button button-secondary button-large">Explore Issues <ArrowRight size={17} /></Link>
              </div>
              <div className="hero-proof"><Users size={16} /><span>Citizen observations. Shared visibility. Clear next steps.</span></div>
            </div>

            <div className="hero-art" aria-label="A community report documenting a road issue">
              <img src={INITIAL_ISSUES[0].image} alt="Road surface issue documented by a citizen in Bengaluru" />
              <div className="hero-image-shade" />
              <div className="hero-image-label"><span className="live-indicator" /> Field report <span>·</span> Bengaluru</div>
              <div className="hero-report-chip">
                <div className="chip-pin"><MapPin size={17} /></div>
                <div><strong>Road issue reported</strong><span>Koramangala 5th Block</span></div>
                <ArrowUpRight size={17} />
              </div>
              <div className="hero-image-index">01 <span>/</span> 04</div>
            </div>
          </div>
          <div className="hero-bottomline"><span>01 / Observe</span><span>From a street-level signal to civic follow-through</span><span>BENGALURU · INDIA</span></div>
        </section>

        <section className="activity-section" data-reveal aria-labelledby="activity-title">
          <div className="section-shell">
            <div className="activity-heading">
              <div><p className="eyebrow">The civic pulse</p><h2 id="activity-title">Civic activity</h2></div>
              <Link to="/explore" className="text-link">View all issues <ArrowRight size={16} /></Link>
            </div>
            <div className="activity-grid">
              <article className="activity-stat activity-stat-total reveal-item" style={{ "--i": 0 }}>
                <div className="stat-top"><span>Issues Reported</span><span className="stat-icon"><Users size={18} /></span></div>
                <strong><CountUp value={issues.length} /></strong><span className="stat-foot">Across the current issue register</span>
              </article>
              <article className="activity-stat reveal-item" style={{ "--i": 1 }}>
                <div className="stat-top"><span>Issues Under Action</span><span className="stat-icon stat-icon-blue"><Activity size={18} /></span></div>
                <strong><CountUp value={activeCount} /></strong><span className="stat-foot"><i className="status-dot status-dot-blue" /> Not marked resolved</span>
              </article>
              <article className="activity-stat reveal-item" style={{ "--i": 2 }}>
                <div className="stat-top"><span>Issues Resolved</span><span className="stat-icon stat-icon-green"><CheckCircle2 size={18} /></span></div>
                <strong><CountUp value={resolvedCount} /></strong><span className="stat-foot"><i className="status-dot" /> Marked resolved</span>
              </article>
              <article className="activity-stat reveal-item" style={{ "--i": 3 }}>
                <div className="stat-top"><span>Escalated Issues</span><span className="stat-icon stat-icon-amber"><AlertTriangle size={18} /></span></div>
                <strong><CountUp value={escalatedCount} /></strong><span className="stat-foot"><i className="status-dot status-dot-amber" /> Deadline exceeded or escalated</span>
              </article>
            </div>
            <p className="data-note">Counts reflect the current local issue register, including its sample records.</p>
          </div>
        </section>

        <section className="category-section section-shell" data-reveal aria-labelledby="category-title">
          <div className="section-heading-row">
            <div><p className="eyebrow">What neighbors are seeing</p><h2 id="category-title">Small signals. <span>Shared picture.</span></h2></div>
            <p>From damaged streets to blocked drains, put everyday civic issues on the map.</p>
          </div>
          <div className="category-grid">
            {categoryCards.map(({ title, description, icon: Icon, issue }, index) => (
              <Link to="/explore" className="category-card reveal-item" style={{ "--i": index }} key={title}>
                <div className="category-photo"><img src={issue.image} alt={issue.title} loading="lazy" /><span className="category-index">0{index + 1}</span><span className="category-count">{categoryCount(title)} {categoryCount(title) === 1 ? "issue" : "issues"}</span></div>
                <div className="category-card-copy"><div className="category-title-row"><span className="category-icon"><Icon size={17} /></span><h3>{title}</h3></div><p>{description}</p><span className="category-explore">Explore reports <ArrowUpRight size={15} /></span></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="workflow-section" data-reveal aria-labelledby="workflow-title">
          <div className="section-shell">
            <div className="workflow-heading"><p className="eyebrow">A clearer civic lifecycle</p><h2 id="workflow-title">Capture <span>→</span> Understand <span>→</span> Track <span>→</span> Escalate</h2><p>One report can be the start of a more visible process.</p></div>
            <div className="workflow-grid">
              {workflowSteps.map(({ number, title, description, icon: Icon, visual }, index) => (
                <article className="workflow-card reveal-item" style={{ "--i": index }} key={number}>
                  <WorkflowVisual type={visual} />
                  <div className="workflow-card-heading"><span>{number}</span><Icon size={17} /><h3>{title}</h3></div>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="understanding-section section-shell" data-reveal aria-labelledby="understanding-title">
          <div className="understanding-visual">
            <div className="ai-flow" aria-label="Photo to AI analysis to issue category, severity and suggested description">
              {aiFlow.map(({ label, icon: Icon }, index) => (
                <div className="ai-flow-item" key={label}>
                  <span className="ai-flow-node"><Icon size={15} /></span>
                  <span className="ai-flow-label">{label}</span>
                  {index < aiFlow.length - 1 && <ArrowDown className="ai-flow-arrow" size={14} />}
                </div>
              ))}
            </div>
            <div className="evidence-sheet">
              <div className="evidence-topline"><span><Sparkles size={15} /> Evidence notes</span><span>DEMO RECORD</span></div>
              <div className="evidence-scan"><ScanLine size={27} /><span>Photo evidence<br />Issue details</span></div>
              <p className="evidence-detection">AI detected possible road damage</p>
              <div className="evidence-result"><span>Category</span><strong>Roads &amp; Infrastructure</strong><span className="result-divider" /><span>Suggested severity</span><strong className="severity-value">High</strong><span className="result-divider" /><span>Suggested description</span><strong className="result-text">Visible road surface damage requiring attention.</strong></div>
            </div>
            <span className="visual-footnote">Example fields from a saved sample issue</span>
          </div>
          <div className="understanding-copy">
            <p className="eyebrow">AI / Gemini assisted understanding</p>
            <h2 id="understanding-title">Make evidence easier to <em>act on.</em></h2>
            <p>A photo on its own rarely describes a civic problem well enough to route. AI analysis reviews the image and helps suggest the issue category, a severity level and a written description, so every report reaches the register in a comparable form.</p>
            <ul className="ai-benefit-list">
              <li><CheckCircle2 size={15} /> Suggested category routes the report to the right civic issue type.</li>
              <li><CheckCircle2 size={15} /> Suggested severity helps prioritise what gets attention first.</li>
              <li><CheckCircle2 size={15} /> Suggested description gives reviewers a clear starting point.</li>
            </ul>
            <div className="ai-status"><span className="ai-status-mark"><Sparkles size={16} /></span><span><strong>Current demo status</strong><small>Sample records include suggestion fields. A live Gemini analysis is not connected in this project.</small></span></div>
          </div>
        </section>

        <section className="map-section" data-reveal aria-labelledby="map-title">
          <div className="section-shell map-layout">
            <div className="map-copy"><p className="eyebrow">Place matters</p><h2 id="map-title">See civic issues <em>where they happen.</em></h2><p>The Civic Map brings reported locations and issue types into a shared geographic view of the Bengaluru demo area. Each marker represents a report's recorded location, and its state reflects the issue's current status.</p><div className="map-legend"><span><i className="legend-dot legend-road" />Roads</span><span><i className="legend-dot legend-water" />Water</span><span><i className="legend-dot legend-safety" />Safety</span><span><i className="legend-dot legend-waste" />Waste</span></div><Link to="/map" className="button button-primary">Explore Civic Map <ArrowRight size={16} /></Link></div>
            <div className="map-preview" aria-label="Illustrative map preview with civic issue locations">
              <div className="map-grid-lines" />
              <span className="map-road map-road-one" /><span className="map-road map-road-two" /><span className="map-road map-road-three" /><span className="map-road map-road-four" />
              <span className="map-block map-block-one" /><span className="map-block map-block-two" /><span className="map-block map-block-three" /><span className="map-block map-block-four" />
              <span className="map-neighborhood map-neighborhood-one">KORAMANGALA</span><span className="map-neighborhood map-neighborhood-two">INDIRANAGAR</span>
              <span className="map-pin map-pin-road" style={{ "--i": 0 }}><Construction size={14} /></span><span className="map-pin map-pin-water" style={{ "--i": 1 }}><Droplets size={14} /></span><span className="map-pin map-pin-safety" style={{ "--i": 2 }}><Shield size={14} /></span><span className="map-pin map-pin-waste" style={{ "--i": 3 }}><Trash2 size={14} /></span>
              <div className="map-count"><MapPinned size={16} /><span><strong><CountUp value={issues.length} /></strong> mapped sample issues</span></div>
              <span className="map-scale">BENGALURU · DEMO MAP</span>
            </div>
          </div>
        </section>

        <section className="signal-section" data-reveal aria-labelledby="signal-title">
          <div className="section-shell signal-layout">
            <div className="signal-copy">
              <p className="eyebrow">Collective signal</p>
              <h2 id="signal-title">One report is a data point. <em>Many reports are a signal.</em></h2>
              <p>Multiple independent reports about the same civic problem can create a stronger collective signal. Repeated reports can help surface issues affecting an entire community, because a problem reported by many people in the same area is unlikely to be a one-off observation.</p>
              <div className="signal-stats">
                <div><strong><CountUp value={signalReports} /></strong><span>citizen reports recorded</span></div>
                <div><strong><CountUp value={strongestSignal} /></strong><span>reports on the strongest signal</span></div>
              </div>
              <Link to="/explore" className="text-link">See how signals appear <ArrowRight size={16} /></Link>
            </div>
            <div className="signal-visual" aria-label="Twelve citizens in the same area reporting a similar issue form a collective signal">
              {signalSteps.map(({ label, detail, icon: Icon }, index) => (
                <div className="signal-step reveal-item" style={{ "--i": index }} key={label}>
                  <span className="signal-step-icon"><Icon size={18} /></span>
                  <div><strong>{label}</strong><span>{detail}</span></div>
                  {index < signalSteps.length - 1 && <ArrowDown className="signal-step-arrow" size={16} />}
                </div>
              ))}
              <div className="signal-result"><span className="signal-result-mark"><Flame size={19} /></span><div><strong>Collective Signal</strong><span>Repeated reports surface issues affecting a whole community.</span></div></div>
            </div>
          </div>
        </section>

        <section className="neglect-section section-shell" data-reveal aria-labelledby="neglect-title">
          <div className="neglect-intro">
            <p className="eyebrow">Prolonged inaction, made visible</p>
            <h2 id="neglect-title">An issue that stays open <em>stays on the record.</em></h2>
            <p>Not every issue is resolved on the day it is reported. CivicLens records what was expected and what was recorded, so an issue that remains unresolved does not quietly disappear from view.</p>
          </div>
          <ol className="neglect-flow" aria-label="Issue reported, response expected, no action recorded, issue remains visible, escalation review">
            {neglectStages.map((stage, index) => (
              <li className={`neglect-stage reveal-item${index === neglectStages.length - 1 ? " neglect-stage-final" : ""}`} style={{ "--i": index }} key={stage.title}>
                <span className="neglect-marker">{String(index + 1).padStart(2, "0")}</span>
                <div className="neglect-stage-copy"><strong>{stage.title}</strong><span>{stage.detail}</span></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="escalation-section section-shell" data-reveal aria-labelledby="escalation-title">
          <div className="escalation-intro"><p className="eyebrow">Visibility beyond submission</p><h2 id="escalation-title">A report deserves a <em>next step.</em></h2><p>CivicLens keeps the response path visible, including when a configured resolution window passes without an update.</p><Link to="/escalation" className="text-link">Visit escalation center <ArrowRight size={16} /></Link></div>
          <div className="escalation-flow" aria-label="Report, authority response, track progress, deadline missed, escalation">
            {escalationStages.map((stage, index) => <div className={`escalation-stage reveal-item${index === escalationStages.length - 1 ? " escalation-stage-final" : ""}`} style={{ "--i": index }} key={stage}><span className="stage-number">0{index + 1}</span><span className="stage-label">{stage}</span>{index < escalationStages.length - 1 && <ArrowRight className="stage-arrow" size={17} />}</div>)}
            <p className="escalation-caveat"><Clock3 size={14} /> Statuses and expected dates are stored in issue records; automatic deadline monitoring is not currently wired into the demo.</p>
          </div>
        </section>

        <section className="ladder-section" data-reveal aria-labelledby="ladder-title">
          <div className="section-shell">
            <div className="ladder-heading">
              <div><p className="eyebrow">The escalation ladder</p><h2 id="ladder-title">Escalation follows the <span>configured timeline.</span></h2></div>
              <p>Each level reflects the state of an issue relative to its expected resolution date, as recorded against the issue.</p>
            </div>
            <div className="ladder-track">
              {escalationLadder.map((rung, index) => (
                <article className="ladder-rung reveal-item" style={{ "--i": index }} key={rung.level}>
                  <div className="ladder-rung-top">
                    <span className="ladder-level">{rung.level}</span>
                    <span className="ladder-state">{rung.state}</span>
                  </div>
                  <h3>{rung.title}</h3>
                  <p>{rung.detail}</p>
                  {index < escalationLadder.length - 1 && <span className="ladder-connector" aria-hidden="true"><ArrowDown size={16} /></span>}
                </article>
              ))}
            </div>
            <div className="ladder-footer">
              <p><Clock3 size={14} /> Escalation levels depend on the timelines configured for an issue and on the project's escalation workflow.</p>
              <Link to="/escalation" className="button button-primary">Open Escalation Center <ArrowRight size={16} /></Link>
            </div>
          </div>
        </section>

        <section className="recent-section" data-reveal aria-labelledby="recent-title">
          <div className="section-shell">
            <div className="section-heading-row recent-heading"><div><p className="eyebrow">From the issue register</p><h2 id="recent-title">Recent civic activity</h2></div><Link to="/explore" className="text-link">Explore all issues <ArrowRight size={16} /></Link></div>
            <div className="recent-grid">
              {recentIssues.map((issue, index) => (
                <Link to={`/issue/${issue.id}`} className="recent-card reveal-item" style={{ "--i": index }} key={issue.id}>
                  <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${issue.image}`} alt={issue.title} loading="lazy" />
                  <div className="recent-card-content">
                    <div className="recent-meta"><span>{issue.category}</span><span className={`issue-status ${issue.status === "Resolved" ? "issue-status-resolved" : issue.status === "Escalated" ? "issue-status-escalated" : ""}`}>{issue.status}</span></div>
                    <h3>{issue.title}</h3>
                    <p><MapPin size={13} />{issue.location}</p>
                    <div className="recent-tags">
                      <span className="recent-tag"><Clock3 size={11} />{formatIssueDate(issue.createdAt)}</span>
                      {issue.severity && <span className={`recent-tag recent-tag-severity severity-${String(issue.severity).toLowerCase()}`}><AlertTriangle size={11} />{issue.severity}</span>}
                    </div>
                    <div className="recent-card-footer"><span>{issue.reportCount} citizen reports</span><ArrowUpRight size={16} /></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="impact-section section-shell" data-reveal aria-labelledby="impact-title">
          <div className="impact-card">
            <div className="impact-copy">
              <p className="eyebrow">My Civic Impact</p>
              <h2 id="impact-title">What your <em>contribution</em> adds up to.</h2>
              <p>Every report becomes part of a shared civic picture. The figures below are drawn from the current issue register, so they reflect the same data the rest of CivicLens shows.</p>
              {user ? (
                <p className="impact-signed-in">Signed in as <strong>{user.name || user.email || "a CivicLens contributor"}</strong>.</p>
              ) : (
                <p className="impact-signed-in">Sign in to track your own reports alongside these community figures.</p>
              )}
              <Link to={user ? "/profile" : "/signup"} className="text-link">{user ? "View your profile" : "Create an account"} <ArrowRight size={16} /></Link>
            </div>
            <div className="impact-grid">
              <article className="impact-stat reveal-item" style={{ "--i": 0 }}><span className="impact-icon"><UserPlus size={17} /></span><strong><CountUp value={issues.length} /></strong><span>Reports Submitted</span></article>
              <article className="impact-stat reveal-item" style={{ "--i": 1 }}><span className="impact-icon impact-icon-blue"><Users size={17} /></span><strong><CountUp value={signalReports} /></strong><span>Issues Supporting Community Signals</span></article>
              <article className="impact-stat reveal-item" style={{ "--i": 2 }}><span className="impact-icon impact-icon-slate"><TrendingUp size={17} /></span><strong><CountUp value={activeCount} /></strong><span>Issues Under Action</span></article>
              <article className="impact-stat reveal-item" style={{ "--i": 3 }}><span className="impact-icon impact-icon-green"><CheckCircle2 size={17} /></span><strong><CountUp value={resolvedCount} /></strong><span>Issues Resolved</span></article>
            </div>
          </div>
        </section>

        <section className="closing-section">
          <div className="closing-inner">
            <div>
              <p className="eyebrow">Your street-level view matters</p>
              <h2>See a problem? <em>Make it visible.</em></h2>
              <p>Start with what you noticed. Add a photo, a place and the details that help others understand.</p>
            </div>
            <div className="closing-actions">
              <Link to="/report" className="button button-light button-large"><Camera size={18} /> Report an Issue</Link>
              <Link to="/explore" className="button button-ghost-light button-large">Explore Civic Issues <ArrowRight size={17} /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer"><Link to="/" className="brand-lockup"><CivicLensLogo height={30} maxWidth={150} chip fallback={<><span className="brand-mark"><Shield size={18} /></span><span>Civic<span>Lens</span></span></>} /></Link><p>Make civic problems visible. Keep civic action in view.</p><div><Link to="/explore">Explore</Link><Link to="/map">Civic map</Link><Link to="/report">Report an issue</Link></div><small>© 2026 CivicLens · Hackathon demo</small></footer>
    </div>
  );
}