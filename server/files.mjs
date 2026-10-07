import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { unlinkSync, existsSync, copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  db,
  settings,
  uploadDir,
  fileView,
  userView,
  audit,
} from "./database.mjs";
import { auth, fail, validName } from "./security.mjs";
export const fileRouter = Router();
fileRouter.use(auth);
export function ownedFile(req, id, allowTrash = false) {
  const f = db
    .prepare("SELECT * FROM files WHERE id=? AND owner=?")
    .get(id, req.user.id);
  if (!f || (!allowTrash && f.trashed)) fail("File not found.", 404);
  return f;
}
export function ensureParent(owner, parent) {
  if (!parent) return null;
  const f = db
    .prepare(
      "SELECT * FROM files WHERE id=? AND owner=? AND kind='folder' AND trashed=0",
    )
    .get(parent, owner);
  if (!f) fail("Destination folder not found.", 404);
  return parent;
}
export function uniqueName(owner, parent, name, exclude) {
  if (
    db
      .prepare(
        "SELECT id FROM files WHERE owner=? AND parent IS ? AND name=? AND trashed=0 AND id<>?",
      )
      .get(owner, parent, name, exclude || "")
  )
    fail("An item with this name already exists.", 409);
}
export function descendants(id) {
  const all = db.prepare("SELECT * FROM files").all();
  const result = [];
  const visit = (parent) => {
    for (const f of all.filter((f) => f.parent === parent)) {
      result.push(f);
      visit(f.id);
    }
  };
  visit(id);
  return result;
}
export function destroyFile(file) {
  for (const f of [...descendants(file.id)].reverse()) {
    if (f.blob && existsSync(path.join(uploadDir, f.blob)))
      unlinkSync(path.join(uploadDir, f.blob));
    db.prepare("DELETE FROM files WHERE id=?").run(f.id);
  }
  if (file.blob && existsSync(path.join(uploadDir, file.blob)))
    unlinkSync(path.join(uploadDir, file.blob));
  db.prepare("DELETE FROM files WHERE id=?").run(file.id);
}
export function purgeTrash() {
  const cutoff = Date.now() - settings().trashRetentionDays * 86400000;
  for (const f of db
    .prepare("SELECT * FROM files WHERE trashed=1 AND modified<?")
    .all(cutoff)) {
    if (db.prepare("SELECT id FROM files WHERE id=?").get(f.id)) destroyFile(f);
  }
}
fileRouter.get("/", (req, res) => {
  purgeTrash();
  res.json({
    files: db
      .prepare(
        "SELECT * FROM files WHERE owner=? ORDER BY kind DESC,name COLLATE NOCASE",
      )
      .all(req.user.id)
      .map(fileView),
    user: userView(req.user),
  });
});
fileRouter.post("/folder", (req, res) => {
  const parent = ensureParent(req.user.id, req.body.parent);
  const name = validName(req.body.name);
  uniqueName(req.user.id, parent, name);
  const id = randomUUID(),
    now = Date.now();
  db.prepare(
    "INSERT INTO files(id,owner,parent,name,kind,created,modified) VALUES(?,?,?,?,'folder',?,?)",
  ).run(id, req.user.id, parent, name, now, now);
  audit(req.user.id, "folder.create", name);
  res.status(201).json({
    file: fileView(db.prepare("SELECT * FROM files WHERE id=?").get(id)),
  });
});
// Text applications use the same private blobs and quota rules as uploads.
function textPayload(req, oldSize = 0) {
  if (typeof req.body.content !== "string") fail("Text content is required.");
  const data = Buffer.from(req.body.content, "utf8");
  if (data.length > Math.min(1048576, settings().maxUploadMB * 1048576))
    fail("Text documents must be under 1 MB.", 413);
  if (userView(req.user).used - oldSize + data.length > req.user.quota)
    fail("Storage quota exceeded.", 413);
  return data;
}
fileRouter.post("/text", (req, res) => {
  const name = validName(req.body.name);
  const parent = ensureParent(req.user.id, req.body.parent);
  uniqueName(req.user.id, parent, name);
  const allowed = settings()
    .allowedExtensions.split(",")
    .map((x) => x.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
  if (allowed.length && !allowed.includes(name.split(".").pop().toLowerCase()))
    fail("This file extension is not allowed.", 403);
  const data = textPayload(req),
    id = randomUUID(),
    blob = randomUUID(),
    now = Date.now();
  writeFileSync(path.join(uploadDir, blob), data, { mode: 0o600 });
  try {
    db.prepare(
      "INSERT INTO files(id,owner,parent,name,kind,mime,size,blob,created,modified) VALUES(?,?,?,?,'file','text/plain',?,?,?,?)",
    ).run(id, req.user.id, parent, name, data.length, blob, now, now);
  } catch (e) {
    unlinkSync(path.join(uploadDir, blob));
    throw e;
  }
  audit(req.user.id, "file.create", name);
  res
    .status(201)
    .json({
      file: fileView(db.prepare("SELECT * FROM files WHERE id=?").get(id)),
    });
});
fileRouter.put("/:id/content", (req, res) => {
  const f = ownedFile(req, req.params.id);
  if (
    f.kind !== "file" ||
    !(
      f.mime.startsWith("text/") ||
      /\.(txt|md|json|csv|js|ts|tsx|css|html|py|mjs)$/i.test(f.name)
    )
  )
    fail("This file is not an editable text document.");
  const data = textPayload(req, f.size),
    blob = randomUUID();
  writeFileSync(path.join(uploadDir, blob), data, { mode: 0o600 });
  try {
    db.prepare("UPDATE files SET blob=?,size=?,modified=? WHERE id=?").run(
      blob,
      data.length,
      Date.now(),
      f.id,
    );
  } catch (e) {
    unlinkSync(path.join(uploadDir, blob));
    throw e;
  }
  if (f.blob && existsSync(path.join(uploadDir, f.blob)))
    unlinkSync(path.join(uploadDir, f.blob));
  audit(req.user.id, "file.edit", f.name);
  res.json({
    file: fileView(db.prepare("SELECT * FROM files WHERE id=?").get(f.id)),
  });
});
fileRouter.post("/upload", (req, res, next) => {
  const limit = settings().maxUploadMB * 1048576;
  multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, _file, cb) => cb(null, randomUUID()),
    }),
    limits: { fileSize: limit, files: 1, fields: 2 },
  }).single("file")(req, res, (error) => {
    if (error) {
      if (req.file?.path && existsSync(req.file.path))
        unlinkSync(req.file.path);
      return next(
        Object.assign(
          Error(
            error.code === "LIMIT_FILE_SIZE"
              ? `Files must be under ${settings().maxUploadMB} MB.`
              : error.message,
          ),
          { status: 400 },
        ),
      );
    }
    try {
      if (!req.file) fail("Choose a file to upload.");
      const parent = ensureParent(req.user.id, req.body.parent || null);
      const name = validName(req.file.originalname);
      uniqueName(req.user.id, parent, name);
      const extensions = settings()
        .allowedExtensions.split(",")
        .map((x) => x.trim().toLowerCase().replace(/^\./, ""))
        .filter(Boolean);
      if (
        extensions.length &&
        !extensions.includes(name.split(".").pop().toLowerCase())
      )
        fail("This file extension is not allowed.", 403);
      const user = userView(req.user);
      if (user.used + req.file.size > user.quota)
        fail("Storage quota exceeded.", 413);
      const id = randomUUID(),
        now = Date.now();
      db.prepare(
        "INSERT INTO files(id,owner,parent,name,kind,mime,size,blob,created,modified) VALUES(?,?,?,?,'file',?,?,?,?,?)",
      ).run(
        id,
        req.user.id,
        parent,
        name,
        req.file.mimetype,
        req.file.size,
        req.file.filename,
        now,
        now,
      );
      audit(req.user.id, "file.upload", name);
      res.status(201).json({
        file: fileView(db.prepare("SELECT * FROM files WHERE id=?").get(id)),
      });
    } catch (e) {
      if (req.file?.path && existsSync(req.file.path))
        unlinkSync(req.file.path);
      next(e);
    }
  });
});

