import { useState, useEffect } from "react";
import { Save, FilePlus, WrapText } from "lucide-react";
import { useOS } from "../core/store";
import * as fs from "../core/filesystem";
import type { AppWindow } from "../core/types";
export default function Editor({ win }: { win: AppWindow }) {
  const os = useOS();
  const [id, setId] = useState(win.fileId);
  const file = os.files.find((f) => f.id === id);
  const [text, setText] = useState(file?.content || "");
  const [name, setName] = useState(file?.name || "Untitled.txt");
  const [dirty, setDirty] = useState(false);
  const [wrap, setWrap] = useState(true);
  const [error, setError] = useState("");
  async function save() {
    try {
      if (file) {
        if (name !== file.name) await fs.rename(file.id, name);
        await fs.put({ ...file, name, content: text, modified: Date.now() });
      } else {
        const f = await fs.create(
          "documents",
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
        <button className="primary small" onClick={() => void save()}>
          <Save size={15} />
          Save
        </button>
      </div>
      {error && <div className="inline-error">{error}</div>}
      <textarea
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
