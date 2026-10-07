export type AppId =
  | "files"
  | "settings"
  | "terminal"
  | "editor"
  | "calculator"
  | "images"
  | "music"
  | "video"
  | "browser"
  | "monitor"
  | "notes"
  | "store"
  | "sharing"
  | "account"
  | "admin";
export interface VFile {
  id: string;
  parent: string | null;
  name: string;
  kind: "folder" | "file";
  content: string;
  mime: string;
  modified: number;
  size?: number;
}
export interface AppWindow {
  id: string;
  app: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
  fileId?: string;
}
export interface Preferences {
  theme: "light" | "dark";
  wallpaper: string;
  volume: number;
  wifi: boolean;
  bluetooth: boolean;
  brightness: number;
}
export interface Notice {
  id: string;
  title: string;
  message: string;
  time: number;
}
