import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Camera, LogOut, Menu, Shield, UserRound, X } from "lucide-react";
import CivicLensLogo from "./CivicLensLogo";
import { useAuth } from "../contexts/useAuth";
import "./Navbar.css";

const navigationLinks = [
  { name: "Home", path: "/", end: true },
  { name: "Explore Issues", path: "/explore" },
  { name: "Civic Map", path: "/map" },
  { name: "Report Issue", path: "/report", icon: Camera },
  { name: "Escalation Center", path: "/escalation" },
  { name: "Admin", path: "/admin" },
  { name: "About", path: "/about" },
];

function NavigationLink({ link, onNavigate, mobile = false }) {
  const Icon = link.icon;

  return (
    <NavLink
      to={link.path}
      end={link.end}
      onClick={onNavigate}
      className={({ isActive }) => [
        mobile ? "civic-mobile-link" : "civic-nav-link",
        link.icon && !mobile ? "civic-nav-report" : "",
        isActive ? "is-active" : "",
      ].filter(Boolean).join(" ")}
    >
      {Icon && <Icon size={15} aria-hidden="true" />}
      {link.name}
    </NavLink>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const closeMenu = () => setMobileOpen(false);
  const handleLogout = () => {
    closeMenu();
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <header className="civic-navbar">
      <div className="civic-navbar-inner">
        <Link to="/" className="civic-navbar-brand" aria-label="CivicLens home" onClick={closeMenu}>
          <CivicLensLogo
            height={34}
            maxWidth={170}
            fallback={
              <>
                <span className="civic-navbar-mark"><Shield size={19} strokeWidth={2.2} /></span>
                <span>Civic<span>Lens</span></span>
              </>
            }
          />
        </Link>

        <nav className="civic-navbar-links" aria-label="Main navigation">
          {navigationLinks.map((link) => (
            <NavigationLink key={link.path} link={link} />
          ))}
        </nav>

        <div className="civic-navbar-account">
          {user ? (
            <>
              <NavLink to="/profile" className={({ isActive }) => `civic-account-link${isActive ? " is-active" : ""}`}>
                <UserRound size={15} /> Profile
              </NavLink>
              <button className="civic-signup-link" type="button" onClick={handleLogout}><LogOut size={14} /> Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `civic-account-link${isActive ? " is-active" : ""}`}>Login</NavLink>
              <NavLink to="/signup" className={({ isActive }) => `civic-signup-link${isActive ? " is-active" : ""}`}>Sign Up</NavLink>
            </>
          )}
        </div>

        <button
          className="civic-menu-toggle"
          type="button"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="civic-mobile-menu"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="civic-mobile-menu" id="civic-mobile-menu" aria-label="Mobile navigation">
          {navigationLinks.map((link) => (
            <NavigationLink key={link.path} link={link} mobile onNavigate={closeMenu} />
          ))}
          <div className="civic-mobile-account">
            {user ? (
              <>
                <NavLink to="/profile" onClick={closeMenu} className="civic-mobile-link"><UserRound size={16} /> Profile</NavLink>
                <button className="civic-mobile-link" type="button" onClick={handleLogout}><LogOut size={16} /> Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={closeMenu} className={({ isActive }) => `civic-mobile-link${isActive ? " is-active" : ""}`}>Login</NavLink>
                <NavLink to="/signup" onClick={closeMenu} className={({ isActive }) => `civic-mobile-signup${isActive ? " is-active" : ""}`}>Sign Up</NavLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}