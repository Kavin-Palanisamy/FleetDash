import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,

} from "react";

import { useNavigate } from "react-router-dom";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Truck,
  Loader2,
  CheckCircle2,
  Info,
  Radio,
  Navigation,
  MapPin,
} from "lucide-react";
import "./LoginPage.css";

/* ---------------------------- Types ---------------------------- */

export interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
}

export interface LoginPageProps {
  /** FRONTEND DEMO: if omitted, a timer simulates the request. No real auth. */
  onLogin?: (credentials: LoginCredentials) => Promise<void> | void;
  /** Optional handler for "Sign up". If omitted, the link goes to /signup. */
  onSignUp?: () => void;
}

interface FormErrors {
  email?: string;
  password?: string;
}

type Status = "idle" | "loading" | "success" | "error";

/* ------------------------- Validation -------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Email address is required.";
  if (!EMAIL_PATTERN.test(value.trim())) return "Enter a valid email address.";
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return "Password is required.";
  return undefined;
}

/* ----------------------- Fleet visual (SVG) --------------------- */

function FleetVisual() {
  return (
    <div className="fd-visual" aria-hidden="true">
      <svg
        className="fd-visual__map"
        viewBox="0 0 600 420"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fd-route" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <filter id="fd-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g stroke="rgba(96,165,250,0.10)" strokeWidth="1">
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 60} y1="0" x2={i * 60} y2="420" />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 60} x2="600" y2={i * 60} />
          ))}
        </g>

        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            className="fd-route fd-route--a"
            d="M40 340 C 140 320, 160 220, 260 210 S 420 230, 470 130 S 540 70, 570 60"
            stroke="url(#fd-route)"
            strokeWidth="3"
            filter="url(#fd-glow)"
          />
          <path
            className="fd-route fd-route--b"
            d="M60 90 C 130 120, 200 100, 250 160 S 360 300, 440 310 S 520 340, 570 360"
            stroke="rgba(34,211,238,0.55)"
            strokeWidth="2"
          />
          <path
            d="M120 400 C 180 340, 300 360, 340 280"
            stroke="rgba(96,165,250,0.30)"
            strokeWidth="2"
            strokeDasharray="4 8"
          />
        </g>

        {[
          [40, 340],
          [260, 210],
          [470, 130],
          [570, 60],
          [60, 90],
          [440, 310],
          [570, 360],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle className="fd-ping" r="6" fill="#22d3ee" />
            <circle r="4.5" fill="#0b1220" stroke="#22d3ee" strokeWidth="2" />
          </g>
        ))}
      </svg>

      <div className="fd-chip fd-chip--one">
        <span className="fd-chip__icon">
          <Truck size={16} />
        </span>
        <div>
          <strong>Truck 204</strong>
          <small>In transit · 62 km/h</small>
        </div>
      </div>

      <div className="fd-chip fd-chip--two">
        <span className="fd-chip__icon fd-chip__icon--cyan">
          <Navigation size={16} />
        </span>
        <div>
          <strong>Route optimized</strong>
          <small>ETA 14 min earlier</small>
        </div>
      </div>

      <div className="fd-chip fd-chip--three">
        <span className="fd-chip__icon fd-chip__icon--green">
          <MapPin size={16} />
        </span>
        <div>
          <strong>Depot arrival</strong>
          <small>Van 018 · Just now</small>
        </div>
      </div>
    </div>
  );
}

/* ------------------------ Reusable field ------------------------ */

interface FieldProps {
  label: string;
  name: string;
  type: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
  icon: ReactNode;
  trailing?: ReactNode;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}

