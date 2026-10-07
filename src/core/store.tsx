import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useCloudWorkspace } from "../cloud/DesktopHost";
import { useSession } from "../cloud/Session";
import type { AppId, VFile } from "./types";
import * as fs from "./filesystem";
import { usePreferences } from "./preferences";
import { useNotifications } from "./notifications";
import { useWindowManager } from "./windowManager";
function useDesktop() {
  const [preferences, setPreferences] = usePreferences();
  const { notices, setNotices, notify } = useNotifications();
  const { windows, open: launch, patch, focus, close } = useWindowManager();
  const session = useSession();
  const workspace = useCloudWorkspace();
  const user = session.status!.user!;
  const open = (app: AppId, fileId?: string) => {
    if (app !== "admin" || user.role === "admin") launch(app, fileId);
  };
  const files = fs.virtualFiles(workspace.files);
  const ready = !workspace.loading;
  const error = workspace.error;
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
    open("files");
  }, []);
  useEffect(() => {
    session.setTheme(preferences.theme);
  }, [preferences.theme]);
  return {
    user,
    workspaceName: session.status!.workspaceName,
    logout: session.logout,
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
