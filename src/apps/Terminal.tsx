import { useState, useRef, useEffect } from "react";
import { useOS } from "../core/store";
import * as fs from "../core/filesystem";
export default function Terminal() {
  const os = useOS();
  const [cwd, setCwd] = useState(fs.ROOT);
  const cwdRef = useRef(fs.ROOT);
  const [lines, setLines] = useState([
    "Orbit shell 1.0.0",
    "Type “help” to discover your space.",
    "",
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hist, setHist] = useState(0);
  const queue = useRef(Promise.resolve());
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView();
  }, [lines]);
  async function run(raw: string) {
    const cwd = cwdRef.current;
    setHistory((h) => [...h, raw]);
    setHist(history.length + 1);
    let out = "";
    const tokens =
      raw
        .match(/"[^"]*"|'[^']*'|\S+/g)
        ?.map((t) => t.replace(/^['"]|['"]$/g, "")) || [];
    const [cmd, ...args] = tokens;
    let files = await fs.allFiles();
    const resolve = (p: string) => fs.resolvePath(files, cwd, p);
    const destination = (p: string) => {
      const parts = p.split("/");
      const name = parts.pop()!;
      return {
        parent: parts.length ? resolve(parts.join("/") || "/").id : cwd,
        name,
      };
    };
    try {
      switch (cmd) {
        case undefined:
          return;
        case "help":
          out =
            "ls [path] · cd [path] · pwd · mkdir <name> · touch <name>\ncat <file> · echo <text> [> file] · rm <path>\ncp <source> <destination> · mv <source> <destination>\nclear · date · whoami · neofetch\nUse quotes for filenames with spaces. Files are shared with Files.";
          break;
        case "ls": {
          const folder = args[0] ? resolve(args[0]).id : cwd;
          out =
            files
              .filter((f) => f.parent === folder)
              .map((f) => f.name + (f.kind === "folder" ? "/" : ""))
              .join("   ") || "(empty)";
          break;
        }
        case "pwd":
          out = fs.pathOf(files, cwd);
          break;
        case "cd": {
          const f = args[0] ? resolve(args[0]) : resolve("/");
          if (f.kind !== "folder") throw Error("Not a directory");
          cwdRef.current = f.id;
          setCwd(f.id);
          break;
        }
        case "mkdir":
        case "touch": {
          if (!args[0]) throw Error("A name is required");
          for (const a of args) {
            const d = destination(a);
            await fs.create(
              d.parent,
              d.name,
              cmd === "mkdir" ? "folder" : "file",
            );
          }
          break;
        }
        case "cat": {
          const f = resolve(args[0]);
          if (f.kind === "folder") throw Error("Is a directory");
          out = f.content;
          break;
        }
        case "echo": {
          const i = args.indexOf(">");
          if (i < 0) out = args.join(" ");
          else {
            const d = destination(args[i + 1]);
            const f = files.find(
              (f) => f.parent === d.parent && f.name === d.name,
            );
            if (f)
              await fs.put({
                ...f,
                content: args.slice(0, i).join(" "),
                modified: Date.now(),
              });
            else
              await fs.create(
                d.parent,
                d.name,
                "file",
                args.slice(0, i).join(" "),
              );
          }
          break;
        }
        case "rm":
          for (const a of args.filter((a) => !a.startsWith("-")))
            await fs.remove(resolve(a).id);
          break;
        case "cp":
        case "mv": {
          if (args.length !== 2) throw Error("Specify source and destination");
          const src = resolve(args[0]);
          let dest;
          try {
            dest = resolve(args[1]);
          } catch {
            dest = null;
          }
          if (dest?.kind === "folder")
            await fs.transfer(src.id, dest.id, cmd === "cp");
          else {
            const d = destination(args[1]);
            if (cmd === "cp") {
              if (src.kind === "folder")
                throw Error("Copy folders to an existing directory");
              await fs.create(
                d.parent,
                d.name,
                src.kind,
                src.content,
                src.mime,
              );
            } else {
              await fs.transfer(src.id, d.parent);
              await fs.rename(src.id, d.name);
            }
          }
          break;
        }
        case "clear":
          setLines([]);
          return;
        case "date":
          out = new Date().toString();
          break;
        case "whoami":
          out = "alex";
          break;
        case "neofetch":
          out =
            "     ◉  ORBIT\n     │  Your space, reimagined\n\nOS       Orbit Browser Desktop 1.0\nHost     " +
            navigator.platform +
            "\nShell    orbit-sh\nStorage  IndexedDB · " +
            files.length +
            " items\nApps     12 built-in\nTheme    " +
            os.preferences.theme;
          break;
        default:
          out = `${cmd}: command not found. Try help.`;
      }
    } catch (e) {
      out = `Error: ${(e as Error).message}`;
    }
    setLines((l) => [
      ...l,
      `alex@orbit ${fs.pathOf(files, cwd)} $ ${raw}`,
      out,
    ]);
  }
  return (
    <div
      className="terminal-app"
      onClick={() => document.getElementById("terminal-input")?.focus()}
    >
      {lines.map((l, i) => (
        <pre key={i}>{l}</pre>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const raw = input;
          setInput("");
          queue.current = queue.current.then(() => run(raw));
        }}
      >
        <span>
          alex@orbit <b>{fs.pathOf(os.files, cwd)}</b> $
        </span>
        <input
          id="terminal-input"
          aria-label="Terminal command"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              const n = Math.max(0, hist - 1);
              setHist(n);
              setInput(history[n] || "");
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const n = Math.min(history.length, hist + 1);
              setHist(n);
              setInput(history[n] || "");
            }
          }}
        />
      </form>
      <div ref={bottom} />
    </div>
  );
}
