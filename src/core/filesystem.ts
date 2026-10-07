import type { VFile } from "./types";
let db: IDBDatabase;
export const ROOT = "home";
let initialization: Promise<void> | undefined;
export function initFS() {
  return (initialization ??= initialize());
}
async function initialize() {
  db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("orbit-files", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!(await allFiles()).length) {
    const now = Date.now();
    const folders = ["Documents", "Downloads", "Pictures", "Music", "Videos"];
    await put({
      id: ROOT,
      parent: null,
      name: "Home",
      kind: "folder",
      content: "",
      mime: "",
      modified: now,
    });
    for (const name of folders)
      await create(ROOT, name, "folder", "", "", name.toLowerCase());
    await create(
      "documents",
      "Welcome to Orbit.txt",
      "file",
      'Welcome to your own little universe.\n\nOrbit is a desktop that lives in your browser. Open apps from the dock, drag windows, and make this space yours.\n\nYour files and preferences are saved on this device. Try the terminal: ls, cd Documents, cat "Welcome to Orbit.txt".\n\nMake something wonderful.',
      "text/plain",
    );
    await create(
      "documents",
      "Project ideas.md",
      "file",
      "# A little room for big ideas\n\n- Explore somewhere new\n- Build something meaningful\n- Make time for the everyday\n",
      "text/plain",
    );
    await create(
      "pictures",
      "Alpine escape.jpg",
      "file",
      "/wallpapers/alpine.svg",
      "image/jpeg",
    );
    await create(
      "pictures",
      "Quiet waters.jpg",
      "file",
      "/wallpapers/forest.svg",
      "image/jpeg",
    );
  }
}
export function allFiles(): Promise<VFile[]> {
  return new Promise((resolve, reject) => {
    const r = db.transaction("files").objectStore("files").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export function put(file: VFile): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(file);
    tx.oncomplete = () => {
      window.dispatchEvent(new Event("fs-change"));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
export async function create(
  parent: string,
  name: string,
  kind: VFile["kind"],
  content = "",
  mime = "text/plain",
  id: string = crypto.randomUUID(),
) {
  name = name.trim();
  if (!name || name.includes("/")) throw Error("Enter a name without slashes.");
  if ((await allFiles()).some((f) => f.parent === parent && f.name === name))
    throw Error("That name already exists.");
  const f: VFile = {
    id,
    parent,
    name,
    kind,
    content,
    mime,
    modified: Date.now(),
  };
  await put(f);
  return f;
}
export async function remove(id: string) {
  if (id === ROOT) throw Error("Cannot delete Home");
  const files = await allFiles();
  for (const child of files.filter((f) => f.parent === id))
    await remove(child.id);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new Event("fs-change"));
}
export async function rename(id: string, name: string) {
  const f = (await allFiles()).find((f) => f.id === id);
  if (!f) return;
  if (!name.trim() || name.includes("/")) throw Error("Invalid name");
  if (
    (await allFiles()).some(
      (x) => x.id !== id && x.parent === f.parent && x.name === name,
    )
  )
    throw Error("That name already exists");
  await put({ ...f, name, modified: Date.now() });
}
export async function transfer(id: string, parent: string, copy = false) {
  const files = await allFiles();
  const f = files.find((f) => f.id === id);
  if (!f || id === ROOT) throw Error("Cannot move Home");
  let target = files.find((f) => f.id === parent);
  if (target?.kind !== "folder") throw Error("Choose a folder");
  while (target) {
    if (target.id === id) throw Error("Cannot put a folder inside itself");
    target = files.find((x) => x.id === target?.parent);
  }
  let name = f.name;
  if (
    files.some(
      (x) => x.parent === parent && x.name === name && (copy || x.id !== id),
    )
  ) {
    if (!copy) throw Error("That name already exists");
    name = `${name} (copy)`;
  }
  if (copy) {
    const n = await create(parent, name, f.kind, f.content, f.mime);
    for (const child of files.filter((x) => x.parent === id))
      await transfer(child.id, n.id, true);
  } else await put({ ...f, parent, modified: Date.now() });
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
