import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Award, Mail, Activity } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import IssueCard from '../components/IssueCard';

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

export default function Profile() {
  const { user } = useAuth();
  const [issues, setIssues] = useState(null);

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;
    apiService.getIssues().then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setIssues([]);
        return;
      }
      setIssues(result.data.filter((issue) => issue.reportedBy === user.id).slice(0, 2));
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const myIssues = issues && user?.id ? issues : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#f4fbf7]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Header */}
        <div className="bg-white rounded-2xl border border-emerald-900/10 p-6 shadow-sm mb-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-[#006c49] text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md">
            {initialsOf(user?.name)}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-slate-900">{user?.name || 'Guest'}</h1>
            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
              <Mail className="w-3.5 h-3.5 text-[#006591]" /> {user?.email || user?.phone || 'No contact details on file'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="bg-emerald-100 text-[#006c49] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Verified Civic Contributor
              </span>
            </div>
          </div>
        </div>

        {/* User Activity Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#006c49]" /> Your Reported Issues
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myIssues.length === 0 ? (
              <p className="text-xs text-slate-500 col-span-full">You have not reported any civic issues yet.</p>
            ) : (
              myIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
