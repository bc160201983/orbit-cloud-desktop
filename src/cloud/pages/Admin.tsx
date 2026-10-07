import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Users,
  HardDrive,
  Link2,
  Settings2,
  Activity,
  Search,
  Save,
  PenLine,
  Trash2,
  SlidersHorizontal,
  ArrowUpRight,
  Check,
  Folder,
  Eye,
  LockKeyhole,
} from "lucide-react";
import { api, json, bytes, relative } from "../api";
import { useSession } from "../Session";
import type {
  User,
  WorkspaceSettings,
  Activity as Audit,
  CloudFile,
} from "../types";
import FileIcon from "../components/FileIcon";
import Modal from "../components/Modal";
import type { AdminData } from "../adminTypes";
import AdminOverview from "../components/AdminOverview";
import AdminSettings from "../components/AdminSettings";
import { AuditList } from "../components/AuditList";
export default function Admin() {
  const session = useSession();
  const [data, setData] = useState<AdminData | null>(null);
  const [draft, setDraft] = useState<WorkspaceSettings | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [role, setRole] = useState("user");
  const [status, setStatus] = useState("active");
  const [quota, setQuota] = useState("2048");
  const [resetPassword, setResetPassword] = useState("");
  const [deleting, setDeleting] = useState<CloudFile | null>(null);
  const refresh = async () => {
    try {
      const result = await api<AdminData>("/admin/overview");
      setData(result);
      setDraft(result.settings);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/admin/settings", json("PATCH", draft));
      await refresh();
      await session.refresh();
      session.setToast("Workspace settings updated. Changes are live.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        `/admin/users/${editing!.id}`,
        json("PATCH", {
          role,
          status,
          quota: Number(quota) * 1048576,
          ...(resetPassword ? { password: resetPassword } : {}),
        }),
      );
      setEditing(null);
      await refresh();
      session.setToast("Account permissions updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const deleteFile = async () => {
    setBusy(true);
    try {
      await api(`/admin/files/${deleting!.id}`, json("DELETE", {}));
      setDeleting(null);
      await refresh();
      session.setToast("File and sharing access permanently removed.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (id: string) => {
    try {
      await api(`/admin/shares/${id}`, json("DELETE", {}));
      await refresh();
      session.setToast("Share link revoked.");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const update = <K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K],
  ) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  return (
    <div className="admin-page">
      <div className="page-heading">
        <div>
          <div className="form-eyebrow">
            A CLEAR VIEW. A LITTLE MORE CONTROL.
          </div>
          <h1>
            Workspace control.
            <span className="admin-title-badge">
              <ShieldCheck size={12} />
              ADMIN
            </span>
          </h1>
          <p>
            Your people, their files, and the settings that bring it all
            together.
          </p>
        </div>
        <span className="admin-access-pill">
          <ShieldCheck size={15} />
          Administrator access
        </span>
      </div>
      <nav className="admin-tabs">
        {[
          "Overview",
          "Members",
          "Files",
          "Sharing",
          "Settings",
          "Audit log",
        ].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => {
              setTab(t);
              setQuery("");
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      {error && (
        <div className="cloud-error" role="alert">
          {error}
        </div>
      )}
      {!data ? (
        <div className="cloud-empty">
          <div className="cloud-spinner" />
          <h3>Getting a clearer picture…</h3>
        </div>
      ) : (
        <>
          {tab === "Overview" && <AdminOverview data={data} setTab={setTab} />}
          {tab === "Members" && (
            <>
              <div className="admin-toolbar">
                <div>
                  <h3>Your people.</h3>
                  <p>Manage access and give everyone room to grow.</p>
                </div>
                <div className="admin-search">
                  <Search size={16} />
                  <input
                    aria-label="Search members"
                    placeholder="Search members"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="admin-table">
                <div className="admin-table-heading">
                  <span>Member</span>
                  <span>Role</span>
                  <span>Storage</span>
                  <span>Status</span>
                  <span />
                </div>
                {data.users
                  .filter((u) =>
                    (u.email + u.name)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((u) => (
                    <div className="admin-table-row" key={u.id}>
                      <div className="member-cell">
                        <span className="member-avatar">{u.name[0]}</span>
                        <div>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </div>
                      </div>
                      <span className="role-badge">
                        {u.role === "admin" ? (
                          <ShieldCheck size={12} />
                        ) : (
                          <Users size={12} />
                        )}{" "}
                        {u.role}
                      </span>
                      <span className="member-storage">
                        <strong>{bytes(u.used)}</strong>
                        <small>of {bytes(u.quota)}</small>
                      </span>
                      <span
                        className={`status-badge ${u.status === "active" ? "active" : ""}`}
                      >
                        {u.status}
                      </span>
                      <button
                        aria-label={`Manage ${u.name}`}
                        className="cloud-icon-button"
                        onClick={() => {
                          setEditing(u);
                          setResetPassword("");
                          setRole(u.role);
                          setStatus(u.status);
                          setQuota(String(u.quota / 1048576));
                          setError("");
                        }}
                      >
                        <PenLine size={16} />
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}
          {tab === "Settings" && draft && (
            <AdminSettings
              draft={draft}
              busy={busy}
              saveSettings={saveSettings}
              update={update}
            />
          )}
          {tab === "Files" && (
            <>
              <div className="admin-toolbar">
                <div>
                  <h3>Across every space.</h3>
                  <p>
                    Metadata for the latest 200 files and folders. File contents
                    remain private.
                  </p>
                </div>
                <div className="admin-search">
                  <Search size={16} />
                  <input
                    aria-label="Search all files"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search files or owners"
                  />
                </div>
              </div>
              <div className="admin-table">
                <div className="admin-table-heading">
                  <span>File</span>
                  <span>Owner</span>
                  <span>Size</span>
                  <span>Status</span>
                  <span />
                </div>
                {data.files
                  .filter((f) =>
                    (f.name + f.ownerName + f.ownerEmail)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((f) => (
                    <div className="admin-table-row" key={f.id}>
                      <div className="member-cell">
                        <FileIcon file={f} />
                        <div>
                          <strong>{f.name}</strong>
                          <small>{f.kind}</small>
                        </div>
                      </div>
                      <span className="admin-owner">{f.ownerName}</span>
                      <span>{bytes(f.size)}</span>
                      <span
                        className={`status-badge ${!f.trashed ? "active" : ""}`}
                      >
                        {f.trashed ? "In trash" : "Stored"}
                      </span>
                      <button
                        className="cloud-icon-button danger"
                        aria-label={`Delete ${f.name}`}
                        onClick={() => setDeleting(f)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}
          {tab === "Sharing" && (
            <>
              <div className="admin-toolbar">
                <div>
                  <h3>Keep connections in check.</h3>
                  <p>Review and revoke sharing access across your workspace.</p>
                </div>
              </div>
              <div className="admin-share-list">
                {data.shares.length ? (
                  data.shares.map((s) => (
                    <div key={s.id}>
                      <span className="stat-icon stat-blue">
                        <Link2 size={18} />
                      </span>
                      <div>
                        <strong>{s.name}</strong>
                        <small>
                          {s.ownerName} → {s.recipient || "Public link"}
                        </small>
                      </div>
                      <span>{s.downloads} downloads</span>
                      <span>
                        {s.expires
                          ? new Date(s.expires).toLocaleDateString()
                          : "No expiry"}
                      </span>
                      <button
                        className="cloud-secondary"
                        onClick={() => void revoke(s.id)}
                      >
                        <Trash2 size={14} />
                        Revoke
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="cloud-empty">
                    <Link2 size={34} />
                    <h3>No active connections yet.</h3>
                  </div>
                )}
              </div>
            </>
          )}
          {tab === "Audit log" && (
            <section className="settings-section">
              <h3>
                <Activity size={18} />
                The workspace timeline
              </h3>
              <p>Latest 100 events, recorded by the server.</p>
              <AuditList items={data.activity} />
            </section>
          )}
        </>
      )}
      {editing && (
        <Modal
          title={`Manage ${editing.name}`}
          subtitle="A little control, with your people in mind."
          onClose={() => setEditing(null)}
        >
          <form className="cloud-form" onSubmit={(e) => void updateUser(e)}>
            <label>
              Account role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="user">Workspace member</option>
                <option value="admin">Administrator</option>
              </select>
            </label>
            <label>
              Account status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <small>
                Suspension immediately revokes sessions and sharing access.
              </small>
            </label>
            {editing.id !== session.status!.user!.id && (
              <label>
                Reset password <span>OPTIONAL</span>
                <input
                  type="password"
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Leave empty to keep the current password"
                />
                <small>
                  A new password signs the member out of all devices. Share it
                  through a secure channel.
                </small>
              </label>
            )}
            <label>
              Storage quota (MB)
              <input
                type="number"
                min="1"
                max="1048576"
                required
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
              />
            </label>
            {error && <div className="cloud-error">{error}</div>}
            <button className="cloud-primary full" disabled={busy}>
              Save account settings
              <Check size={16} />
            </button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Permanently remove this file?"
          subtitle={`${deleting.name} and any files inside it will be removed from ${deleting.ownerName}’s storage. All associated sharing access will close.`}
          onClose={() => setDeleting(null)}
        >
          {error && <div className="cloud-error">{error}</div>}
          <div className="modal-actions">
            <button
              className="cloud-secondary"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="cloud-danger"
              disabled={busy}
              onClick={() => void deleteFile()}
            >
              Delete permanently
              <Trash2 size={15} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
