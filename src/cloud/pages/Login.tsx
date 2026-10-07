import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Cloud,
  ShieldCheck,
  Layers,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
import { useSession } from "../Session";
import { api, json } from "../api";
import type { User } from "../types";
export default function Login() {
  const session = useSession();
  const status = session.status!;
  const [mode, setMode] = useState<"login" | "register" | "admin">("login");
  const setup = !status.initialized;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: User }>(
        `/auth/${setup ? "setup" : mode === "register" ? "register" : "login"}`,
        json("POST", { name, email, password, token }),
      );
      if (mode === "admin" && result.user.role !== "admin") {
        await session.logout();
        throw Error(
          "This account does not have administrator access. Use member sign in.",
        );
      }
      session.setUser(result.user);
      session.setToast(
        setup
          ? "Your workspace is ready. Welcome to Orbit."
          : "Welcome back. Everything is right where you left it.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cloud-login">
      <section className="login-story">
        <a className="cloud-brand" href="/">
          <span className="cloud-brand-icon">
            <Cloud size={22} />
          </span>
          {status.workspaceName}
          <span className="brand-suffix">cloud</span>
        </a>
        <div className="login-story-content">
          <div className="pill-label">
            <span />A NEW SPACE FOR YOUR DIGITAL LIFE
          </div>
          <h1>
            A home for your files.
            <br />
            <span>A little more connected.</span>
          </h1>
          <p>
            {status.tagline}
            <br />
            One beautiful workspace for everything you share.
          </p>
          <div className="login-illustration">
            <div className="illustration-orbit orbit-one" />
            <div className="illustration-orbit orbit-two" />
            <div className="floating-file file-one">
              <Layers size={27} />
              <span>Everything in sync</span>
              <i />
            </div>
            <div className="floating-file file-two">
              <ShieldCheck size={25} />
              <span>Private by design</span>
            </div>
            <div className="cloud-sculpture">
              <Cloud size={85} strokeWidth={1.1} />
            </div>
            <div className="floating-file file-three">
              <ArrowUpRight size={20} />
              <span>Share something great</span>
            </div>
          </div>
          <div className="login-trust">
            <ShieldCheck size={17} />
            <span>Private storage</span>
            <i />
            <LockKeyhole size={15} />
            <span>Secure sharing</span>
            <i />
            <Layers size={16} />
            <span>Your own space</span>
          </div>
        </div>
        <footer>
          YOUR FILES, WITHOUT THE FRICTION.<span>Orbit Cloud / 02</span>
        </footer>
      </section>
      <section className="login-form-side">
        <div className="login-top-label">
          YOUR PERSONAL FILE UNIVERSE <ArrowUpRight size={15} />
        </div>
        <div className="login-form-wrap">
          <span className="form-eyebrow">
            {setup
              ? "LET’S MAKE IT YOURS"
              : mode === "admin"
                ? "WORKSPACE CONTROL"
                : "GOOD TO HAVE YOU HERE"}
          </span>
          <h2>
            {setup
              ? "Create your workspace."
              : mode === "register"
                ? "Make yourself at home."
                : mode === "admin"
                  ? "Administrator sign in."
                  : "Welcome back."}
          </h2>
          <p>
            {setup
              ? "Set up the first administrator to get started."
              : mode === "register"
                ? "A new space for your files, ideas, and people."
                : "Sign in to pick up right where you left off."}
          </p>
          {!setup && (
            <div className="login-tabs">
              <button
                className={mode !== "admin" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Member access
              </button>
              <button
                className={mode === "admin" ? "active" : ""}
                onClick={() => {
                  setMode("admin");
                  setError("");
                }}
              >
                <ShieldCheck size={14} />
                Admin access
              </button>
            </div>
          )}
          <form onSubmit={(e) => void submit(e)}>
            {(setup || mode === "register") && (
              <label>
                Full name
                <input
                  required
                  autoComplete="name"
                  placeholder="Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  required
                  minLength={setup || mode === "register" ? 10 : 1}
                  maxLength={128}
                  type={visible ? "text" : "password"}
                  autoComplete={
                    setup || mode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                  placeholder={
                    setup || mode === "register"
                      ? "At least 10 characters"
                      : "Enter your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {setup && (
              <label>
                Workspace setup token
                <input
                  required
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Token from your server administrator"
                />
                <small>
                  Use ORBIT_SETUP_TOKEN, or the private .orbit/setup-token file
                  on your server.
                </small>
              </label>
            )}
            {error && (
              <div className="cloud-error" role="alert">
                {error}
              </div>
            )}
            <button
              className="cloud-primary login-submit"
              disabled={busy}
              type="submit"
            >
              {busy
                ? "Connecting…"
                : setup
                  ? "Create workspace"
                  : mode === "register"
                    ? "Create account"
                    : "Enter your workspace"}
              <ArrowRight size={17} />
            </button>
          </form>
          {!setup && mode !== "admin" && status.registrationEnabled && (
            <p className="login-switch">
              {mode === "register"
                ? "Already have a space?"
                : "New around here?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "register" ? "login" : "register");
                  setError("");
                }}
              >
                {mode === "register" ? "Sign in" : "Create an account"}
                <ArrowUpRight size={12} />
              </button>
            </p>
          )}
          {status.maintenanceMode && (
            <div className="cloud-warning">
              The workspace is in maintenance mode. Administrators can still
              sign in.
            </div>
          )}
          <div className="login-security">
            <LockKeyhole size={13} />
            Encrypted password storage · Private session access
          </div>
        </div>
        <footer>
          YOUR SPACE. YOUR PEOPLE. YOUR ORBIT.
          <span>
            © {new Date().getFullYear()} {status.workspaceName}
          </span>
        </footer>
      </section>
    </div>
  );
}
