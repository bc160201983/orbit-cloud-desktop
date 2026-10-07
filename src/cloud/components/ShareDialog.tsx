import { useState } from "react";
import {
  Link2,
  Users,
  Copy,
  Check,
  ArrowRight,
  LockKeyhole,
  Globe,
} from "lucide-react";
import Modal from "./Modal";
import { api, json } from "../api";
import type { CloudFile, Share } from "../types";
import { useSession } from "../Session";
export default function ShareDialog({
  file,
  onClose,
  onSaved,
}: {
  file: CloudFile;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const session = useSession();
  const [mode, setMode] = useState<"link" | "member">("link");
  const [recipient, setRecipient] = useState("");
  const [password, setPassword] = useState("");
  const [days, setDays] = useState("7");
  const [max, setMax] = useState("");
  const [share, setShare] = useState<Share | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const link = share ? `${location.origin}/s/${share.token}` : "";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await api<{ share: Share }>(
        "/shares",
        json("POST", {
          fileId: file.id,
          recipient: mode === "member" ? recipient : null,
          password: password || null,
          expires: days ? Date.now() + Number(days) * 86400000 : null,
          maxDownloads: max ? Number(max) : null,
        }),
      );
      setShare(result.share);
      await onSaved();
      session.setToast("A new connection. Share link created.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Share ${file.name}`}
      subtitle="Good things are better when shared."
      onClose={onClose}
    >
      {share ? (
        <div className="share-success">
          <span className="share-success-icon">
            <Check size={27} />
          </span>
          <h3>
            {mode === "member" ? "Invitation ready." : "Your link is ready."}
          </h3>
          <p>
            {mode === "member"
              ? `${recipient} can now find this file in Shared with me.`
              : "Anyone with this link can download your file until it expires."}
          </p>
          <div className="share-link-field">
            <input readOnly aria-label="Share URL" value={link} />
            <button
              className="cloud-primary"
              onClick={() =>
                void navigator.clipboard
                  .writeText(link)
                  .then(() => setCopied(true))
                  .catch(() =>
                    setError(
                      "Copy is unavailable. Select the URL and copy it manually.",
                    ),
                  )
              }
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
            </button>
          </div>
          {error && <div className="cloud-error">{error}</div>}
          <div className="share-security-note">
            <LockKeyhole size={15} />
            {password ? "Password protected" : "Read-only download"} ·{" "}
            {days ? `Expires in ${days} days` : "No expiration"}
          </div>
          <button className="cloud-primary full" onClick={onClose}>
            All done
            <Check size={16} />
          </button>
        </div>
      ) : (
        <form className="cloud-form" onSubmit={(e) => void submit(e)}>
          <div className="segmented">
            <button
              type="button"
              className={mode === "link" ? "active" : ""}
              onClick={() => setMode("link")}
            >
              <Link2 size={16} />
              Share a link
            </button>
            <button
              type="button"
              className={mode === "member" ? "active" : ""}
              onClick={() => setMode("member")}
            >
              <Users size={16} />
              Invite a member
            </button>
          </div>
          <div className="share-info">
            <Globe size={19} />
            <div>
              <strong>
                {mode === "link"
                  ? "Anyone with the link"
                  : "Only the invited account"}
              </strong>
              <p>
                Recipients can download. Your original stays private and
                unchanged.
              </p>
            </div>
          </div>
          {mode === "member" && (
            <label>
              Recipient email
              <input
                type="email"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="teammate@example.com"
              />
            </label>
          )}
          <div className="form-columns">
            <label>
              Link expiration
              <select value={days} onChange={(e) => setDays(e.target.value)}>
                <option value="1">After 1 day</option>
                <option value="7">After 7 days</option>
                <option value="30">After 30 days</option>
                <option value="">Never</option>
              </select>
            </label>
            <label>
              Download limit
              <input
                type="number"
                min="1"
                max="1000000"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="Unlimited"
              />
            </label>
          </div>
          <label>
            Password protection <span>OPTIONAL</span>
            <input
              type="password"
              minLength={6}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Add a password for extra peace of mind"
            />
          </label>
          {error && (
            <div className="cloud-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" disabled={busy} className="cloud-primary full">
            {busy
              ? "Creating…"
              : mode === "link"
                ? "Create share link"
                : "Share with member"}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </Modal>
  );
}
