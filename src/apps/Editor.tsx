import { useState, useEffect } from "react";
import { Save, FilePlus, WrapText } from "lucide-react";
import { useOS } from "../core/store";
import * as fs from "../core/filesystem";
import type { AppWindow } from "../core/types";
export default function Editor({ win }: { win: AppWindow }) {
  const os = useOS();
  const [id, setId] = useState(win.fileId);
  const file = os.files.find((f) => f.id === id);
  const [text, setText] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(Boolean(win.fileId));
  useEffect(() => {
    if (!win.fileId) return;
    let live = true;
    fs.readContent(win.fileId)
      .then((t) => {
        if (live) setText(t);
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [win.fileId]);
  const [name, setName] = useState(file?.name || "Untitled.txt");
  const [dirty, setDirty] = useState(false);
  const [wrap, setWrap] = useState(true);
  const [error, setError] = useState("");
  async function save() {
    if (loading || loadFailed) return;
    try {
      const current = id
        ? (await fs.allFiles()).find((f) => f.id === id)
        : undefined;
      if (id && !current)
        throw Error(
          "This document was removed. Create a new document to save a copy.",
        );
      if (current) {
        if (name !== current.name) await fs.rename(current.id, name);
        await fs.put({ ...current, name, content: text, modified: Date.now() });
      } else {
        const f = await fs.create(
          os.files.find((f) => f.kind === "folder" && f.name === "Documents")
            ?.id || fs.ROOT,
          name,
          "file",
          text,
          "text/plain",
        );
        setId(f.id);
      }
      setDirty(false);
      setError("");
      os.notify("Document saved", `${name} is safe in Documents.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "s" &&
        !win.minimized &&
        win.z ===
          Math.max(...os.windows.filter((w) => !w.minimized).map((w) => w.z))
      ) {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [text, name, file, win.z, win.minimized, os.windows]);
  return (
    <div className="editor-app">
      <div className="app-toolbar">
        <FilePlus size={17} />
        <input
          aria-label="Document name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
        />
        <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <button aria-label="Toggle word wrap" onClick={() => setWrap(!wrap)}>
          <WrapText size={17} />
        </button>
        <button
          className="primary small"
          disabled={loading}
          onClick={() => void save()}
        >
          <Save size={15} />
          Save
        </button>
      </div>
      {error && <div className="inline-error">{error}</div>}
      <textarea
        disabled={loading || loadFailed}
        aria-label="Document content"
        spellCheck={false}
        style={{ whiteSpace: wrap ? "pre-wrap" : "pre" }}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        placeholder="Let your thoughts find a home…"
      />
      <footer>
        {text.split("\n").length} lines{" "}
        <span>{text.length} characters · UTF-8</span>
      </footer>
    </div>
  );
}
