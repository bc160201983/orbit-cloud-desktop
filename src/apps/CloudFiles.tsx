import { useState } from "react";
import {
  LayoutDashboard,
  Folder,
  Star,
  Clock,
  Trash2,
  Activity,
  Search,
  FilePlus,
  Cloud,
  HardDrive,
} from "lucide-react";
import { useCloudWorkspace } from "../cloud/DesktopHost";
import { useOS } from "../core/store";
import { virtualFiles } from "../core/filesystem";
import { bytes } from "../cloud/api";
import type { AppWindow } from "../core/types";
import type { CloudFile, View } from "../cloud/types";
import FileWorkspace from "../cloud/pages/FileWorkspace";
import Overview from "../cloud/pages/Overview";
import ShareDialog from "../cloud/components/ShareDialog";
import Preview from "../cloud/components/Preview";
import { AuditList } from "../cloud/components/AuditList";
const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "files", label: "My files", icon: Folder },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "recent", label: "Recent files", icon: Clock },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "trash", label: "Trash", icon: Trash2 },
] as const;
export default function CloudFiles({ win }: { win: AppWindow }) {
  const w = useCloudWorkspace(),
    os = useOS();
  const [view, setView] = useState<View>("files");
  const [folder, setFolder] = useState<string | null>(win.fileId || null);
  const [query, setQuery] = useState("");
  const [share, setShare] = useState<CloudFile | null>(null),
    [preview, setPreview] = useState<CloudFile | null>(null);
  const openFile = (f: CloudFile) => {
    if (f.kind === "folder") {
      setFolder(f.id);
      setView("files");
      return;
    }
    if (
      (f.mime.startsWith("image/") && !f.mime.includes("svg")) ||
      f.mime.startsWith("audio/") ||
      f.mime.startsWith("video/") ||
      f.mime.startsWith("text/") ||
      /\.(txt|md|json|csv|js|ts|tsx|css|html|py|mjs)$/i.test(f.name)
    )
      os.openFile(virtualFiles([f])[1]);
    else setPreview(f);
  };
  return (
    <div className="cloud-app desktop-cloud-app hosted-files">
      <aside className="hosted-sidebar">
        <div className="hosted-brand">
          <Cloud size={22} />
          <span>
            Cloud drive<small>Your files, everywhere.</small>
          </span>
        </div>
        <nav aria-label="File locations">
          {sections.map((n) => (
            <button
              key={n.id}
              aria-label={n.label}
              className={view === n.id ? "active" : ""}
              onClick={() => {
                setView(n.id);
                setQuery("");
                if (n.id === "files") setFolder(null);
              }}
            >
              <n.icon size={17} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <button className="hosted-new" onClick={() => os.open("editor")}>
          <FilePlus size={17} />
          New document
        </button>
        <div className="hosted-storage">
          <HardDrive size={17} />
          <strong>Private storage</strong>
          <div className="cloud-storage-bar">
            <i
              style={{
                width: `${Math.min(100, (os.user.used / os.user.quota) * 100)}%`,
              }}
            />
          </div>
          <small>
            {bytes(os.user.used)} of {bytes(os.user.quota)}
          </small>
        </div>
      </aside>
      <main className="hosted-main">
        <header className="hosted-toolbar">
          <span>
            <Cloud size={14} />
            Securely hosted
          </span>
          <label>
            <Search size={16} />
            <input
              aria-label="Search hosted files"
              placeholder="Search your files…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setView("files");
              }}
            />
          </label>
        </header>
        <div className="hosted-content">
          {w.error && (
            <div className="cloud-error">
              {w.error}
              <button onClick={() => void w.refresh()}>Retry</button>
            </div>
          )}
          {w.loading ? (
            <div className="cloud-empty">Connecting to your drive…</div>
          ) : view === "overview" ? (
            <Overview
              workspace={w}
              setView={setView}
              setFolder={setFolder}
              onPreview={openFile}
            />
          ) : view === "activity" ? (
            <>
              <div className="page-heading">
                <h1>Your activity</h1>
                <p>Uploads, edits, and sharing in your workspace.</p>
              </div>
              <AuditList items={w.activity} />
            </>
          ) : (
            <FileWorkspace
              workspace={w}
              view={view}
              folder={folder}
              setFolder={setFolder}
              setView={setView}
              onShare={setShare}
              onPreview={openFile}
              query={query}
            />
          )}
        </div>
      </main>
      {share && (
        <ShareDialog
          file={share}
          onClose={() => setShare(null)}
          onSaved={w.refresh}
        />
      )}
      {preview && (
        <Preview
          file={preview}
          onClose={() => setPreview(null)}
          onShare={() => {
            setShare(preview);
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}