fileRouter.post("/:id/copy", (req, res) => {
  const f = ownedFile(req, req.params.id);
  const parent = ensureParent(
    f.owner,
    Object.hasOwn(req.body, "parent") ? req.body.parent : f.parent,
  );
  let ancestor = parent;
  while (ancestor) {
    if (ancestor === f.id) fail("Cannot copy a folder into itself.");
    ancestor = db
      .prepare("SELECT parent FROM files WHERE id=?")
      .get(ancestor)?.parent;
  }
  const items = [f, ...descendants(f.id).filter((x) => !x.trashed)];
  if (
    userView(req.user).used + items.reduce((n, x) => n + x.size, 0) >
    req.user.quota
  )
    fail("Storage quota exceeded.", 413);
  const dot = f.kind === "file" ? f.name.lastIndexOf(".") : -1;
  const extension = dot > 0 ? f.name.slice(dot) : "";
  const stem = dot > 0 ? f.name.slice(0, dot) : f.name;
  const makeName = (n) =>
    `${stem.slice(0, 155 - extension.length)} (copy${n > 1 ? " " + n : ""})${extension}`;
  let name = validName(req.body.name || makeName(1));
  let number = 1;
  while (
    db
      .prepare(
        "SELECT id FROM files WHERE owner=? AND parent IS ? AND name=? AND trashed=0",
      )
      .get(f.owner, parent, name)
  )
    name = makeName(++number);
  const ids = new Map();
  const blobs = [];
  db.exec("BEGIN");
  try {
    for (const x of items) {
      const id = randomUUID(),
        blob = x.blob ? randomUUID() : null;
      ids.set(x.id, id);
      if (blob) {
        copyFileSync(path.join(uploadDir, x.blob), path.join(uploadDir, blob));
        blobs.push(blob);
      }
      const now = Date.now();
      db.prepare(
        "INSERT INTO files(id,owner,parent,name,kind,mime,size,blob,created,modified) VALUES(?,?,?,?,?,?,?,?,?,?)",
      ).run(
        id,
        f.owner,
        x.id === f.id ? parent : ids.get(x.parent),
        x.id === f.id ? name : x.name,
        x.kind,
        x.mime,
        x.size,
        blob,
        now,
        now,
      );
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    for (const blob of blobs)
      if (existsSync(path.join(uploadDir, blob)))
        unlinkSync(path.join(uploadDir, blob));
    throw e;
  }
  audit(req.user.id, "file.copy", name);
  res.status(201).json({
    file: fileView(
      db.prepare("SELECT * FROM files WHERE id=?").get(ids.get(f.id)),
    ),
  });
});
fileRouter.patch("/:id", (req, res) => {
  const f = ownedFile(req, req.params.id, true);
  const patch = req.body;
  if ("starred" in patch) {
    db.prepare("UPDATE files SET starred=? WHERE id=?").run(
      patch.starred ? 1 : 0,
      f.id,
    );
  } else if ("trashed" in patch) {
    const trashed = !!patch.trashed;
    let parent = f.parent,
      name = f.name;
    if (!trashed) {
      const p = parent
        ? db.prepare("SELECT * FROM files WHERE id=?").get(parent)
        : null;
      if (!p || p.trashed) parent = null;
      while (
        db
          .prepare(
            "SELECT id FROM files WHERE owner=? AND parent IS ? AND name=? AND trashed=0 AND id<>?",
          )
          .get(f.owner, parent, name, f.id)
      )
        name = `${name} (restored)`;
    }
    const tx = [f, ...descendants(f.id)];
    db.exec("BEGIN");
    try {
      for (const x of tx)
        db.prepare("UPDATE files SET trashed=?,modified=? WHERE id=?").run(
          trashed ? 1 : 0,
          Date.now(),
          x.id,
        );
      db.prepare("UPDATE files SET parent=?,name=? WHERE id=?").run(
        parent,
        name,
        f.id,
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    if (trashed)
      for (const x of tx)
        db.prepare("DELETE FROM shares WHERE file_id=?").run(x.id);
    audit(req.user.id, trashed ? "file.trash" : "file.restore", f.name);
  } else {
    if (f.trashed) fail("Restore the item before editing.");
    const name = "name" in patch ? validName(patch.name) : f.name;
    const parent =
      "parent" in patch ? ensureParent(f.owner, patch.parent) : f.parent;
    let ancestor = parent;
    while (ancestor) {
      if (ancestor === f.id) fail("A folder cannot be moved into itself.");
      ancestor = db
        .prepare("SELECT parent FROM files WHERE id=?")
        .get(ancestor)?.parent;
    }
    uniqueName(f.owner, parent, name, f.id);
    db.prepare("UPDATE files SET name=?,parent=?,modified=? WHERE id=?").run(
      name,
      parent,
      Date.now(),
      f.id,
    );
    audit(req.user.id, "file.update", `${f.name} → ${name}`);
  }
  res.json({
    file: fileView(db.prepare("SELECT * FROM files WHERE id=?").get(f.id)),
  });
});
fileRouter.delete("/:id", (req, res) => {
  const f = ownedFile(req, req.params.id, true);
  if (!f.trashed) fail("Move the item to Trash before deleting permanently.");
  destroyFile(f);
  audit(req.user.id, "file.delete", f.name);
  res.json({ ok: true });
});
fileRouter.get("/:id/download", (req, res) => {
  const f = ownedFile(req, req.params.id);
  if (f.kind !== "file" || !f.blob) fail("This is a folder.");
  res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
  res.download(path.join(uploadDir, f.blob), f.name);
});
fileRouter.get("/:id/preview", (req, res) => {
  const f = ownedFile(req, req.params.id);
  if (f.kind !== "file" || !f.blob) fail("This is a folder.");
  const safe =
    (f.mime.startsWith("image/") && !f.mime.includes("svg")) ||
    f.mime.startsWith("audio/") ||
    f.mime.startsWith("video/");
  res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
  res.setHeader("Content-Type", safe ? f.mime : "text/plain; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(path.join(uploadDir, f.blob));
});
fileRouter.get("/activity/recent", (req, res) => {
  res.json({
    activity: db
      .prepare(
        "SELECT action,detail,created FROM audit WHERE actor=? ORDER BY created DESC LIMIT 30",
      )
      .all(req.user.id),
  });
});
