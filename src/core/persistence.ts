import { useState, useEffect } from "react";
export function readSaved<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function usePersistent<T>(key: string, initial: T) {
  const [value, set] = useState<T>(() => readSaved(key, initial));
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, set] as const;
}
