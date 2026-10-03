import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiService, ISSUES_CHANGED_EVENT } from "../services/api";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function RecenterButton() {
  const map = useMap();

  const handleClick = () => {
    map.setView([12.9716, 77.5946], 12);
  };

  return (
    <button
      onClick={handleClick}
      className="absolute right-4 top-4 z-[1000] rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg hover:bg-slate-50"
    >
      ⌖ Bengaluru
    </button>
  );
}

function formatReportedDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

// Reports filed from a manually typed area carry no coordinates. Number(null)
// would coerce to 0 and pin those reports at [0, 0], so they are excluded here.
function hasCoordinates(issue) {
  const { latitude, longitude } = issue;
  if (latitude === null || latitude === undefined || latitude === "") return false;
  if (longitude === null || longitude === undefined || longitude === "") return false;
  return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
}

function getMarkerColor(issue) {
  if (issue.status === "Escalated") return "#dc2626";
  if (issue.severity === "Critical" || issue.severity === "High") return "#f97316";
  if (issue.collectiveSignal) return "#2f7184";
  if (issue.status === "Under Review" || issue.status === "Acknowledged") return "#eab308";
  if (issue.status === "In Progress") return "#2563eb";
  return "#059669";
}

function createMarker(issue, offset = ZERO_OFFSET) {
  const color = getMarkerColor(issue);

  return L.divIcon({
    className: "",
    html: `
      <div style="transform: translate(${offset.x}px, ${offset.y}px);">
        <div style="
          width: 34px;
          height: 34px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,.3);
          display:flex;
          align-items:center;
          justify-content:center;
        ">
          <div style="
            width: 9px;
            height: 9px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

function IssuePopup({ issue }) {
  return (
    <div className="min-w-[190px]">
      <h3 className="font-bold text-slate-900">
        {issue.title}
      </h3>

      <p className="mt-1 text-sm text-slate-600">
        {issue.location}
      </p>

      <dl className="mt-2 space-y-1 text-xs text-slate-700">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Category</dt>
          <dd className="text-right font-semibold">{issue.category}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Severity</dt>
          <dd className="text-right font-semibold">{issue.severity}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Area</dt>
          <dd className="text-right font-semibold">{issue.area || issue.location}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Department</dt>
          <dd className="text-right font-semibold">{issue.department}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Reported</dt>
          <dd className="text-right font-semibold">{formatReportedDate(issue.createdAt)}</dd>
        </div>
      </dl>

      {issue.description && (
        <p className="mt-2 line-clamp-3 text-xs text-slate-600">
          {issue.description}
        </p>
      )}

      <div className="mt-2 text-sm">
        <strong>{issue.reportCount}</strong> reports
      </div>

      <div className="mt-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        {issue.status}
      </div>
    </div>
  );
}

// Reports filed at the same coordinates would draw on the exact same pixel. Each
// one still renders its own marker at that point, fanned out just far enough to
// stay separately visible and clickable.
const ZERO_OFFSET = { x: 0, y: 0 };
const SPIDER_RADIUS = 38;

function coordinateKey(issue) {
  return `${Number(issue.latitude).toFixed(6)},${Number(issue.longitude).toFixed(6)}`;
}

function spiderOffset(index, total) {
  if (total < 2) return ZERO_OFFSET;
  const angle = (2 * Math.PI * index) / total;
  return { x: Math.round(Math.cos(angle) * SPIDER_RADIUS), y: Math.round(Math.sin(angle) * SPIDER_RADIUS) };
}

export default function CivicMap() {
  const [issues, setIssues] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  // Reads the register straight from the backend every time, so a report saved in
  // this tab or another one appears here without any manual refresh.
  const loadIssues = useCallback(async ({ showSpinner } = {}) => {
    if (showSpinner) setLoading(true);
    const result = await apiService.getIssues();
    if (!result.success) return;
    setIssues(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    apiService.getIssues().then((result) => {
      if (!isCurrent) return;
      if (result.success) setIssues(result.data);
      setLoading(false);
    });

    // A report saved elsewhere (another tab, or the report page) refreshes this view.
    const onIssuesChanged = () => loadIssues();
    const onWindowFocus = () => loadIssues();
    const onVisibility = () => { if (document.visibilityState === "visible") loadIssues(); };

    window.addEventListener(ISSUES_CHANGED_EVENT, onIssuesChanged);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      isCurrent = false;
      window.removeEventListener(ISSUES_CHANGED_EVENT, onIssuesChanged);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadIssues]);

  const categories = ["All", "Roads & Infrastructure", "Waste & Cleanliness", "Water & Drainage", "Public Safety"];

  const filteredIssues =
    selectedCategory === "All"
      ? issues
      : issues.filter((issue) => issue.category === selectedCategory);
  const mappedIssues = filteredIssues.filter(hasCoordinates);

  // Every report keeps its own marker. This only tracks which reports share a
  // coordinate so those markers can be fanned out on demand, never merged.
  const positionsAt = useMemo(() => {
    const groups = new Map();
    for (const issue of mappedIssues) {
      const key = coordinateKey(issue);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(issue);
    }
    return groups;
  }, [mappedIssues]);

  // Reports with no verified position stay in the register instead of being dropped
  // from the page or pinned at a guessed coordinate.
  const reportsWithoutLocation = filteredIssues.filter((issue) => !hasCoordinates(issue));
  const escalatedCount = issues.filter((issue) => issue.status === "Escalated" || issue.neglectStatus === "DEADLINE EXCEEDED").length;
  const collectiveCount = issues.filter((issue) => issue.collectiveSignal).length;
  const resolvedCount = issues.filter((issue) => issue.status === "Resolved").length;

  return (
    <div className="min-h-screen bg-[#e7fff2] text-slate-800">
      <Navbar />

      {/* Main */}
      <main className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-5">
          <h2 className="text-3xl font-bold text-slate-900">
            Bengaluru Civic Map
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Explore reported civic issues, collective signals and escalations.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedCategory === category
                  ? "bg-emerald-700 text-white shadow"
                  : "bg-white text-slate-600 ring-1 ring-emerald-100 hover:bg-emerald-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Map + side panel */}
        <div className="grid overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl lg:grid-cols-[1fr_340px]">
          {/* Map */}
          <div className="relative h-[620px]">
            <MapContainer
              center={[12.9716, 77.5946]}
              zoom={12}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <RecenterButton />

{mappedIssues.map((issue) => {
                const key = coordinateKey(issue);
                const group = positionsAt.get(key) ?? [issue];

                // Reports sharing one coordinate would draw over each other, so each
                // keeps its own marker fanned out from that exact point. Every dot
                // stays visible and clickable, and none of them is merged.
                const offset = group.length > 1
                  ? spiderOffset(group.indexOf(issue), group.length)
                  : ZERO_OFFSET;

                return (
                  <Marker
                    key={issue.id}
                    position={[Number(issue.latitude), Number(issue.longitude)]}
                    icon={createMarker(issue, offset)}
                  >
                    <Popup autoPan={false}>
                      <IssuePopup issue={issue} />
                    </Popup>
                  </Marker>
                );
              })}

              {/* Bengaluru focus area */}
              <Circle
                center={[12.9716, 77.5946]}
                radius={4500}
                pathOptions={{
                  color: "#059669",
                  fillColor: "#10b981",
                  fillOpacity: 0.04,
                }}
              />
            </MapContainer>
          </div>

          {/* Right panel */}
          <aside className="border-l border-emerald-100 bg-white p-5">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Issue Register
              </p>

              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Civic Signals
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs text-slate-500">Reports</p>
                <p className="mt-1 text-2xl font-bold text-emerald-800">
                  {loading ? "..." : issues.length}
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-4">
                <p className="text-xs text-slate-500">Escalated</p>
                <p className="mt-1 text-2xl font-bold text-red-700">{loading ? "..." : escalatedCount}</p>
              </div>

              <div className="rounded-2xl bg-purple-50 p-4">
                <p className="text-xs text-slate-500">Collective</p>
                <p className="mt-1 text-2xl font-bold text-purple-700">
                  {loading ? "..." : collectiveCount}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs text-slate-500">Resolved</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">
                  {loading ? "..." : resolvedCount}
                </p>
              </div>
            </div>

            {reportsWithoutLocation.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-1 font-bold text-slate-900">
                  Location unavailable
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  These reports were saved without verified coordinates, so they are not
                  pinned on the map.
                </p>
                <ul className="space-y-2">
                  {reportsWithoutLocation.map((issue) => (
                    <li key={issue.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <Link to={`/issue/${issue.id}`} className="block text-sm font-bold text-slate-900 hover:underline">
                        {issue.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-600">{issue.location}</p>
                      <p className="mt-1 text-[11px] font-semibold text-amber-800">
                        {issue.status} · {issue.severity}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6">
              <h4 className="mb-3 font-bold text-slate-900">
                Map Legend
              </h4>

              <div className="space-y-3 text-sm">
                <Legend color="bg-emerald-600" text="Reported" />
                <Legend color="bg-yellow-500" text="Under Review" />
                <Legend color="bg-blue-600" text="In Progress" />
                <Legend color="bg-orange-500" text="High severity" />
                <Legend color="bg-[#2f7184]" text="Collective Signal" />
                <Legend color="bg-red-600" text="Escalated" />
              </div>
            </div>

            <div className="mt-7 rounded-2xl bg-slate-900 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                CivicLens Intelligence
              </p>

              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Multiple independent reports can form a Collective Signal,
                helping important civic issues become more visible.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Legend({ color, text }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-slate-600">{text}</span>
    </div>
  );
}