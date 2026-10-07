import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, json } from "./api";
import type { Status, User } from "./types";
const Context = createContext<ReturnType<typeof useSessionState> | null>(null);
function useSessionState() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("orbit-cloud-theme") === "dark" ? "dark" : "light",
  );
  const refresh = async () => {
    try {
      setStatus(await api<Status>("/auth/status"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void refresh();
    const expired = () => void refresh();
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    localStorage.setItem("orbit-cloud-theme", theme);
    document.documentElement.dataset.cloudTheme = theme;
  }, [theme]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  const setUser = (user: User) =>
    setStatus((s) => (s ? { ...s, user, initialized: true } : s));
  const logout = async () => {
    await api("/auth/logout", json("POST", {}));
    await refresh();
  };
  return {
    status,
    error,
    refresh,
    setUser,
    logout,
    toast,
    setToast,
    theme,
    setTheme,
  };
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSession() {
  const s = useContext(Context);
  if (!s) throw Error("Missing session provider");
  return s;
}
