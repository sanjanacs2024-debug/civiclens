import { Link } from 'react-router-dom';
import { Shield, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#00281b] text-emerald-100 border-t border-emerald-900/50 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-xl">
              <div className="bg-[#006c49] p-1.5 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span>CivicLens</span>
            </div>
            <p className="text-sm text-emerald-300/80 leading-relaxed">
              Transforming individual civic complaints into actionable collective intelligence. Empowering citizens through AI analysis, transparency, and systematic escalation.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <h3 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/explore" className="hover:text-white transition-colors">Explore Issues</Link></li>
              <li><Link to="/map" className="hover:text-white transition-colors">Civic Heatmap</Link></li>
              <li><Link to="/escalation" className="hover:text-white transition-colors">Escalation Center</Link></li>
              <li><Link to="/report" className="hover:text-white transition-colors">Report an Issue</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h3 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Civic Technology</h3>
            <ul className="space-y-2.5 text-sm">
              <li><span className="text-emerald-300/70">Gemini Vision AI Engine</span></li>
              <li><span className="text-emerald-300/70">Collective Signal Clustering</span></li>
              <li><span className="text-emerald-300/70">Automated Neglect Signals</span></li>
              <li><span className="text-emerald-300/70">Municipal SLA Tracking</span></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h3 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Pilot Zone</h3>
            <div className="bg-[#003c2a] p-3.5 rounded-lg border border-emerald-700/40 text-xs space-y-2">
              <span className="bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded inline-block">Active Zone</span>
              <p className="font-medium text-white">Bengaluru Municipal Region (BBMP)</p>
              <p className="text-emerald-300/70">Expanding to regional smart cities nationwide.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-emerald-900/80 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-emerald-400/80 gap-4">
          <p>© 2026 CivicLens. Built for Civic Innovation Hackathon.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">Crafted with <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" /> for Urban Governance</span>
          </div>
        </div>
      </div>
    </footer>
  );
}