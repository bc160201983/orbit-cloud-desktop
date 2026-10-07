import { useState, useRef } from "react";
import {
  Search,
  Plus,
  Copy,
  Upload,
  LayoutGrid,
  List,
  MoreHorizontal,
  Star,
  Share2,
  Download,
  Trash2,
  Folder,
  ArrowUpRight,
  ChevronRight,
  House,
  RotateCcw,
  Move,
  PenLine,
  Check,
  FolderPlus,
  FileText,
  Image,
  Film,
  Music2,
  ArrowDownWideNarrow,
  CloudUpload,
  HardDrive,
  Link2,
} from "lucide-react";
import { useSession } from "../Session";
import { bytes, relative } from "../api";
import type { CloudFile, View } from "../types";
import type { Workspace } from "../useWorkspace";
import FileIcon, { category } from "../components/FileIcon";
import Modal from "../components/Modal";
export default function FileWorkspace({
  workspace: w,
  view,
  folder,
  setFolder,
  setView,
  onShare,
  onPreview,
  query,
}: {
  workspace: Workspace;
  view: View;
  folder: string | null;
  setFolder: (id: string | null) => void;
  setView: (v: View) => void;
  onShare: (f: CloudFile) => void;
  onPreview: (f: CloudFile) => void;
  query: string;
}) {
  const session = useSession();
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("modified");
  const [menu, setMenu] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    type: "folder" | "rename" | "move" | "delete" | "empty";
    file?: CloudFile;
  } | null>(null);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const active = w.files.filter((f) => !f.trashed);
  const current = w.files.find((f) => f.id === folder);
  const path: CloudFile[] = [];
  let cursor = current;
  while (cursor) {
    path.unshift(cursor);
    cursor = w.files.find((f) => f.id === cursor?.parent);
  }
  const items = w.files
    .filter((f) =>
      view === "trash"
        ? f.trashed &&
          (!f.parent || !w.files.find((p) => p.id === f.parent)?.trashed)
        : view === "favorites"
          ? !f.trashed && f.starred
          : view === "recent"
            ? !f.trashed && f.kind === "file"
            : !f.trashed && (query ? true : f.parent === folder),
    )
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .filter((f) => filter === "all" || category(f) === filter)
    .sort((a, b) =>
      a.kind !== b.kind
        ? a.kind === "folder"
          ? -1
          : 1
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "size"
            ? b.size - a.size
            : b.modified - a.modified,
    );
  const navigate = (f: CloudFile) => {
    if (f.kind === "folder") {
      setFolder(f.id);
      setView("files");
    } else onPreview(f);
  };
  const action = async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
    } catch (e) {
      session.setToast((e as Error).message);
    }
    setMenu(null);
  };
  const openDialog = (
    type: NonNullable<typeof dialog>["type"],
    file?: CloudFile,
  ) => {
    setDialog({ type, file });
    setName(file?.name || "");
    setDestination(file?.parent || "");
    setError("");
    setMenu(null);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog.type === "folder")
        await w.mutate(
          "/files/folder",
          "POST",
          { name, parent: folder },
          "A new space for your files. Folder created.",
        );
      if (dialog.type === "rename")
        await w.mutate(
          `/files/${dialog.file!.id}`,
          "PATCH",
          { name },
          "File renamed.",
        );
      if (dialog.type === "move")
        await w.mutate(
          `/files/${dialog.file!.id}`,
          "PATCH",
          { parent: destination || null },
          "File moved.",
        );
      if (dialog.type === "delete")
        await w.mutate(
          `/files/${dialog.file!.id}`,
          "DELETE",
          {},
          "Permanently deleted.",
        );
      if (dialog.type === "empty") {
        for (const f of items)
          await w.mutate(`/files/${f.id}`, "DELETE", {}, "");
        session.setToast("Trash is empty. A little fresh space.");
      }
      setDialog(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const title = query
    ? "Search results"
    : view === "favorites"
      ? "Your favorites"
      : view === "recent"
        ? "Recent files"
        : view === "trash"
          ? "A little breathing room."
          : folder
            ? current?.name
            : "My files";
  return (
    <div
      className="file-workspace"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length)
          void w.upload(e.dataTransfer.files, folder);
      }}
    >
      <div className="page-heading">
        <div>
          <div className="form-eyebrow">
            {view === "trash"
              ? "ROOM FOR SOMETHING NEW"
              : view === "favorites"
                ? "THE THINGS THAT MATTER"
                : "YOUR PERSONAL FILE UNIVERSE"}
          </div>
          <h1>{title}</h1>
          <p>
            {view === "trash"
              ? "Restore a file or let it go for good. Trashed files still count toward your quota."
              : query
                ? `Looking for “${query}” across your workspace.`
                : "Everything you need. Exactly where you left it."}
          </p>
        </div>
        <div className="page-heading-actions">
          {view === "trash" ? (
            <button
              disabled={!items.length}
              className="cloud-secondary"
              onClick={() => openDialog("empty")}
            >
              <Trash2 size={16} />
              Empty trash
            </button>
          ) : (
            <>
              <button
                className="cloud-secondary"
                onClick={() => openDialog("folder")}
              >
                <Plus size={16} />
                New folder
              </button>
              <button
                className="cloud-primary"
                disabled={!!w.uploads}
                onClick={() => uploadInput.current?.click()}
              >
                <Upload size={16} />
                Upload files
              </button>
            </>
          )}
        </div>
      </div>
      <input
        ref={uploadInput}
        hidden
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files) void w.upload(e.target.files, folder);
          e.target.value = "";
        }}
      />
      {view === "files" && folder && !query && (
        <div className="cloud-breadcrumb">
          <button onClick={() => setFolder(null)}>
            <House size={14} />
            My files
          </button>
          {path.map((f) => (
            <span key={f.id}>
              <ChevronRight size={13} />
              <button onClick={() => setFolder(f.id)}>{f.name}</button>
            </span>
          ))}
        </div>
      )}
      <div className="file-filter-bar">
        <div className="file-filter-tabs">
          {[
            { id: "all", name: "All files" },
            { id: "document", name: "Documents" },
            { id: "image", name: "Images" },
            { id: "video", name: "Videos" },
            { id: "folder", name: "Folders" },
          ].map((t) => (
            <button
              key={t.id}
              className={filter === t.id ? "active" : ""}
              onClick={() => setFilter(t.id)}
            >
              {t.name}
              {t.id === "all" && <span>{items.length}</span>}
            </button>
          ))}
        </div>
        <div className="file-view-controls">
          <select
            aria-label="Sort files"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="modified">Last modified</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
          <span />
          <button
            className={layout === "grid" ? "active" : ""}
            aria-label="Grid view"
            onClick={() => setLayout("grid")}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            className={layout === "list" ? "active" : ""}
            aria-label="List view"
            onClick={() => setLayout("list")}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      {w.loading ? (
        <div className="cloud-empty">
          <div className="cloud-spinner" />
          <h3>Finding your files…</h3>
        </div>
      ) : items.length ? (
        <div
          className={layout === "grid" ? "cloud-file-grid" : "cloud-file-table"}
        >
          {layout === "list" && (
            <div className="file-table-heading">
              <span>Name</span>
              <span>Last modified</span>
              <span>File size</span>
              <span>Sharing</span>
              <span />
            </div>
          )}
          {items.map((f) => (
            <div
              className={`cloud-file-row ${layout === "grid" ? "file-grid-card" : ""}`}
              key={f.id}
              draggable={!f.trashed}
              onDragStart={(e) =>
                e.dataTransfer.setData("orbit-cloud-file", f.id)
              }
              onDragOver={(e) => {
                if (f.kind === "folder") e.preventDefault();
              }}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("orbit-cloud-file");
                if (f.kind === "folder" && id) {
                  e.preventDefault();
                  e.stopPropagation();
                  void action(() =>
                    w.mutate(
                      `/files/${id}`,
                      "PATCH",
                      { parent: f.id },
                      "File moved.",
                    ),
                  );
                } else if (f.kind === "folder" && e.dataTransfer.files.length) {
                  e.preventDefault();
                  e.stopPropagation();
                  void w.upload(e.dataTransfer.files, f.id);
                }
              }}
            >
              <button
                className="file-name-cell"
                aria-label={f.name}
                onClick={() => {
                  if (!f.trashed) navigate(f);
                }}
              >
                <FileIcon file={f} size={layout === "grid" ? 35 : 21} />
                <div>
                  <strong>{f.name}</strong>
                  <small>
                    {f.kind === "folder"
                      ? `${active.filter((x) => x.parent === f.id).length} items`
                      : category(f).toUpperCase()}
                  </small>
                </div>
                {f.starred && (
                  <Star size={12} fill="currentColor" className="star-marker" />
                )}
              </button>
              <span className="file-modified">{relative(f.modified)}</span>
              <span className="file-size">
                {f.kind === "folder" ? "—" : bytes(f.size)}
              </span>
              <span className="file-sharing">
                {w.shares.some((s) => s.file_id === f.id) ? (
                  <span className="shared-badge">
                    <Link2 size={11} />
                    Shared
                  </span>
                ) : (
                  <span className="private-badge">Only you</span>
                )}
              </span>
              <div className="file-row-menu">
                <button
                  aria-label={`Actions for ${f.name}`}
                  className="cloud-icon-button"
                  onClick={() => setMenu(menu === f.id ? null : f.id)}
                >
                  <MoreHorizontal size={19} />
                </button>
                {menu === f.id && (
                  <>
                    <div
                      className="menu-dismiss"
                      onClick={() => setMenu(null)}
                    />
                    <div className="file-action-menu">
                      {f.trashed ? (
                        <>
                          <button
                            onClick={() =>
                              void action(() =>
                                w.mutate(
                                  `/files/${f.id}`,
                                  "PATCH",
                                  { trashed: false },
                                  "Back where it belongs. File restored.",
                                ),
                              )
                            }
                          >
                            <RotateCcw size={15} />
                            Restore
                          </button>
                          <button
                            className="danger"
                            onClick={() => openDialog("delete", f)}
                          >
                            <Trash2 size={15} />
                            Delete permanently
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              void action(() =>
                                w.mutate(
                                  `/files/${f.id}`,
                                  "PATCH",
                                  { starred: !f.starred },
                                  f.starred
                                    ? "Removed from favorites."
                                    : "Added to favorites.",
                                ),
                              )
                            }
                          >
                            <Star size={15} />
                            {f.starred ? "Remove favorite" : "Add to favorites"}
                          </button>
                          {f.kind === "file" && (
                            <>
                              <button
                                onClick={() => {
                                  onShare(f);
                                  setMenu(null);
                                }}
                              >
                                <Share2 size={15} />
                                Share file
                              </button>
                              <a href={`/api/files/${f.id}/download`} download>
                                <Download size={15} />
                                Download
                              </a>
                            </>
                          )}
                          <button
                            onClick={() =>
                              void action(() =>
                                w.mutate(
                                  `/files/${f.id}/copy`,
                                  "POST",
                                  { parent: f.parent },
                                  "A little more room for ideas. Copy created.",
                                ),
                              )
                            }
                          >
                            <Copy size={15} />
                            Make a copy
                          </button>
                          <button onClick={() => openDialog("rename", f)}>
                            <PenLine size={15} />
                            Rename
                          </button>
                          <button onClick={() => openDialog("move", f)}>
                            <Move size={15} />
                            Move to folder
                          </button>
                          <hr />
                          <button
                            className="danger"
                            onClick={() =>
                              void action(() =>
                                w.mutate(
                                  `/files/${f.id}`,
                                  "PATCH",
                                  { trashed: true },
                                  "Moved to trash. You can restore it anytime.",
                                ),
                              )
                            }
                          >
                            <Trash2 size={15} />
                            Move to trash
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cloud-empty">
          <span className="empty-illustration">
            {view === "trash" ? (
              <Trash2 size={38} />
            ) : query ? (
              <Search size={38} />
            ) : (
              <CloudUpload size={42} />
            )}
          </span>
          <h3>
            {query
              ? "Nothing by that name."
              : view === "trash"
                ? "All clear. A fresh start."
                : view === "favorites"
                  ? "Keep your favorites close."
                  : "A little space for your next big thing."}
          </h3>
          <p>
            {query
              ? "Try another search or clear your filters."
              : view === "favorites"
                ? "Star files from the actions menu to find them here."
                : view === "trash"
                  ? "Files you remove will wait here until you restore or delete them."
                  : "Drop your files here, or upload something worth keeping."}
          </p>
          {!query && !["favorites", "trash"].includes(view) && (
            <button
              className="cloud-primary"
              onClick={() => uploadInput.current?.click()}
            >
              <Upload size={16} />
              Upload your first file
            </button>
          )}
        </div>
      )}
      <div className="workspace-status">
        <span>
          <span className="cloud-status-dot" />
          {items.length} items · Private server storage
        </span>
        <span>
          <ShieldStatus />
          Stored in your workspace
        </span>
      </div>
      {dragging && (
        <div className="drop-overlay">
          <CloudUpload size={55} />
          <h2>Make yourself at home.</h2>
          <p>Drop files to upload them to {current?.name || "My files"}.</p>
        </div>
      )}
      {dialog && (
        <Modal
          title={
            dialog.type === "folder"
              ? "A new space."
              : dialog.type === "rename"
                ? "Give it a new name."
                : dialog.type === "move"
                  ? "Find a new home."
                  : dialog.type === "empty"
                    ? "Empty your trash?"
                    : "Let this file go?"
          }
          subtitle={
            dialog.type === "delete" || dialog.type === "empty"
              ? "This permanently removes the files and their share links. This cannot be undone."
              : "A little organization goes a long way."
          }
          onClose={() => setDialog(null)}
        >
          <form className="cloud-form" onSubmit={(e) => void submit(e)}>
            {["folder", "rename"].includes(dialog.type) && (
              <label>
                {dialog.type === "folder" ? "Folder name" : "File name"}
                <input
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Something worth keeping"
                />
              </label>
            )}
            {dialog.type === "move" && (
              <label>
                Destination
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="">My files</option>
                  {active
                    .filter(
                      (f) => f.kind === "folder" && f.id !== dialog.file?.id,
                    )
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {error && (
              <div className="cloud-error" role="alert">
                {error}
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="cloud-secondary"
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className={
                  ["delete", "empty"].includes(dialog.type)
                    ? "cloud-danger"
                    : "cloud-primary"
                }
                type="submit"
              >
                {busy
                  ? "Saving…"
                  : ["delete", "empty"].includes(dialog.type)
                    ? "Delete permanently"
                    : "Save changes"}
                <Check size={15} />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
function ShieldStatus() {
  return <HardDrive size={13} />;
}
