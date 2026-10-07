import { useState, useEffect, useRef } from "react";
import { api, json } from "./api";
import { useSession } from "./Session";
import type { CloudFile, Share, Activity, User } from "./types";
export function useWorkspace() {
  const session = useSession();
  const alive = useRef(true);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [incoming, setIncoming] = useState<Share[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploads, setUploads] = useState<{
    name: string;
    progress: number;
  } | null>(null);
  const refresh = async () => {
    try {
      const [f, s, i, a] = await Promise.all([
        api<{ files: CloudFile[]; user: User }>("/files"),
        api<{ shares: Share[] }>("/shares"),
        api<{ shares: Share[] }>("/shares/incoming"),
        api<{ activity: Activity[] }>("/files/activity/recent"),
      ]);
      if (!alive.current) return;
      setFiles(f.files);
      session.setUser(f.user);
      setShares(s.shares);
      setIncoming(i.shares);
      setActivity(a.activity);
      setError("");
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener("fs-change", onChange);
    const id = setInterval(() => void refresh(), 30000);
    return () => {
      alive.current = false;
      clearInterval(id);
      window.removeEventListener("fs-change", onChange);
    };
  }, []);
  const mutate = async (
    path: string,
    method: string,
    body: unknown,
    message: string,
  ) => {
    await api(path, json(method, body));
    await refresh();
    if (message) session.setToast(message);
  };
  const upload = async (list: FileList | File[], parent: string | null) => {
    const items = Array.from(list);
    let succeeded = 0;
    try {
      for (let i = 0; i < items.length; i++) {
        const file = items[i];
        setUploads({ name: file.name, progress: 0 });
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/files/upload");
          xhr.withCredentials = true;
          const form = new FormData();
          form.append("file", file);
          if (parent) form.append("parent", parent);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setUploads({
                name: file.name,
                progress: Math.round((e.loaded / e.total) * 100),
              });
          };
          xhr.onload = () => {
            try {
              const result = JSON.parse(xhr.responseText);
              if (xhr.status < 400) resolve();
              else reject(Error(result.error || "Upload failed."));
            } catch {
              reject(Error("The server did not accept this upload."));
            }
          };
          xhr.onerror = () => reject(Error("Connection lost while uploading."));
          xhr.send(form);
        });
        succeeded++;
      }
      session.setToast(
        `${succeeded} ${succeeded === 1 ? "file" : "files"} uploaded. Ready when you are.`,
      );
    } catch (e) {
      session.setToast(
        `${(e as Error).message}${succeeded ? ` ${succeeded} files uploaded successfully.` : ""}`,
      );
    } finally {
      setUploads(null);
      await refresh();
    }
  };
  return {
    files,
    shares,
    incoming,
    activity,
    loading,
    error,
    uploads,
    refresh,
    mutate,
    upload,
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
