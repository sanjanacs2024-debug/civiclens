import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useCallback, useState } from "react";
import { AuthProvider } from "./contexts/AuthProvider.jsx";
import { useAuth } from "./contexts/useAuth";

import Home from "./pages/home";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ReportIssue from "./pages/reportissue";
import ExploreIssues from "./pages/exploreissues";
import IssueDetails from "./pages/issuedetails";
import CivicMap from "./pages/civicmap";
import EscalationCenter from "./pages/escalationcenter";
import Profile from "./pages/profile";
import About from "./pages/about";
import AdminDashboard from "./pages/AdminDashboard";
import SplashScreen from "./components/SplashScreen";

function ProtectedReport({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="p-8 text-center text-[#006c49]">Checking your CivicLens session...</main>;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location, notice: "Please sign in to report a civic issue." }} />;
  }
  return children;
}

function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const handleSplashFinish = useCallback(() => setSplashVisible(false), []);

  return (
    <BrowserRouter>
      {splashVisible && <SplashScreen onFinish={handleSplashFinish} />}
      <AuthProvider>
        {!splashVisible && (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/report" element={<ProtectedReport><ReportIssue /></ProtectedReport>} />
            <Route path="/explore" element={<ExploreIssues />} />
            <Route path="/issue/:id" element={<IssueDetails />} />
            <Route path="/map" element={<CivicMap />} />
            <Route path="/escalation" element={<EscalationCenter />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
          </Routes>
        )}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;