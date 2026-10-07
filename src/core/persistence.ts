import { useState, useEffect } from "react";
export function readSaved<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
import { useSession } from "../cloud/Session";
export function useAccountKey(key: string) {
  return `${key}:${useSession().status!.user!.id}`;
}
export function usePersistent<T>(key: string, initial: T) {
  key = useAccountKey(key);
  const [value, set] = useState<T>(() => readSaved(key, initial));
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, set] as const;
}
