import { useState, useEffect } from "react";
import {
  Cloud,
  Download,
  ShieldCheck,
  LockKeyhole,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import { api, json, bytes } from "../api";
import FileIcon from "../components/FileIcon";
import { useSession } from "../Session";
interface SharedFile {
  name: string;
  size: number;
  mime: string;
  protected: boolean;
  expires: number | null;
  workspaceName: string;
}
export default function PublicShare({ token }: { token: string }) {
  const session = useSession();
  const [file, setFile] = useState<SharedFile | null>(null);
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<SharedFile>(`/public/${token}`)
      .then(setFile)
      .catch((e) => setError(e.message));
  }, [token, session.status?.user?.id]);
  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/public/${token}/access`, json("POST", { password }));
      setUnlocked(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="public-share-page">
      <header>
        <a href="/" className="cloud-brand">
          <span className="cloud-brand-icon">
            <Cloud size={22} />
          </span>
          {file?.workspaceName || "Orbit"}
          <span className="brand-suffix">cloud</span>
        </a>
        <a href="/" className="public-workspace-link">
          Your workspace
          <ArrowUpRight size={15} />
        </a>
      </header>
      <main>
        <div className="pill-label">A LITTLE SOMETHING, SHARED WITH YOU</div>
        {file ? (
          <div className="public-file-card">
            <FileIcon file={{ ...file, kind: "file" }} size={44} />
            <span className="form-eyebrow">READY FOR YOUR NEXT BIG THING</span>
            <h1>{file.name}</h1>
            <p>
              {bytes(file.size)} · {file.mime || "File"}
            </p>
            {file.protected && !unlocked ? (
              <form className="cloud-form" onSubmit={(e) => void unlock(e)}>
                <label>
                  <LockKeyhole size={16} />
                  This file is password protected
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter the share password"
                  />
                </label>
                <button disabled={busy} className="cloud-primary full">
                  {busy ? "Unlocking…" : "Unlock file"}
                  <LockKeyhole size={16} />
                </button>
              </form>
            ) : (
              <a
                className="cloud-primary public-download"
                href={`/api/public/${token}/download`}
                download
              >
                <Download size={18} />
                Download file
              </a>
            )}
            {error && <div className="cloud-error">{error}</div>}
            <div className="public-file-footer">
              <ShieldCheck size={15} />
              {file.expires
                ? `Available until ${new Date(file.expires).toLocaleDateString()}`
                : "Shared securely through Orbit"}
            </div>
          </div>
        ) : (
          <div className="public-file-card">
            <AlertCircle size={45} />
            <h1>
              {error ? "This connection has closed." : "Finding your file…"}
            </h1>
            <p>{error || "Just a moment."}</p>
            {error && (
              <a className="cloud-primary public-download" href="/">
                Sign in or return to Orbit
                <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        )}
        <p className="public-tagline">Small files. Big possibilities.</p>
      </main>
      <footer>YOUR FILES. YOUR PEOPLE. YOUR ORBIT.</footer>
    </div>
  );
}
