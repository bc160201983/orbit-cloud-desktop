import { usePersistent } from "./persistence";
import type { Preferences } from "./types";
export function usePreferences() {
  return usePersistent<Preferences>("orbit-settings", {
    theme: "light",
    wallpaper: "forest",
    volume: 65,
    wifi: true,
    bluetooth: true,
    brightness: 100,
  });
}