function Field({
  label,
  name,
  type,
  value,
  placeholder,
  autoComplete,
  error,
  disabled,
  icon,
  trailing,
  onChange,
  onBlur,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="fd-field">
      <label className="fd-field__label" htmlFor={id}>
        {label}
      </label>
      <div
        className={`fd-field__control${error ? " is-invalid" : ""}${
          disabled ? " is-disabled" : ""
        }`}
      >
        <span className="fd-field__icon" aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {trailing}
      </div>
      <p id={errorId} className="fd-field__error" role="alert">
        {error ?? ""}
      </p>
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function LoginPage({ onLogin, onSignUp }: LoginPageProps) {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [showForgot, setShowForgot] = useState(false);
  const submitting = useRef(false);

  const isLoading = status === "loading";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current) return;

    const nextErrors: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    setShowForgot(false);

    if (nextErrors.email || nextErrors.password) {
      setStatus("idle");
      return;
    }

    submitting.current = true;
    setStatus("loading");

    try {
      if (onLogin) {
        await onLogin({ email: email.trim(), password, remember });
      } else {
        // FRONTEND DEMO ONLY: simulated delay, no network request.
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      setStatus("success");
      navigate("/dashboard");
    } catch {
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  };

  const handleForgot = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowForgot((v) => !v);
  };

  const handleSignUp = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onSignUp) {
      e.preventDefault();
      onSignUp();
    }
  };

  return (
    <div className="fd-login">
      <div className="fd-login__glow fd-login__glow--one" aria-hidden="true" />
      <div className="fd-login__glow fd-login__glow--two" aria-hidden="true" />

      {/* Left: branding */}
      <aside className="fd-brand">
        <div className="fd-logo">
          <span className="fd-logo__mark">
            <Truck size={22} strokeWidth={2.2} />
          </span>
          <span className="fd-logo__name">FleetDash</span>
        </div>

        <div className="fd-brand__copy">
          <h1 className="fd-brand__title">
            Your Fleet. <span>One Powerful Dashboard.</span>
          </h1>
          <p className="fd-brand__text">
            Monitor vehicles, track movements, and stay ahead with real-time
            fleet intelligence.
          </p>
        </div>

        <FleetVisual />

        <div className="fd-status">
          <span className="fd-status__dot" aria-hidden="true" />
          <Radio size={14} aria-hidden="true" />
          <span>Fleet Monitoring, Simplified.</span>
        </div>
      </aside>

      {/* Right: form */}
      <main className="fd-panel">
        <div className="fd-card">
          <div className="fd-logo fd-logo--compact">
            <span className="fd-logo__mark">
              <Truck size={20} strokeWidth={2.2} />
            </span>
            <span className="fd-logo__name">FleetDash</span>
          </div>

          <header className="fd-card__header">
            <h2>Welcome Back</h2>
            <p>Sign in to access your FleetDash dashboard.</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <Field
              label="Email address"
              name="email"
              type="email"
              value={email}
              placeholder="you@company.com"
              autoComplete="email"
              disabled={isLoading}
              error={errors.email}
              icon={<Mail size={18} />}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              onBlur={() =>
                setErrors((p) => ({ ...p, email: validateEmail(email) }))
              }
            />

            <Field
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isLoading}
              error={errors.password}
              icon={<Lock size={18} />}
              trailing={
                <button
                  type="button"
                  className="fd-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((p) => ({ ...p, password: undefined }));
                }
              }}
              onBlur={() =>
                setErrors((p) => ({ ...p, password: validatePassword(password) }))
              }
            />

            <div className="fd-row">
              <label className="fd-check">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={isLoading}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="fd-check__box" aria-hidden="true" />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="fd-link"
                onClick={handleForgot}
                aria-expanded={showForgot}
                aria-controls="fd-forgot-note"
              >
                Forgot password?
              </button>
            </div>

            {showForgot && (
              <div id="fd-forgot-note" className="fd-note fd-note--info">
                <Info size={16} aria-hidden="true" />
                <span>
                  Demo placeholder: a password reset flow would start here. No
                  email is sent in this frontend demo.
                </span>
              </div>
            )}

            <button
              type="submit"
              className="fd-submit"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="fd-spin" size={18} aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            <div className="fd-live" aria-live="polite">
              {status === "success" && (
                <div className="fd-note fd-note--success">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>
                    Demo sign-in successful. This is a frontend preview; no real
                    authentication took place.
                  </span>
                </div>
              )}
              {status === "error" && (
                <div className="fd-note fd-note--error">
                  <Info size={16} aria-hidden="true" />
                  <span>Something went wrong. Please try again.</span>
                </div>
              )}
            </div>
          </form>

          <div className="fd-divider" role="separator" aria-label="or">
            <span>OR</span>
          </div>

          <p className="fd-card__footer">
            Don&apos;t have an account?{" "}
            <a className="fd-link" href="/signup" onClick={handleSignUp}>
              Sign up
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}