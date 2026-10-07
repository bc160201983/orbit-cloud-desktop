import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  Plus,
  Folder,
  FileText,
  Image,
  Music2,
  Video,
  House,
  Download,
  HardDrive,
  Star,
  Clock,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Pencil,
  Upload,
  MoreHorizontal,
} from "lucide-react";
import { useOS } from "../core/store";
import * as fs from "../core/filesystem";
import type { AppWindow, VFile } from "../core/types";
const fileIcon = (f: VFile) =>
  f.kind === "folder"
    ? Folder
    : f.mime.startsWith("image")
      ? Image
      : f.mime.startsWith("audio")
        ? Music2
        : f.mime.startsWith("video")
          ? Video
          : FileText;
export default function Files({ win }: { win: AppWindow }) {
  const os = useOS();
  const [folder, setFolder] = useState(win.fileId || fs.ROOT);
  const [history, setHistory] = useState<string[]>([win.fileId || fs.ROOT]);
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState("");
  const [clipboard, setClipboard] = useState<{
    id: string;
    copy: boolean;
  } | null>(null);
  const [dialog, setDialog] = useState<"folder" | "file" | "rename" | null>(
    null,
  );
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [special, setSpecial] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("orbit-favorites") || "[]");
    } catch {
      return [];
    }
  });
  const favorite = () => {
    const next = favorites.includes(selected)
      ? favorites.filter((id) => id !== selected)
      : [...favorites, selected];
    setFavorites(next);
    localStorage.setItem("orbit-favorites", JSON.stringify(next));
  };
  const navigate = (id: string) => {
    setFolder(id);
    setSpecial("");
    setHistory([...history.slice(0, index + 1), id]);
    setIndex(index + 1);
    setSelected("");
  };
  const current = os.files.find((f) => f.id === folder);
  const items = os.files
    .filter((f) =>
      special === "favorites"
        ? favorites.includes(f.id)
        : special === "recent"
          ? f.kind === "file"
          : f.parent === folder,
    )
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      a.kind === b.kind
        ? a.name.localeCompare(b.name)
        : a.kind === "folder"
          ? -1
          : 1,
    );
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const upload = async (list: FileList | null) => {
    if (!list) return;
    for (const f of Array.from(list)) {
      const content = await new Promise<string>((r, j) => {
        const reader = new FileReader();
        reader.onload = () => r(String(reader.result));
        reader.onerror = j;
        f.type.startsWith("text") ||
        /\.(txt|md|json|csv|js|ts|html|css)$/.test(f.name)
          ? reader.readAsText(f)
          : reader.readAsDataURL(f);
      });
      await act(() =>
        fs.create(folder, f.name, "file", content, f.type || "text/plain"),
      );
    }
  };
  return (
    <div className="files-app">
      <aside className="file-sidebar">
        <div className="sidebar-label">YOUR SPACE</div>
        <button
          className={folder === fs.ROOT && !special ? "selected" : ""}
          onClick={() => navigate(fs.ROOT)}
        >
          <House size={17} />
          Home
        </button>
        <button
          onClick={() => {
            setSpecial("recent");
            setSelected("");
          }}
          className={special === "recent" ? "selected" : ""}
        >
          <Clock size={17} />
          Recent
        </button>
        <button
          onClick={() => {
            setSpecial("favorites");
            setSelected("");
          }}
          className={special === "favorites" ? "selected" : ""}
        >
          <Star size={17} />
          Favorites
        </button>
        <div className="sidebar-label second">PLACES</div>
        {["Documents", "Downloads", "Pictures", "Music", "Videos"].map(
          (n, i) => {
            const Icon = [FileText, Download, Image, Music2, Video][i];
            return (
              <button
                key={n}
                className={
                  folder === n.toLowerCase() && !special ? "selected" : ""
                }
                onClick={() => navigate(n.toLowerCase())}
              >
                <Icon size={17} />
                {n}
              </button>
            );
          },
        )}
        <div className="storage">
          <HardDrive size={18} />
          <span>
            Orbit Drive<small>Personal storage</small>
          </span>
          <div className="storage-bar">
            <i />
          </div>
          <small>
            {os.files.filter((f) => f.kind === "file").length} files · stored on
            this device
          </small>
        </div>
      </aside>
      <section className="file-main">
        <div className="file-toolbar">
          <button
            aria-label="Back"
            disabled={index === 0}
            onClick={() => {
              setIndex(index - 1);
              setFolder(history[index - 1]);
              setSpecial("");
            }}
          >
            <ArrowLeft size={17} />
          </button>
          <button
            aria-label="Forward"
            disabled={index === history.length - 1}
            onClick={() => {
              setIndex(index + 1);
              setFolder(history[index + 1]);
              setSpecial("");
            }}
          >
            <ArrowRight size={17} />
          </button>
          <div className="breadcrumb">
            <House size={15} />
            <button onClick={() => navigate(fs.ROOT)}>Home</button>
            {folder !== fs.ROOT && (
              <>
                <ChevronRight size={14} />
                <span>{current?.name}</span>
              </>
            )}
          </div>
          <div className="search-field">
            <Search size={15} />
            <input
              placeholder="Search files"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="file-heading">
          <div>
            <h2>
              {special === "favorites"
                ? "Favorites"
                : special
                  ? "Recent files"
                  : folder === fs.ROOT
                    ? "Home"
                    : current?.name}
            </h2>
            <p>
              {folder === fs.ROOT
                ? "A little space for everything that matters."
                : `${items.length} items in your space`}
            </p>
          </div>
          <button
            className="primary small"
            onClick={() => {
              setDialog("folder");
              setName("");
            }}
          >
            <Plus size={16} />
            New folder
          </button>
        </div>
        <div className="file-actions">
          <button
            onClick={() => {
              setDialog("file");
              setName("");
            }}
          >
            <Plus size={15} />
            New file
          </button>
          <label className="button">
            <Upload size={15} />
            Upload
            <input
              type="file"
              multiple
              hidden
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {selected && (
            <>
              <button aria-label="Toggle favorite" onClick={favorite}>
                <Star
                  size={15}
                  fill={favorites.includes(selected) ? "currentColor" : "none"}
                />
              </button>
              <button
                aria-label="Rename"
                onClick={() => {
                  setName(os.files.find((f) => f.id === selected)?.name || "");
                  setDialog("rename");
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                aria-label="Copy"
                onClick={() => setClipboard({ id: selected, copy: true })}
              >
                <Copy size={15} />
              </button>
              <button
                aria-label="Cut"
                onClick={() => setClipboard({ id: selected, copy: false })}
              >
                <Scissors size={15} />
              </button>
              <button
                aria-label="Delete"
                onClick={() => void act(() => fs.remove(selected))}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
          {clipboard && (
            <button
              onClick={() =>
                void act(async () => {
                  await fs.transfer(clipboard.id, folder, clipboard.copy);
                  setClipboard(null);
                })
              }
            >
              <Clipboard size={15} />
              Paste
            </button>
          )}
          <div className="view-toggle">
            <button
              aria-label="Grid view"
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              aria-label="List view"
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              <List size={17} />
            </button>
            <MoreHorizontal size={18} />
          </div>
        </div>
        {error && <div className="inline-error">{error}</div>}
        <div
          className={`file-content ${view}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("orbit-file");
            if (id) void act(() => fs.transfer(id, folder));
            else void upload(e.dataTransfer.files);
          }}
        >
          {folder === fs.ROOT && !query && !special && (
            <div className="section-label">
              QUICK ACCESS <span>Keep your world organized</span>
            </div>
          )}
          {items.map((f) => {
            const Icon = fileIcon(f);
            return (
              <button
                key={f.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("orbit-file", f.id)}
                onDragOver={(e) => {
                  if (f.kind === "folder") e.preventDefault();
                }}
                onDrop={(e) => {
                  if (f.kind === "folder") {
                    e.preventDefault();
                    e.stopPropagation();
                    void act(() =>
                      fs.transfer(e.dataTransfer.getData("orbit-file"), f.id),
                    );
                  }
                }}
                className={`file-item ${selected === f.id ? "chosen" : ""}`}
                onClick={() => setSelected(f.id)}
                onDoubleClick={() =>
                  f.kind === "folder" ? navigate(f.id) : os.openFile(f)
                }
              >
                <div className={`file-art ${f.kind}`}>
                  {f.mime.startsWith("image") ? (
                    <img src={f.content} alt="" />
                  ) : (
                    <Icon
                      size={f.kind === "folder" ? 58 : 38}
                      strokeWidth={1.3}
                      fill={f.kind === "folder" ? "#e3b668" : "none"}
                    />
                  )}
                </div>
                <span>{f.name}</span>
                <small>
                  {f.kind === "folder"
                    ? `${os.files.filter((x) => x.parent === f.id).length} items`
                    : f.mime.startsWith("image")
                      ? "Image"
                      : `${new Blob([f.content]).size} bytes`}
                </small>
                {view === "list" && (
                  <small>{new Date(f.modified).toLocaleDateString()}</small>
                )}
              </button>
            );
          })}
          {!items.length && (
            <div className="empty-state">
              <Folder size={42} />
              <h3>{query ? "No matching files" : "Room for something new"}</h3>
              <p>Create a file or drop one here.</p>
            </div>
          )}
          {folder === fs.ROOT && !query && !special && (
            <div className="files-welcome">
              <div className="welcome-mark">✧</div>
              <div>
                <h3>Make yourself at home.</h3>
                <p>
                  Your ideas, memories, and next big thing. All in one place.
                </p>
              </div>
              <button onClick={() => os.open("settings")}>
                Personalize <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
        <footer className="file-status">
          <span>
            {items.length} items{selected ? " · 1 selected" : ""}
          </span>
          <span>
            <span className="status-dot" />
            All changes saved locally
          </span>
        </footer>
      </section>
      {dialog && (
        <div className="modal-backdrop">
          <form
            className="dialog"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                if (dialog === "rename") await fs.rename(selected, name);
                else
                  await fs.create(
                    folder,
                    name,
                    dialog === "folder" ? "folder" : "file",
                  );
                setDialog(null);
              });
            }}
          >
            <h3>{dialog === "rename" ? "Rename item" : `New ${dialog}`}</h3>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={dialog === "file" ? "Untitled.txt" : "Folder name"}
            />
            {error && <p className="inline-error">{error}</p>}
            <div>
              <button
                type="button"
                onClick={() => {
                  setDialog(null);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button className="primary" type="submit">
                {dialog === "rename" ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
