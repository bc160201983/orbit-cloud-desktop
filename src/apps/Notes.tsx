import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  Activity,
  Heart,
  Download,
  Check,
  Paintbrush,
  Cloud,
  Code2,
  Headphones,
  Leaf,
  ArrowUpRight,
} from "lucide-react";
import { useOS } from "../core/store";
import { apps } from "../core/registry";
interface Note {
  id: string;
  title: string;
  body: string;
  updated: number;
}
export function Notes() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("orbit-notes") || "null") || [
          {
            id: "first",
            title: "Little things, big days",
            body: "A place for the thoughts you want to keep.\n\n☐ Take a walk without a destination\n☐ Start that thing you’ve been thinking about\n☐ Find a new favorite song\n\nThere’s no rush. You’re right where you need to be.",
            updated: Date.now(),
          },
        ]
      );
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState(notes[0]?.id || "");
  const [query, setQuery] = useState("");
  useEffect(
    () => localStorage.setItem("orbit-notes", JSON.stringify(notes)),
    [notes],
  );
  const note = notes.find((n) => n.id === selected);
  const update = (patch: Partial<Note>) =>
    setNotes((ns) =>
      ns.map((n) =>
        n.id === selected ? { ...n, ...patch, updated: Date.now() } : n,
      ),
    );
  return (
    <div className="notes-app">
      <aside>
        <div>
          <h2>Notes</h2>
          <button
            aria-label="New note"
            onClick={() => {
              const id = crypto.randomUUID();
              setNotes([
                { id, title: "Untitled note", body: "", updated: Date.now() },
                ...notes,
              ]);
              setSelected(id);
            }}
          >
            <Plus size={20} />
          </button>
        </div>
        <input
          aria-label="Search notes"
          placeholder="Search your thoughts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {notes
          .filter((n) =>
            (n.title + n.body).toLowerCase().includes(query.toLowerCase()),
          )
          .map((n) => (
            <button
              className={selected === n.id ? "selected" : ""}
              key={n.id}
              onClick={() => setSelected(n.id)}
            >
              <strong>{n.title || "Untitled"}</strong>
              <p>{n.body.slice(0, 65) || "A fresh page"}</p>
              <small>{new Date(n.updated).toLocaleDateString()}</small>
            </button>
          ))}
      </aside>
      <main>
        {note ? (
          <>
            <div className="note-meta">
              <span>
                {new Date(note.updated).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · Saved locally
              </span>
              <button
                aria-label="Delete note"
                onClick={() => {
                  const rest = notes.filter((n) => n.id !== selected);
                  setNotes(rest);
                  setSelected(rest[0]?.id || "");
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
            <input
              aria-label="Note title"
              value={note.title}
              onChange={(e) => update({ title: e.target.value })}
            />
            <textarea
              aria-label="Note body"
              placeholder="What’s on your mind?"
              value={note.body}
              onChange={(e) => update({ body: e.target.value })}
            />
          </>
        ) : (
          <div className="empty-state">
            <h2>A fresh page awaits.</h2>
            <p>Create a note to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}
