import { useState } from "react";
import type { AppId, AppWindow } from "./types";
import { readSaved, useAccountKey } from "./persistence";
import { appById } from "./registry";
export function useWindowManager() {
  const positionKey = useAccountKey("orbit-positions");
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const open = (app: AppId, fileId?: string) => {
    setWindows((ws) => {
      const existing = ws.find((w) => w.app === app && w.fileId === fileId);
      const z = Math.max(0, ...ws.map((w) => w.z)) + 1;
      if (existing)
        return ws.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, z } : w,
        );
      const positions = readSaved<Record<string, Partial<AppWindow>>>(
        positionKey,
        {},
      );
      const p = positions[app] || {};
      const width = Math.min(
        p.width ??
          (app === "calculator"
            ? 340
            : ["files", "admin", "sharing", "account"].includes(app)
              ? 1050
              : 800),
        innerWidth - 32,
      );
      const height = Math.min(
        p.height ?? (app === "calculator" ? 510 : 650),
        innerHeight - 120,
      );
      return [
        ...ws,
        {
          id: crypto.randomUUID(),
          app,
          title: appById(app).name,
          x: Math.max(
            16,
            Math.min(
              p.x ?? (innerWidth - width) / 2 + ws.length * 22,
              innerWidth - width - 16,
            ),
          ),
          y: Math.max(
            42,
            Math.min(
              p.y ?? (innerHeight - height) / 2 - 20 + ws.length * 16,
              innerHeight - height - 88,
            ),
          ),
          width,
          height,
          minimized: false,
          maximized: false,
          z,
          fileId,
        },
      ];
    });
  };
  const patch = (id: string, patch: Partial<AppWindow>) =>
    setWindows((ws) =>
      ws.map((w) => {
        if (w.id !== id) return w;
        const next = { ...w, ...patch };
        if ("x" in patch || "width" in patch) {
          const positions = readSaved<Record<string, Partial<AppWindow>>>(
            positionKey,
            {},
          );
          positions[w.app] = {
            x: next.x,
            y: next.y,
            width: next.width,
            height: next.height,
          };
          localStorage.setItem(positionKey, JSON.stringify(positions));
        }
        return next;
      }),
    );
  const focus = (id: string) =>
    setWindows((ws) =>
      ws.map((w) =>
        w.id === id ? { ...w, z: Math.max(...ws.map((w) => w.z)) + 1 } : w,
      ),
    );
  return {
    windows,
    open,
    patch,
    focus,
    close: (id: string) => setWindows((ws) => ws.filter((w) => w.id !== id)),
  };
}
