import { Link } from 'react-router-dom';
import { MapPin, AlertCircle, Users, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function IssueCard({ issue }) {
  // Records fetched from the API use the database field names, while the sample
  // register uses display aliases, so each value needs a safe fallback.
  const reportDate = issue.createdDate || (issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : '');
  const confirmations = issue.confirmations ?? issue.reportCount ?? 0;
  const aiConfidence = issue.aiAnalysis?.confidence;
  const aiDepartment = issue.aiAnalysis?.recommendedDept;
  const hasAiAnalysis = aiConfidence !== undefined || Boolean(aiDepartment);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Escalated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-emerald-900/10 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
      <div>
        {/* Card Header Image */}
        <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
          <img
            src={issue.image}
            alt={issue.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm ${getStatusBadge(issue.status)}`}>
              {issue.status}
            </span>
            {issue.neglectSignal && (
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Neglect Signal
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-[#006c49] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              {issue.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {reportDate}
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-1 hover:text-[#006c49] transition-colors">
            <Link to={`/issue/${issue.id}`}>{issue.title}</Link>
          </h3>

          <p className="text-slate-600 text-sm mb-4 line-clamp-2">
            {issue.description}
          </p>

          <div className="flex items-start gap-1.5 text-xs text-slate-600 mb-3">
            <MapPin className="w-4 h-4 text-[#006591] shrink-0 mt-0.5" />
            <span className="line-clamp-1">{issue.location}</span>
          </div>

          {/* AI Badge */}
          {hasAiAnalysis && (
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 mb-4 text-xs">
              <div className="flex items-center gap-1.5 text-[#006c49] font-semibold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AI Classification</span>
                <span className="ml-auto text-slate-400 font-normal">{aiConfidence}% confidence</span>
              </div>
              <p className="text-slate-600 truncate">{aiDepartment}</p>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-700 font-medium">
          <Users className="w-4 h-4 text-[#006c49]" />
          <span><b>{confirmations}</b> Citizens Confirmed</span>
        </div>
        <Link
          to={`/issue/${issue.id}`}
          className="text-[#006c49] font-semibold hover:text-[#1b6b51] flex items-center gap-1"
        >
          View Details <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}