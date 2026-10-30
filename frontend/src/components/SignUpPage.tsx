import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Truck,
  Loader2,
  CheckCircle2,
  Info,
  Radio,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

// Reuses the Login Page building blocks (add `export` to FleetVisual and Field in LoginPage.tsx)
import { Field, FleetVisual } from "./LoginPage";

import "./LoginPage.css";

/* ---------------------------- Types ---------------------------- */

export interface SignUpData {
  fullName: string;
  email: string;
  password: string;
}

export interface SignUpPageProps {
  /** FRONTEND DEMO: if omitted, a timer simulates the request. No account is created. */
  onSignUp?: (data: SignUpData) => Promise<void> | void;
  /** Optional handler for "Sign in". If omitted, the link goes to "/". */
  onSignIn?: () => void;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

type Status = "idle" | "loading" | "success" | "error";

/* ------------------------- Validation -------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

const validateName = (v: string): string | undefined => {
  const value = v.trim();
  if (!value) return "Full name is required.";
  if (value.length < 2) return "Name must be at least 2 characters.";
  return undefined;
};

const validateEmail = (v: string): string | undefined => {
  const value = v.trim();
  if (!value) return "Email address is required.";
  if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address.";
  return undefined;
};

const validatePassword = (v: string): string | undefined => {
  if (!v) return "Password is required.";
  if (v.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
};

const validateConfirm = (password: string, confirm: string): string | undefined => {
  if (!confirm) return "Please confirm your password.";
  if (confirm !== password) return "Passwords do not match.";
  return undefined;
};

/* ------------------- Small reusable eye toggle ------------------ */

interface ToggleProps {
  visible: boolean;
  disabled: boolean;
  label: string;
  onToggle: () => void;
}

function VisibilityToggle({ visible, disabled, label, onToggle }: ToggleProps) {
  return (
    <button
      type="button"
      className="fd-field__toggle"
      onClick={onToggle}
      aria-label={`${visible ? "Hide" : "Show"} ${label}`}
      aria-pressed={visible}
      disabled={disabled}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function SignUpPage({ onSignUp, onSignIn }: SignUpPageProps) {

  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const submitting = useRef(false);

  const isLoading = status === "loading";

  const clearError = (key: keyof FormErrors) =>
    setErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current) return;

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    setFullName(cleanName);
    setEmail(cleanEmail);

    const nextErrors: FormErrors = {
      fullName: validateName(cleanName),
      email: validateEmail(cleanEmail),
      password: validatePassword(password),
      confirmPassword: validateConfirm(password, confirmPassword),
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setStatus("idle");
      return;
    }

    submitting.current = true;
    setStatus("loading");

    try {
      if (onSignUp) {
        await onSignUp({ fullName: cleanName, email: cleanEmail, password });
      } else {
        // FRONTEND DEMO ONLY: simulated delay, no network request.
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      setStatus("success");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  };

  const handleSignIn = (e: MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();

  if (onSignIn) {
    onSignIn();
  } else {
    navigate("/login");
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
            Start Managing <span>Your Fleet Smarter.</span>
          </h1>
          <p className="fd-brand__text">
            Create your account to explore real-time fleet monitoring, vehicle
            tracking, and intelligent fleet management.
          </p>
        </div>

        <FleetVisual />

        <div className="fd-status">
          <span className="fd-status__dot" aria-hidden="true" />
          <Radio size={14} aria-hidden="true" />
          <span>Smart Fleet Management</span>
        </div>
      </aside>

      {/* Right: form */}
      <main className="fd-panel">
        <div className="fd-card fd-card--signup">
          <div className="fd-logo fd-logo--compact">
            <span className="fd-logo__mark">
              <Truck size={20} strokeWidth={2.2} />
            </span>
            <span className="fd-logo__name">FleetDash</span>
          </div>

          <header className="fd-card__header">
            <h2>Create Your Account</h2>
            <p>Join FleetDash and take control of your fleet.</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <Field
              label="Full name"
              name="fullName"
              type="text"
              value={fullName}
              placeholder="Enter your full name"
              autoComplete="name"
              disabled={isLoading}
              error={errors.fullName}
              icon={<User size={18} />}
              onChange={(e) => {
                setFullName(e.target.value);
                clearError("fullName");
              }}
              onBlur={() =>
                setErrors((p) => ({ ...p, fullName: validateName(fullName) }))
              }
            />

            <Field
              label="Email address"
              name="email"
              type="email"
              value={email}
              placeholder="Enter your email address"
              autoComplete="email"
              disabled={isLoading}
              error={errors.email}
              icon={<Mail size={18} />}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
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
              placeholder="Create a password"
              autoComplete="new-password"
              disabled={isLoading}
              error={errors.password}
              icon={<Lock size={18} />}
              trailing={
                <VisibilityToggle
                  visible={showPassword}
                  disabled={isLoading}
                  label="password"
                  onToggle={() => setShowPassword((v) => !v)}
                />
              }
              onChange={(e) => {
                setPassword(e.target.value);
                clearError("password");
                if (errors.confirmPassword && confirmPassword) {
                  clearError("confirmPassword");
                }
              }}
              onBlur={() =>
                setErrors((p) => ({ ...p, password: validatePassword(password) }))
              }
            />

            <p className="fd-hint">
              Use at least {MIN_PASSWORD_LENGTH} characters.
            </p>

            <Field
              label="Confirm password"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={isLoading}
              error={errors.confirmPassword}
              icon={<Lock size={18} />}
              trailing={
                <VisibilityToggle
                  visible={showConfirm}
                  disabled={isLoading}
                  label="confirm password"
                  onToggle={() => setShowConfirm((v) => !v)}
                />
              }
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearError("confirmPassword");
              }}
              onBlur={() =>
                setErrors((p) => ({
                  ...p,
                  confirmPassword: validateConfirm(password, confirmPassword),
                }))
              }
            />

            <button
              type="submit"
              className="fd-submit fd-submit--signup"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="fd-spin" size={18} aria-hidden="true" />
                  <span>Creating account…</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>

            <div className="fd-live" aria-live="polite">
              {status === "success" && (
                <div className="fd-note fd-note--success">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>
                    Demo signup complete. This is a frontend preview; no real
                    account was created.
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

          <p className="fd-card__footer fd-card__footer--signup">
            Already have an account?{" "}
            <a className="fd-link" href="/" onClick={handleSignIn}>
              Sign in
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}