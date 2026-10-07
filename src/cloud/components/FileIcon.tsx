import {
  Folder,
  FileText,
  Image,
  File,
  Music2,
  Video,
  FileArchive,
  FileCode2,
} from "lucide-react";
import type { CloudFile } from "../types";
export function category(file: Pick<CloudFile, "mime" | "kind" | "name">) {
  if (file.kind === "folder") return "folder";
  if (file.mime.startsWith("image/")) return "image";
  if (file.mime.startsWith("video/")) return "video";
  if (file.mime.startsWith("audio/")) return "audio";
  if (/\.(zip|gz|rar|7z|tar)$/.test(file.name)) return "archive";
  if (/\.(json|js|ts|tsx|css|html|py|mjs)$/.test(file.name)) return "code";
  if (file.mime.startsWith("text/") || /\.(pdf|docx?|md|txt)$/.test(file.name))
    return "document";
  return "other";
}
export default function FileIcon({
  file,
  size = 22,
}: {
  file: Pick<CloudFile, "mime" | "kind" | "name">;
  size?: number;
}) {
  const type = category(file);
  const Icon = {
    folder: Folder,
    image: Image,
    video: Video,
    audio: Music2,
    archive: FileArchive,
    code: FileCode2,
    document: FileText,
    other: File,
  }[type];
  return (
    <span className={`cloud-file-icon type-${type}`}>
      <Icon size={size} strokeWidth={1.7} />
    </span>
  );
}
