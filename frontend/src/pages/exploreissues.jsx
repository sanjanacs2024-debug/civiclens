import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, ArrowRight, Flame } from "lucide-react";
import { apiService } from "../services/api";
import Navbar from "../components/Navbar";

export default function Explore() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    let cancelled = false;
    apiService.getIssues({ search, category, status }).then((res) => {
      if (cancelled) return;
      if (res.success) setIssues(res.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [search, category, status]);

  return (
    <div className="min-h-screen bg-[#e7fff2] text-[#102c20]">

      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-8">

        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#006c49]">Public Telemetry</span>
          <h1 className="text-3xl font-black text-[#102c20]">Explore Civic Issues</h1>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 rounded-2xl bg-white p-4 shadow-md border border-[#006c49]/10">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#e7fff2]/50 px-3 py-2 border border-slate-200">
            <Search size={18} className="text-[#006c49]" />
            <input
              type="text"
              placeholder="Search by title, location or ID..."
              value={search}
              onChange={(e) => { setLoading(true); setSearch(e.target.value); }}
              className="w-full bg-transparent text-sm font-medium outline-none"
            />
          </div>

          <select
            value={category}
            onChange={(e) => { setLoading(true); setCategory(e.target.value); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Roads & Infrastructure">Roads & Infrastructure</option>
            <option value="Waste & Cleanliness">Waste & Cleanliness</option>
            <option value="Water & Drainage">Water & Drainage</option>
            <option value="Public Safety">Public Safety</option>
          </select>

          <select
            value={status}
            onChange={(e) => { setLoading(true); setStatus(e.target.value); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Under Review">Under Review</option>
            <option value="In Progress">In Progress</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {loading ? (
          <div className="mt-12 text-center text-sm font-bold text-[#006c49]">Loading civic issues...</div>
        ) : issues.length === 0 ? (
          <div className="mt-12 text-center text-sm text-slate-500">There's nothing matching your filters.</div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {issues.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48 w-full bg-slate-100">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white">
                    {item.id}
                  </span>
                  {item.collectiveSignal && (
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                      <Flame size={12} /> Collective Signal
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#006c49]">
                      {item.category}
                    </span>
                    <h3 className="mt-1 text-base font-extrabold text-[#102c20]">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={12} /> {item.location}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                    <span className="font-bold text-[#006c49]">{item.reportCount} Signal Reports</span>
                    <Link
                      to={`/issue/${item.id}`}
                      className="flex items-center gap-1 font-bold text-[#006c49] hover:underline"
                    >
                      View Telemetry <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}