import { usePersistent } from "./persistence";
import type { Notice } from "./types";
export function useNotifications() {
  const [notices, setNotices] = usePersistent<Notice[]>("orbit-notifications", [
    {
      id: "welcome",
      title: "A fresh perspective",
      message: "Welcome to Orbit. Your space to focus, create, and explore.",
      time: Date.now(),
    },
  ]);
  const notify = (title: string, message: string) =>
    setNotices((n) =>
      [
        { id: crypto.randomUUID(), title, message, time: Date.now() },
        ...n,
      ].slice(0, 30),
    );
  return { notices, setNotices, notify };
}
