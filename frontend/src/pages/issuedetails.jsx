import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapPin,
  Flame,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { apiService } from "../services/api";
import Navbar from "../components/Navbar";

export default function IssueDetails() {
  const { id } = useParams();
  const [result, setResult] = useState({ id: null, issue: null, error: null });

  useEffect(() => {
    let cancelled = false;
    apiService.getIssueById(id).then((res) => {
      if (cancelled) return;
      if (res.success) setResult({ id, issue: res.data, error: null });
      else setResult({ id, issue: null, error: res.error || "Issue not found" });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loading = result.id !== id;
  const issue = result.issue;
  const error = result.error;

  const handleSignalSupport = async () => {
    const res = await apiService.incrementReport(issue.id);
    if (res.success) {
      setResult((current) => ({ ...current, issue: res.data }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e7fff2]">
        <p className="text-[#006c49] font-bold">Loading civic issue details...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#e7fff2] p-6">
        <p className="text-xl font-bold text-red-600">Issue record not found.</p>
        <Link to="/explore" className="mt-4 font-bold text-[#006c49] underline">
          Return to Explore Issues
        </Link>
      </div>
    );
  }

  const stages = ["Reported", "Under Review", "In Progress", "Resolved"];
  const currentStatus = issue.status === "Acknowledged" ? "Under Review" : issue.status;
  const currentStageIndex = stages.indexOf(currentStatus) !== -1 ? stages.indexOf(currentStatus) : 1;

  return (
    <div className="min-h-screen bg-[#e7fff2] text-[#102c20]">

      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-8">

        <div className="rounded-3xl border border-[#006c49]/15 bg-white p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">{issue.id}</span>
                <span className="rounded-md bg-[#e7fff2] px-2.5 py-0.5 text-xs font-bold text-[#006c49]">
                  {issue.category}
                </span>
                <span className="rounded-md bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200">
                  {issue.severity} Severity
                </span>
              </div>
              <h1 className="mt-2 text-3xl font-black text-[#102c20]">{issue.title}</h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <MapPin size={16} className="text-[#006c49]" /> {issue.location}
              </p>
            </div>

            <button
              onClick={handleSignalSupport}
              className="flex items-center gap-2 rounded-xl bg-[#006c49] px-5 py-3 font-bold text-white shadow-lg transition hover:bg-[#1b6b51]"
            >
              <Flame size={18} /> Signal Support ({issue.reportCount})
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">

          <div className="space-y-8 lg:col-span-2">
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md">
              <div className="relative h-96 w-full bg-slate-900">
                <img
 src={issue.image}
  alt={issue.title}
  className="h-full w-full object-cover"
/>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Citizen Report Description</h3>
                <p className="mt-2 text-base text-[#102c20] leading-relaxed">{issue.description}</p>
              </div>
            </div>

            {issue.collectiveSignal && (
              <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-900 shadow-sm">
                <div className="flex items-center gap-3">
                  <Flame size={24} className="text-amber-600 animate-pulse" />
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wide">Collective Signal Active</h3>
                    <p className="text-xs font-medium">
                      {issue.collectiveSignalCount} independent citizens reported similar damage in this local area.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {issue.neglectStatus === "DEADLINE EXCEEDED" && (
              <div className="rounded-3xl border border-red-300 bg-red-50 p-6 text-red-900 shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={24} className="text-red-600" />
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wide">Red Flag: Deadline Exceeded</h3>
                    <p className="text-xs font-medium mt-0.5">
                      Configured resolution SLA date has passed without site resolution.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
              <h3 className="text-sm font-extrabold text-[#006c49] uppercase tracking-wider">Resolution Telemetry Tracking</h3>
              <div className="mt-6 flex items-center justify-between">
                {stages.map((st, idx) => {
                  const isDone = idx <= currentStageIndex;
                  return (
                    <div key={st} className="flex-1 text-center relative">
                      <div
                        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full font-bold text-xs ${
                          isDone ? "bg-[#006c49] text-white" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <p className={`mt-2 text-xs font-bold ${isDone ? "text-[#006c49]" : "text-slate-400"}`}>
                        {st}
                      </p>
                    </div>
                  );
                })}
              </div>
              {issue.progressUpdates?.length > 0 && (
                <ol className="mt-6 space-y-4 border-l border-emerald-200 pl-4">
                  {[...issue.progressUpdates].reverse().map((update) => (
                    <li key={update.id || update._id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#126747] ring-4 ring-white" />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong className="text-xs text-[#19332a]">{update.status}</strong>
                        <time className="text-[10px] text-slate-400" dateTime={update.date}>{new Date(update.date).toLocaleDateString()}</time>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{update.description}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
              <h3 className="text-sm font-extrabold text-[#006c49] uppercase tracking-wider">Escalation Ladder</h3>
              <div className="mt-6 space-y-4">
                <div className="p-4 rounded-2xl border border-[#006c49] bg-[#e7fff2]">
                  <span className="text-xs font-black text-[#006c49]">LEVEL 1</span>
                  <h4 className="mt-1 text-sm font-bold text-[#102c20]">Local Ward Authority</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{issue.department}</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-black text-slate-400">LEVEL 2</span>
                  <h4 className="mt-1 text-sm font-bold text-[#102c20]">Municipal Zonal Directorate</h4>
                </div>
              </div>
            </div>

            {issue.aiAnalysis && (
              <div className="rounded-3xl border border-[#006591]/20 bg-[#006591]/5 p-6 text-[#006591]">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} />
                  <h3 className="text-xs font-black uppercase tracking-wider">Gemini AI Analysis</h3>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div>
                    <span className="font-semibold opacity-75">Detected Category:</span>
                    <p className="font-bold">{issue.aiAnalysis.detectedCategory}</p>
                  </div>
                  <div>
                    <span className="font-semibold opacity-75">Confidence Score:</span>
                    <p className="font-bold">{(issue.aiAnalysis.confidence * 100).toFixed(0)}% Match</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}