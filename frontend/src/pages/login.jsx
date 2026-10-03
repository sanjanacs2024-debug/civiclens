import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { INITIAL_ISSUES } from "../data/mockData";
import { apiService } from "../services/api";
import CivicLensLogo from "../components/CivicLensLogo";
import { useAuth } from "../contexts/useAuth";
import "./auth.css";

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const isCreatingAccount = location.pathname === "/signup";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [formNotice, setFormNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notice = formNotice || location.state?.notice || "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (isCreatingAccount && formData.get("password") !== formData.get("confirmPassword")) {
      setFormNotice("Those passwords do not match. Please check both fields.");
      return;
    }

    setFormNotice("");
    setIsSubmitting(true);
    try {
      if (isCreatingAccount) {
        const result = await apiService.register({
          name: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          password: formData.get("password"),
        });
        if (!result.success) {
          setFormNotice(result.error || "Unable to create your account. Please try again.");
          return;
        }
        navigate("/login", { replace: true, state: { notice: "Account created. Sign in to continue." } });
        return;
      }

      const result = await apiService.login({ email: formData.get("email"), password: formData.get("password") });
      if (!result.success) {
        setFormNotice(result.error || "Unable to sign in. Please try again.");
        return;
      }
      signIn(result.data, formData.get("rememberMe") === "on");
      const returnTo = location.state?.from?.pathname || "/profile";
      navigate(returnTo, { replace: true });
    } catch {
      setFormNotice("Unable to connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeView = (path) => {
    setFormNotice("");
    setPasswordVisible(false);
    setConfirmPasswordVisible(false);
    navigate(path);
  };

  const showPasswordNotice = () => {
    setFormNotice("Password recovery is not available in this prototype. No email has been sent.");
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label="About CivicLens">
        <img
          className="auth-brand-image"
          src={INITIAL_ISSUES[0].image}
          alt="A reported road issue in a Bengaluru neighborhood"
        />
        <div className="auth-brand-top">
          <Link to="/" className="auth-brand-lockup" aria-label="CivicLens home">
            <CivicLensLogo
              height={37}
              maxWidth={160}
              fallback={
                <>
                  <span className="auth-brand-icon"><ShieldCheck size={21} /></span>
                  <span>Civic<span>Lens</span></span>
                </>
              }
            />
          </Link>
          <span className="auth-brand-location"><MapPin size={13} /> Bengaluru civic pilot</span>
        </div>

        <div className="auth-brand-copy">
          <span className="auth-kicker"><i /> Citizen-powered civic visibility</span>
          <h1>Make Civic Issues <em>Impossible to Ignore.</em></h1>
          <p>CivicLens turns street-level observations into visible reports people can follow, from the first photo to the latest response.</p>
          <div className="auth-brand-actions" aria-hidden="true">
            <span><Camera size={15} /> Capture what you see</span>
            <ArrowRight size={16} />
            <span><ShieldCheck size={15} /> Keep action in view</span>
          </div>
        </div>

        <div className="auth-photo-caption">
          <span className="auth-caption-icon"><MapPin size={16} /></span>
          <span><strong>Local issues. Shared visibility.</strong><small>Citizen observations help shape the picture.</small></span>
          <ArrowUpRight size={17} />
        </div>
        <span className="auth-brand-index">CIVICLENS / 01</span>
      </section>

      <section className="auth-content-panel" aria-label={isCreatingAccount ? "Create a CivicLens account" : "Sign in to CivicLens"}>
        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="auth-card-mark"><ShieldCheck size={19} /></span>
            <p className="auth-overline">A clearer view of civic action</p>
            <h2>Welcome to CivicLens</h2>
            <p className="auth-subtitle">Sign in to report, track, and follow civic issues.</p>
          </div>

          <div className="auth-tabs" aria-label="Authentication options">
            <Link to="/login" onClick={() => setFormNotice("")} className={!isCreatingAccount ? "auth-tab active" : "auth-tab"} aria-current={!isCreatingAccount ? "page" : undefined}>
              Sign In
            </Link>
            <Link to="/signup" onClick={() => setFormNotice("")} className={isCreatingAccount ? "auth-tab active" : "auth-tab"} aria-current={isCreatingAccount ? "page" : undefined}>
              Create Account
            </Link>
          </div>

          <form className="auth-form" key={location.pathname} onSubmit={handleSubmit}>
            {isCreatingAccount && (
              <>
                <div className="auth-field">
                  <label htmlFor="fullName">Full Name</label>
                  <div className="auth-input-wrap">
                    <UserRound size={17} aria-hidden="true" />
                    <input id="fullName" name="fullName" type="text" autoComplete="name" placeholder="Your full name" required />
                  </div>
                </div>
                <div className="auth-field">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="auth-input-wrap">
                    <Phone size={17} aria-hidden="true" />
                    <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" required />
                  </div>
                </div>
              </>
            )}

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <div className="auth-input-wrap">
                <Mail size={17} aria-hidden="true" />
                <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input id="password" name="password" type={passwordVisible ? "text" : "password"} autoComplete={isCreatingAccount ? "new-password" : "current-password"} minLength={8} placeholder="At least 8 characters" required />
                <button className="auth-password-toggle" type="button" onClick={() => setPasswordVisible(!passwordVisible)} aria-label={passwordVisible ? "Hide password" : "Show password"}>
                  {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {isCreatingAccount ? (
              <div className="auth-field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="auth-input-wrap">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input id="confirmPassword" name="confirmPassword" type={confirmPasswordVisible ? "text" : "password"} autoComplete="new-password" minLength={8} placeholder="Enter your password again" required />
                  <button className="auth-password-toggle" type="button" onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)} aria-label={confirmPasswordVisible ? "Hide confirmation password" : "Show confirmation password"}>
                    {confirmPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-options">
                <label className="auth-remember"><input type="checkbox" name="rememberMe" /> <span>Remember me</span></label>
                <button className="auth-text-button" type="button" onClick={showPasswordNotice}>Forgot Password?</button>
              </div>
            )}

            {notice && <p className="auth-notice" role="status" aria-live="polite">{notice}</p>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : isCreatingAccount ? "Create Account" : "Sign In"}<ArrowRight size={17} />
            </button>
          </form>

          <p className="auth-switch-copy">
            {isCreatingAccount ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" onClick={() => changeView(isCreatingAccount ? "/login" : "/signup")}>
              {isCreatingAccount ? "Sign In" : "Create Account"}
            </button>
          </p>
          <p className="auth-prototype-note">Passwords are not stored in your browser.</p>
        </div>
        <p className="auth-content-footer">CivicLens <span>·</span> Citizen observation to visible civic action</p>
      </section>
    </main>
  );
}