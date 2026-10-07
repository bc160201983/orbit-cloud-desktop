import { Save, Settings2, ShieldCheck, HardDrive, Folder } from "lucide-react";
import type { FormEvent } from "react";
import type { WorkspaceSettings } from "../types";
interface Props {
  draft: WorkspaceSettings;
  busy: boolean;
  saveSettings: (e: FormEvent) => Promise<void>;
  update: <K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K],
  ) => void;
}
export default function AdminSettings({
  draft,
  busy,
  saveSettings,
  update,
}: Props) {
  return (
    <form
      className="admin-settings-form"
      onSubmit={(e) => void saveSettings(e)}
    >
      <div className="admin-toolbar">
        <div>
          <h3>A workspace that works for you.</h3>
          <p>These settings are enforced by the server for every account.</p>
        </div>
        <button className="cloud-primary" disabled={busy}>
          <Save size={15} />
          Save settings
        </button>
      </div>
      <div className="account-grid">
        <section className="settings-section">
          <h3>
            <Settings2 size={18} />
            Workspace identity
          </h3>
          <div className="cloud-form">
            <label>
              Workspace name
              <input
                required
                maxLength={180}
                value={draft.workspaceName}
                onChange={(e) => update("workspaceName", e.target.value)}
              />
            </label>
            <label>
              Welcome tagline
              <textarea
                maxLength={140}
                rows={3}
                value={draft.tagline}
                onChange={(e) => update("tagline", e.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="settings-section">
          <h3>
            <ShieldCheck size={18} />
            Access & sharing
          </h3>
          <Toggle
            label="Open registration"
            detail="Allow new members to create accounts."
            value={draft.registrationEnabled}
            onChange={(v) => update("registrationEnabled", v)}
          />
          <Toggle
            label="Public share links"
            detail="Let members share files with anyone holding a link."
            value={draft.publicSharing}
            onChange={(v) => update("publicSharing", v)}
          />
          <Toggle
            label="Maintenance mode"
            detail="Pause member access. Administrators stay signed in."
            value={draft.maintenanceMode}
            onChange={(v) => update("maintenanceMode", v)}
          />
        </section>
        <section className="settings-section">
          <h3>
            <HardDrive size={18} />
            Storage policies
          </h3>
          <div className="cloud-form">
            <label>
              Default quota for new accounts (MB)
              <input
                type="number"
                min="1"
                max="1048576"
                required
                value={draft.defaultQuotaMB}
                onChange={(e) =>
                  update("defaultQuotaMB", Number(e.target.value))
                }
              />
              <small>Existing quotas are managed in Members.</small>
            </label>
            <label>
              Maximum file upload (MB)
              <input
                type="number"
                min="1"
                max="1024"
                required
                value={draft.maxUploadMB}
                onChange={(e) => update("maxUploadMB", Number(e.target.value))}
              />
            </label>
          </div>
        </section>
        <section className="settings-section">
          <h3>
            <Folder size={18} />
            File policies
          </h3>
          <div className="cloud-form">
            <label>
              Trash retention (days)
              <input
                type="number"
                min="1"
                max="365"
                required
                value={draft.trashRetentionDays}
                onChange={(e) =>
                  update("trashRetentionDays", Number(e.target.value))
                }
              />
              <small>
                Older trashed files are permanently purged by the server.
              </small>
            </label>
            <label>
              Allowed file extensions
              <input
                value={draft.allowedExtensions}
                onChange={(e) => update("allowedExtensions", e.target.value)}
                placeholder="pdf, jpg, png, docx, txt"
              />
              <small>Leave empty to accept all file extensions.</small>
            </label>
          </div>
        </section>
      </div>
    </form>
  );
}
function Toggle({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="settings-toggle-row">
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`cloud-toggle ${value ? "on" : ""}`}
        onClick={() => onChange(!value)}
      >
        <i />
      </button>
    </div>
  );
}
