import { useRef, useState, type PointerEvent } from "react";
import {
  Minus,
  Square,
  X,
  Copy,
  PanelLeft,
  PanelRight,
  Maximize2,
} from "lucide-react";
import { useOS } from "../core/store";
import { appById } from "../core/registry";
import type { AppWindow } from "../core/types";
import AppContent from "../apps/AppContent";
export default function Window({ win }: { win: AppWindow }) {
  const os = useOS();
  const [snapMenu, setSnapMenu] = useState(false);
  const restore = useRef({
    x: win.x,
    y: win.y,
    width: win.width,
    height: win.height,
  });
  const [dragging, setDragging] = useState(false);
  const a = appById(win.app);
  const focused =
    win.z ===
    Math.max(...os.windows.filter((w) => !w.minimized).map((w) => w.z));
  const maximize = () => {
    if (!win.maximized)
      restore.current = {
        x: win.x,
        y: win.y,
        width: win.width,
        height: win.height,
      };
    os.patch(
      win.id,
      win.maximized
        ? { ...restore.current, maximized: false }
        : { maximized: true },
    );
  };
  const snap = (side: string) => {
    if (side === "full") {
      if (!win.maximized) maximize();
      return;
    }
    os.patch(win.id, {
      maximized: false,
      x: side === "left" ? 8 : innerWidth / 2 + 4,
      y: 40,
      width: innerWidth / 2 - 12,
      height: innerHeight - 130,
    });
    setSnapMenu(false);
  };
  const pointer = (e: PointerEvent<HTMLElement>, mode: string) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    if (win.maximized && mode !== "move") return;
    e.preventDefault();
    os.focus(win.id);
    const sx = e.clientX,
      sy = e.clientY;
    let base = { x: win.x, y: win.y, width: win.width, height: win.height };
    if (win.maximized) {
      base = {
        ...restore.current,
        x: Math.max(0, sx - restore.current.width / 2),
        y: 42,
      };
      os.patch(win.id, { ...base, maximized: false });
    }
    setDragging(true);
    const move = (ev: globalThis.PointerEvent) => {
      const dx = ev.clientX - sx,
        dy = ev.clientY - sy;
      if (mode === "move")
        os.patch(win.id, {
          x: Math.min(
            innerWidth - 120,
            Math.max(-base.width + 120, base.x + dx),
          ),
          y: Math.max(34, Math.min(innerHeight - 110, base.y + dy)),
        });
      else {
        let { x, y, width, height } = base;
        if (mode.includes("e")) width = Math.max(300, base.width + dx);
        if (mode.includes("s")) height = Math.max(260, base.height + dy);
        if (mode.includes("w")) {
          width = Math.max(300, base.width - dx);
          x = base.x + base.width - width;
        }
        if (mode.includes("n")) {
          height = Math.max(260, base.height - dy);
          y = base.y + base.height - height;
        }
        os.patch(win.id, { x, y, width, height });
      }
    };
    const up = (ev: globalThis.PointerEvent) => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (mode === "move") {
        if (ev.clientY < 42) snap("full");
        else if (ev.clientX < 16) snap("left");
        else if (ev.clientX > innerWidth - 16) snap("right");
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  if (win.minimized) return null;
  return (
    <section
      className={`app-window ${focused ? "focused" : ""} ${dragging ? "moving" : ""} ${win.maximized ? "maximized" : ""}`}
      aria-label={`${a.name} window`}
      style={{
        left: win.maximized ? 8 : win.x,
        top: win.maximized ? 38 : win.y,
        width: win.maximized ? "calc(100vw - 16px)" : win.width,
        height: win.maximized ? "calc(100dvh - 130px)" : win.height,
        zIndex: win.z + 20,
      }}
      onPointerDown={() => os.focus(win.id)}
    >
      <header
        className="window-titlebar"
        onPointerDown={(e) => pointer(e, "move")}
        onDoubleClick={maximize}
      >
        <div className="window-app-title">
          <a.icon size={17} style={{ color: a.color }} />
          <span>{a.name}</span>
          {win.app === "files" && (
            <span className="title-tag">Your personal space</span>
          )}
        </div>
        <div className="window-controls">
          <button
            aria-label={`Minimize ${a.name}`}
            onClick={() => os.patch(win.id, { minimized: true })}
          >
            <Minus size={15} />
          </button>
          <button
            aria-label={`Snap ${a.name}`}
            onClick={() => setSnapMenu(!snapMenu)}
          >
            <PanelLeft size={14} />
          </button>
          <button aria-label={`Maximize ${a.name}`} onClick={maximize}>
            {win.maximized ? <Copy size={13} /> : <Square size={12} />}
          </button>
          <button
            aria-label={`Close ${a.name}`}
            className="close-window"
            onClick={() => os.close(win.id)}
          >
            <X size={16} />
          </button>
        </div>
        {snapMenu && (
          <div className="snap-menu">
            <button onClick={() => snap("left")}>
              <PanelLeft />
              Left
            </button>
            <button onClick={() => snap("right")}>
              <PanelRight />
              Right
            </button>
            <button onClick={() => snap("full")}>
              <Maximize2 />
              Full
            </button>
          </div>
        )}
      </header>
      <div className="window-body">
        <AppContent win={win} />
      </div>
      {!win.maximized &&
        ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((d) => (
          <div
            key={d}
            className={`resize-handle resize-${d}`}
            onPointerDown={(e) => pointer(e, d)}
          />
        ))}
    </section>
  );
}
