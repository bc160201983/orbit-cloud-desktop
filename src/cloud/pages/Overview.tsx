import { useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  CloudUpload,
  Folder,
  Link2,
  HardDrive,
  Users,
  Plus,
  FileText,
  Image,
  Film,
  Music2,
  ShieldCheck,
  Clock,
  ChevronRight,
  Upload,
} from "lucide-react";
import { useSession } from "../Session";
import { bytes, relative } from "../api";
import type { CloudFile, View } from "../types";
import type { Workspace } from "../useWorkspace";
import FileIcon, { category } from "../components/FileIcon";
export default function Overview({
  workspace: w,
  setView,
  setFolder,
  onPreview,
}: {
  workspace: Workspace;
  setView: (v: View) => void;
  setFolder: (id: string | null) => void;
  onPreview: (f: CloudFile) => void;
}) {
  const session = useSession();
  const user = session.status!.user!;
  const input = useRef<HTMLInputElement>(null);
  const files = w.files.filter((f) => !f.trashed && f.kind === "file");
  const recent = [...files].sort((a, b) => b.modified - a.modified).slice(0, 5);
  const folders = w.files
    .filter((f) => !f.trashed && f.kind === "folder" && !f.parent)
    .slice(0, 4);
  const hour = new Date().getHours();
  const stats = [
    {
      title: "Your files",
      value: files.length.toString(),
      note: "A space for everything",
      icon: Folder,
      color: "blue",
    },
    {
      title: "Storage used",
      value: bytes(user.used),
      note: `of ${bytes(user.quota)} available`,
      icon: HardDrive,
      color: "purple",
    },
    {
      title: "Active share links",
      value: w.shares
        .filter(
          (s) =>
            (!s.expires || s.expires > Date.now()) &&
            (!s.max_downloads || s.downloads < s.max_downloads),
        )
        .length.toString(),
      note: "Good things, connected",
      icon: Link2,
      color: "mint",
    },
    {
      title: "Shared with you",
      value: w.incoming.length.toString(),
      note: "From your workspace people",
      icon: Users,
      color: "peach",
    },
  ];
  return (
    <div className="overview-page">
      <div className="page-heading">
        <div>
          <div className="form-eyebrow">
            YOUR SPACE, A LITTLE MORE CONNECTED
          </div>
          <h1>
            {hour < 12
              ? "Good morning"
              : hour < 18
                ? "Good afternoon"
                : "Good evening"}
            , {user.name.split(" ")[0]}
            <span className="greeting-spark">✧</span>
          </h1>
          <p>{session.status!.tagline}</p>
        </div>
        <span className="today-label">
          <Clock size={14} />
          {new Date().toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <div className="overview-banner">
        <div>
          <span className="pill-label">LESS FRICTION. MORE POSSIBILITY.</span>
          <h2>
            Your files have
            <br />a new place to call home.
          </h2>
          <p>Upload, organize, and share. Make room for what’s next.</p>
          <button
            className="banner-button"
            onClick={() => input.current?.click()}
          >
            <Upload size={15} />
            Upload something great
            <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="banner-art">
          <div className="banner-art-circle circle-one" />
          <div className="banner-art-circle circle-two" />
          <div className="art-file art-image">
            <Image size={29} />
            <span>Memories, kept close.</span>
          </div>
          <div className="art-file art-folder">
            <Folder size={56} strokeWidth={1.2} fill="#b9ccfc" />
            <span>Your next big thing</span>
          </div>
          <div className="art-file art-link">
            <Link2 size={20} />
            <span>A little more connected</span>
            <span className="art-check">✓</span>
          </div>
          <span className="banner-spark spark-one">✦</span>
          <span className="banner-spark spark-two">✧</span>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        onChange={(e) => {
          if (e.target.files) void w.upload(e.target.files, null);
          e.target.value = "";
        }}
      />
      <div className="overview-stats">
        {stats.map((s) => (
          <div className="overview-stat" key={s.title}>
            <div className={`stat-icon stat-${s.color}`}>
              <s.icon size={19} />
            </div>
            <span>{s.title}</span>
            <strong>{s.value}</strong>
            <small>{s.note}</small>
          </div>
        ))}
      </div>
      <div className="overview-columns">
        <div className="overview-main">
          <div className="section-heading">
            <h3>
              Your everyday spaces<span>{folders.length}</span>
            </h3>
            <button
              onClick={() => {
                setFolder(null);
                setView("files");
              }}
            >
              View all
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="folder-cards">
            {folders.map((f, i) => (
              <button
                key={f.id}
                onClick={() => {
                  setFolder(f.id);
                  setView("files");
                }}
              >
                <span className={`folder-card-art folder-color-${i}`}>
                  <Folder size={32} strokeWidth={1.2} fill="currentColor" />
                </span>
                <MoreDots />
                <strong>{f.name}</strong>
                <small>
                  {
                    w.files.filter((x) => !x.trashed && x.parent === f.id)
                      .length
                  }{" "}
                  items
                </small>
              </button>
            ))}
          </div>
          <div className="section-heading recent-heading">
            <h3>Fresh in your space</h3>
            <button onClick={() => setView("recent")}>
              View all
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="recent-files">
            {recent.length ? (
              recent.map((f) => (
                <button key={f.id} onClick={() => onPreview(f)}>
                  <FileIcon file={f} />
                  <div>
                    <strong>{f.name}</strong>
                    <small>
                      {category(f).toUpperCase()} · {bytes(f.size)}
                    </small>
                  </div>
                  <span>{relative(f.modified)}</span>
                  <ArrowUpRight size={15} />
                </button>
              ))
            ) : (
              <div className="recent-empty">
                <CloudUpload size={26} />
                <div>
                  <strong>Your next great idea belongs here.</strong>
                  <p>Upload a file to see your recent work.</p>
                </div>
                <button onClick={() => input.current?.click()}>
                  <Plus size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
        <aside className="overview-side">
          <div className="storage-card">
            <div className="section-heading">
              <h3>A little room to grow.</h3>
              <HardDrive size={16} />
            </div>
            <div
              className="storage-ring"
              style={
                {
                  "--usage": `${Math.min(100, (user.used / user.quota) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong>
                  {Math.round((user.used / user.quota) * 100)}
                  <span>%</span>
                </strong>
                <small>of your space used</small>
              </div>
            </div>
            <div className="storage-card-amount">
              <strong>{bytes(user.used)}</strong>
              <span>/ {bytes(user.quota)}</span>
            </div>
            <div className="storage-types">
              {[
                { label: "Documents", type: "document", color: "blue" },
                { label: "Images & media", type: "media", color: "purple" },
                { label: "Other files", type: "other", color: "mint" },
              ].map((t) => (
                <div key={t.type}>
                  <i className={`legend-${t.color}`} />
                  <span>{t.label}</span>
                  <strong>
                    {bytes(
                      files
                        .filter((f) =>
                          t.type === "media"
                            ? ["image", "audio", "video"].includes(category(f))
                            : t.type === "other"
                              ? ![
                                  "document",
                                  "image",
                                  "audio",
                                  "video",
                                ].includes(category(f))
                              : category(f) === "document",
                        )
                        .reduce((n, f) => n + f.size, 0),
                    )}
                  </strong>
                </div>
              ))}
            </div>
            <button onClick={() => setView("settings")}>
              Manage your space
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="share-tip">
            <span className="share-tip-icon">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3>Keep it close. Share it safely.</h3>
              <p>
                Give your links an expiration date or password. A little peace
                of mind goes a long way.
              </p>
            </div>
            <button onClick={() => setView("links")}>
              Explore sharing
              <ArrowUpRight size={13} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
function MoreDots() {
  return <span className="folder-dots">···</span>;
}
