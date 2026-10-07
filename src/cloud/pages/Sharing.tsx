import { useState } from "react";
import {
  Copy,
  Link2,
  Users,
  ExternalLink,
  LockKeyhole,
  Trash2,
  Download,
  Check,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { Workspace } from "../useWorkspace";
import { bytes, relative } from "../api";
import FileIcon from "../components/FileIcon";
import { useSession } from "../Session";
import Modal from "../components/Modal";
import type { Share } from "../types";
export default function Sharing({
  workspace: w,
  incoming,
}: {
  workspace: Workspace;
  incoming: boolean;
}) {
  const session = useSession();
  const [revoke, setRevoke] = useState<Share | null>(null);
  const [busy, setBusy] = useState(false);
  const list = incoming ? w.incoming : w.shares;
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/s/${token}`);
      session.setToast("Link copied. A little connection goes a long way.");
    } catch {
      session.setToast(
        "Clipboard unavailable. Open the link and copy its address.",
      );
    }
  };
  const remove = async () => {
    if (!revoke) return;
    setBusy(true);
    try {
      await w.mutate(
        `/shares/${revoke.id}`,
        "DELETE",
        {},
        "Share revoked. The file is private again.",
      );
      setRevoke(null);
    } catch (e) {
      session.setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="sharing-page">
      <div className="page-heading">
        <div>
          <div className="form-eyebrow">GOOD THINGS, BETTER TOGETHER</div>
          <h1>{incoming ? "Shared with you." : "Your connections."}</h1>
          <p>
            {incoming
              ? "A space for the files your people have shared."
              : "Your shared files, their access, and a little peace of mind."}
          </p>
        </div>
        <span className="count-pill">
          <Link2 size={14} />
          {list.length} {incoming ? "shared files" : "share links"}
        </span>
      </div>
      <div className="sharing-explainer">
        <span>
          <ShieldCheck size={20} />
        </span>
        <div>
          <h3>
            {incoming ? "Just for your account." : "Your originals stay yours."}
          </h3>
          <p>
            {incoming
              ? "Only your signed-in account can access member invitations."
              : "Links give read-only download access. Revoke one anytime to close the connection."}
          </p>
        </div>
        <LockKeyhole size={20} />
      </div>
      {list.length ? (
        <div className="share-cards">
          {list.map((s) => {
            const expired =
              (!!s.expires && s.expires < Date.now()) ||
              (!!s.max_downloads && s.downloads >= s.max_downloads);
            return (
              <article key={s.id}>
                <div className="share-card-top">
                  <FileIcon
                    file={{ name: s.name, mime: s.mime, kind: "file" }}
                  />
                  <div>
                    <h3>{s.name}</h3>
                    <p>
                      {bytes(s.size)} ·{" "}
                      {incoming
                        ? `From ${s.ownerName}`
                        : s.recipient || "Anyone with the link"}
                    </p>
                  </div>
                  {s.protected && <LockKeyhole size={15} />}
                </div>
                <div className="share-card-details">
                  <span>
                    <span
                      className={`cloud-status-dot ${expired ? "expired" : ""}`}
                    />
                    {expired
                      ? "Expired / limit reached"
                      : s.recipient
                        ? "Member access"
                        : "Public link"}
                  </span>
                  <span>
                    <Download size={13} />
                    {s.downloads}
                    {s.max_downloads ? ` / ${s.max_downloads}` : ""}
                  </span>
                  <span>
                    <Clock size={13} />
                    {s.expires
                      ? new Date(s.expires).toLocaleDateString()
                      : "No expiry"}
                  </span>
                </div>
                <footer>
                  <a href={`/s/${s.token}`} target="_blank" rel="noreferrer">
                    {incoming ? "Open shared file" : "Open link"}
                    <ExternalLink size={13} />
                  </a>
                  <button
                    aria-label={`Copy link for ${s.name}`}
                    onClick={() => void copy(s.token)}
                  >
                    <Copy size={15} />
                  </button>
                  {!incoming && (
                    <button
                      aria-label={`Revoke ${s.name}`}
                      onClick={() => setRevoke(s)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="cloud-empty">
          <span className="empty-illustration">
            {incoming ? <Users size={39} /> : <Link2 size={39} />}
          </span>
          <h3>
            {incoming
              ? "Good things are on their way."
              : "Your first connection starts with a file."}
          </h3>
          <p>
            {incoming
              ? "Files shared with your email will appear here."
              : "Choose Share from a file’s actions to create a link or invite a member."}
          </p>
        </div>
      )}
      {revoke && (
        <Modal
          title="Close this connection?"
          subtitle={`Anyone using the link to ${revoke.name} will lose access immediately. Your file stays safe.`}
          onClose={() => setRevoke(null)}
        >
          <div className="modal-actions">
            <button className="cloud-secondary" onClick={() => setRevoke(null)}>
              Keep sharing
            </button>
            <button
              className="cloud-danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              Revoke access
              <Trash2 size={15} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
