import { useOS } from "../../core/store";
import { useState } from "react";
import {
  UserRound,
  ShieldCheck,
  LockKeyhole,
  Sun,
  Moon,
  Save,
  HardDrive,
  LogOut,
  Check,
} from "lucide-react";
import { useSession } from "../Session";
import { api, json, bytes } from "../api";
import type { User } from "../types";
export default function Account() {
  const os = useOS();
  const s = useSession();
  const user = s.status!.user!;
  const [name, setName] = useState(user.name);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const profile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("profile");
    try {
      const r = await api<{ user: User }>(
        "/auth/profile",
        json("PATCH", { name }),
      );
      s.setUser(r.user);
      s.setToast("A little more you. Profile updated.");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("password");
    try {
      await api(
        "/auth/password",
        json("POST", { currentPassword: current, password }),
      );
      setCurrent("");
      setPassword("");
      setError("");
      s.setToast("Password updated. Other sessions are signed out.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="account-page">
      <div className="page-heading">
        <div>
          <div className="form-eyebrow">A SPACE THAT FEELS LIKE YOU</div>
          <h1>Your account.</h1>
          <p>A little personalization. A little peace of mind.</p>
        </div>
      </div>
      {error && (
        <div className="cloud-error" role="alert">
          {error}
        </div>
      )}
      <div className="account-grid">
        <section className="settings-section">
          <h3>
            <UserRound size={18} />
            Personal details
          </h3>
          <form className="cloud-form" onSubmit={(e) => void profile(e)}>
            <label>
              Display name
              <input
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Email address
              <input readOnly value={user.email} />
              <small>
                Your account identifier is managed by the workspace.
              </small>
            </label>
            <button className="cloud-primary" disabled={busy === "profile"}>
              <Save size={15} />
              Save profile
            </button>
          </form>
        </section>
        <section className="settings-section">
          <h3>
            <Sun size={18} />
            Your environment
          </h3>
          <p>Make this space a little more yours.</p>
          <div className="account-theme-options">
            <button
              className={s.theme === "light" ? "active" : ""}
              onClick={() =>
                os.setPreferences((p) => ({ ...p, theme: "light" }))
              }
            >
              <Sun size={25} />
              <span>Light & airy</span>
              {s.theme === "light" && <Check size={15} />}
            </button>
            <button
              className={s.theme === "dark" ? "active" : ""}
              onClick={() =>
                os.setPreferences((p) => ({ ...p, theme: "dark" }))
              }
            >
              <Moon size={25} />
              <span>After hours</span>
              {s.theme === "dark" && <Check size={15} />}
            </button>
          </div>
          <div className="account-detail">
            <ShieldCheck size={17} />
            <span>Access level</span>
            <strong>
              {user.role === "admin" ? "Administrator" : "Workspace member"}
            </strong>
          </div>
          <div className="account-detail">
            <HardDrive size={17} />
            <span>Your storage</span>
            <strong>
              {bytes(user.used)} / {bytes(user.quota)}
            </strong>
          </div>
        </section>
        <section className="settings-section">
          <h3>
            <LockKeyhole size={18} />
            Password & security
          </h3>
          <form className="cloud-form" onSubmit={(e) => void change(e)}>
            <label>
              Current password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </label>
            <label>
              New password
              <input
                required
                minLength={10}
                maxLength={128}
                type="password"
                autoComplete="new-password"
                placeholder="At least 10 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <small>
                Changing your password signs out other active sessions.
              </small>
            </label>
            <button className="cloud-primary" disabled={busy === "password"}>
              <LockKeyhole size={15} />
              Update password
            </button>
          </form>
        </section>
        <section className="settings-section session-section">
          <h3>
            <ShieldCheck size={18} />
            Your session
          </h3>
          <span className="session-illustration">
            <ShieldCheck size={43} />
          </span>
          <h2>A little peace of mind.</h2>
          <p>
            Your session uses a private, HTTP-only cookie. Your files belong to
            your account and stay on the server.
          </p>
          <button
            className="cloud-secondary"
            onClick={() => void s.logout().catch((e) => s.setToast(e.message))}
          >
            <LogOut size={16} />
            Sign out of this device
          </button>
        </section>
      </div>
    </div>
  );
}
