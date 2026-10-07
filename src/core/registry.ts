import {
  Folder,
  Settings,
  Terminal,
  FileText,
  Calculator,
  Image,
  Music2,
  Video,
  Globe,
  Activity,
  NotebookPen,
  ShoppingBag,
} from "lucide-react";
import type { AppId } from "./types";
export const apps = [
  {
    id: "files",
    name: "Files",
    icon: Folder,
    color: "#d9aa56",
    category: "Essentials",
  },
  {
    id: "browser",
    name: "Browser",
    icon: Globe,
    color: "#65b7bb",
    category: "Essentials",
  },
  {
    id: "editor",
    name: "Text Editor",
    icon: FileText,
    color: "#779cc6",
    category: "Create",
  },
  {
    id: "notes",
    name: "Notes",
    icon: NotebookPen,
    color: "#dfb858",
    category: "Create",
  },
  {
    id: "music",
    name: "Music",
    icon: Music2,
    color: "#d5848d",
    category: "Entertainment",
  },
  {
    id: "images",
    name: "Photos",
    icon: Image,
    color: "#9bae80",
    category: "Entertainment",
  },
  {
    id: "video",
    name: "Video",
    icon: Video,
    color: "#9c8bc3",
    category: "Entertainment",
  },
  {
    id: "calculator",
    name: "Calculator",
    icon: Calculator,
    color: "#89a19c",
    category: "Essentials",
  },
  {
    id: "terminal",
    name: "Terminal",
    icon: Terminal,
    color: "#60776d",
    category: "Developer",
  },
  {
    id: "monitor",
    name: "System Monitor",
    icon: Activity,
    color: "#8dad9e",
    category: "Developer",
  },
  {
    id: "store",
    name: "App Store",
    icon: ShoppingBag,
    color: "#8f9bc5",
    category: "Discover",
  },
  {
    id: "settings",
    name: "Settings",
    icon: Settings,
    color: "#939da5",
    category: "Essentials",
  },
] satisfies {
  id: AppId;
  name: string;
  icon: typeof Folder;
  color: string;
  category: string;
}[];
export const appById = (id: AppId) => apps.find((a) => a.id === id)!;
export const wallpapers = [
  { id: "alpine", name: "Alpine dawn", url: "/wallpapers/alpine.svg" },
  { id: "forest", name: "Quiet wilderness", url: "/wallpapers/forest.svg" },
  { id: "coast", name: "Coastal calm", url: "/wallpapers/coast.svg" },
  { id: "abstract", name: "Sage gradients", url: "" },
];
