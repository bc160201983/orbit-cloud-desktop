import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { VFile } from "./types";
import * as fs from "./filesystem";
import { usePreferences } from "./preferences";
import { useNotifications } from "./notifications";
import { useWindowManager } from "./windowManager";
function useDesktop() {
  const [preferences, setPreferences] = usePreferences();
  const { notices, setNotices, notify } = useNotifications();
  const { windows, open, patch, focus, close } = useWindowManager();
  const [files, setFiles] = useState<VFile[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const openFile = (f: VFile) => {
    if (f.kind === "folder") open("files", f.id);
    else
      open(
        f.mime.startsWith("image")
          ? "images"
          : f.mime.startsWith("audio")
            ? "music"
            : f.mime.startsWith("video")
              ? "video"
              : "editor",
        f.id,
      );
  };
  useEffect(() => {
    const refresh = () =>
      fs
        .allFiles()
        .then(setFiles)
        .catch((e) => setError(String(e)));
    fs.initFS()
      .then(() => {
        refresh();
        setReady(true);
        open("files");
      })
      .catch((e) => setError(String(e)));
    window.addEventListener("fs-change", refresh);
    return () => window.removeEventListener("fs-change", refresh);
  }, []);
  return {
    preferences,
    setPreferences,
    windows,
    open,
    patch,
    focus,
    close,
    files,
    ready,
    error,
    notices,
    setNotices,
    notify,
    openFile,
  };
}
const Context = createContext<ReturnType<typeof useDesktop> | null>(null);
export function DesktopProvider({ children }: { children: ReactNode }) {
  const value = useDesktop();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useOS() {
  const c = useContext(Context);
  if (!c) throw Error("Missing desktop provider");
  return c;
}
