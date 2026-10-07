import type { VFile } from "./types";
import type { CloudFile } from "../cloud/types";
import { api, json } from "../cloud/api";
export const ROOT = "home";
export function virtualFiles(files: CloudFile[]): VFile[] {
  return [
    {
      id: ROOT,
      parent: null,
      name: "Home",
      kind: "folder",
      content: "",
      mime: "",
      modified: 0,
      size: 0,
    },
    ...files
      .filter((f) => !f.trashed)
      .map((f) => ({
        ...f,
        parent: f.parent || ROOT,
        content: f.kind === "file" ? `/api/files/${f.id}/preview` : "",
      })),
  ];
}
export async function allFiles() {
  return virtualFiles((await api<{ files: CloudFile[] }>("/files")).files);
}
const changed = () => window.dispatchEvent(new Event("fs-change"));
export async function readContent(id: string) {
  const files = await allFiles(),
    f = files.find((f) => f.id === id);
  if (!f || f.kind !== "file") throw Error("Document not found.");
  if (!(
    f.mime.startsWith("text/") ||
    /\.(txt|md|json|csv|js|ts|tsx|css|html|py|mjs)$/i.test(f.name)
  ))
    throw Error("This is a binary file. Download it from Files.");
  if ((f.size || 0) > 1048576)
    throw Error("Documents over 1 MB can be downloaded from Files.");
  const r = await fetch(`/api/files/${id}/preview`);
  if (!r.ok) throw Error("Unable to read this document.");
  return r.text();
}
export async function put(file: VFile) {
  await api(
    `/files/${file.id}/content`,
    json("PUT", { content: file.content }),
  );
  changed();
}
export async function create(
  parent: string,
  name: string,
  kind: VFile["kind"],
  content = "",
  _mime = "text/plain",
  _id?: string,
) {
  const r = await api<{ file: CloudFile }>(
    kind === "folder" ? "/files/folder" : "/files/text",
    json("POST", { parent: parent === ROOT ? null : parent, name, content }),
  );
  changed();
  return virtualFiles([r.file])[1];
}
export async function remove(id: string) {
  if (id === ROOT) throw Error("Cannot delete Home");
  await api(`/files/${id}`, json("PATCH", { trashed: true }));
  changed();
}
export async function rename(id: string, name: string) {
  await api(`/files/${id}`, json("PATCH", { name }));
  changed();
}
export async function transfer(
  id: string,
  parent: string,
  copy = false,
  name?: string,
) {
  if (id === ROOT) throw Error("Cannot move Home");
  await api(
    `/files/${id}${copy ? "/copy" : ""}`,
    json(copy ? "POST" : "PATCH", {
      parent: parent === ROOT ? null : parent,
      ...(name ? { name } : {}),
    }),
  );
  changed();
}
export function resolvePath(files: VFile[], cwd: string, path: string) {
  let id = path.startsWith("/") ? ROOT : cwd;
  for (const part of path.split("/").filter(Boolean)) {
    if (part === "." || part === "Home") continue;
    if (part === "..") {
      id = files.find((f) => f.id === id)?.parent || ROOT;
      continue;
    }
    const next = files.find((f) => f.parent === id && f.name === part);
    if (!next) throw Error(`No such file or directory: ${path}`);
    id = next.id;
  }
  return files.find((f) => f.id === id)!;
}
export function pathOf(files: VFile[], id: string): string {
  const f = files.find((x) => x.id === id);
  return !f || id === ROOT
    ? "/"
    : `${pathOf(files, f.parent || ROOT).replace(/\/$/, "")}/${f.name}`;
}
