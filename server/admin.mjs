import { Router } from "express";
import {
  db,
  settings,
  defaults,
  userView,
  fileView,
  audit,
} from "./database.mjs";
import {
  auth,
  admin,
  fail,
  validName,
  checkPassword,
  hashPassword,
} from "./security.mjs";
import { destroyFile, purgeTrash } from "./files.mjs";
export const adminRouter = Router();
adminRouter.use(auth, admin);
adminRouter.get("/overview", (_req, res) => {
  purgeTrash();
  res.json({
    stats: {
      users: db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
      files: db
        .prepare("SELECT COUNT(*) AS n FROM files WHERE kind='file'")
        .get().n,
      storage: db.prepare("SELECT COALESCE(SUM(size),0) AS n FROM files").get()
        .n,
      shares: db.prepare("SELECT COUNT(*) AS n FROM shares").get().n,
    },
    settings: settings(),
    users: db
      .prepare("SELECT * FROM users ORDER BY created DESC")
      .all()
      .map(userView),
    activity: db
      .prepare(
        "SELECT a.*,u.name AS actorName FROM audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.created DESC LIMIT 100",
      )
      .all(),
    files: db
      .prepare(
        "SELECT f.*,u.name AS ownerName,u.email AS ownerEmail FROM files f JOIN users u ON f.owner=u.id ORDER BY f.modified DESC LIMIT 200",
      )
      .all()
      .map(fileView),
    shares: db
      .prepare(
        "SELECT s.id,s.created,s.downloads,s.expires,s.recipient,f.name,u.name AS ownerName FROM shares s JOIN files f ON f.id=s.file_id JOIN users u ON u.id=s.owner ORDER BY s.created DESC",
      )
      .all(),
  });
});
adminRouter.patch("/settings", (req, res) => {
  const changes = {};
  for (const [key, value] of Object.entries(req.body)) {
    if (!Object.hasOwn(defaults, key)) fail("Unknown setting.");
    if (typeof defaults[key] === "boolean" && typeof value !== "boolean")
      fail("Invalid setting value.");
    if (
      typeof defaults[key] === "number" &&
      (!Number.isInteger(value) ||
        value < 1 ||
        value >
          (key === "trashRetentionDays"
            ? 365
            : key === "maxUploadMB"
              ? 1024
              : 1048576))
    )
      fail("Enter a valid setting limit.");
    if (key === "workspaceName") validName(value);
    if (key === "tagline" && (typeof value !== "string" || value.length > 140))
      fail("Tagline must be under 140 characters.");
    if (
      key === "allowedExtensions" &&
      (typeof value !== "string" ||
        value.length > 500 ||
        !/^([a-zA-Z0-9., ]*)$/.test(value))
    )
      fail("Use comma-separated file extensions.");
    changes[key] = value;
  }
  db.exec("BEGIN");
  try {
    for (const [key, value] of Object.entries(changes))
      db.prepare("UPDATE settings SET value=? WHERE key=?").run(
        JSON.stringify(value),
        key,
      );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  audit(req.user.id, "admin.settings", Object.keys(changes).join(", "));
  res.json({ settings: settings() });
});
adminRouter.patch("/users/:id", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!user) fail("User not found.", 404);
  const role = req.body.role ?? user.role,
    status = req.body.status ?? user.status,
    quota = req.body.quota ?? user.quota;
  if (
    !["user", "admin"].includes(role) ||
    !["active", "suspended"].includes(status) ||
    !Number.isSafeInteger(quota) ||
    quota < 1048576 ||
    quota > 1099511627776
  )
    fail("Invalid account settings.");
  if (req.body.password) {
    if (user.id === req.user.id)
      fail("Change your own password in Account settings.");
    checkPassword(req.body.password);
  }
  if (user.id === req.user.id && (role !== "admin" || status !== "active"))
    fail("You cannot remove your own administrator access.");
  db.prepare("UPDATE users SET role=?,status=?,quota=? WHERE id=?").run(
    role,
    status,
    quota,
    user.id,
  );
  if (req.body.password)
    db.prepare("UPDATE users SET password=? WHERE id=?").run(
      hashPassword(req.body.password),
      user.id,
    );
  if (status === "suspended" || req.body.password)
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
  audit(req.user.id, "admin.user", `${user.email}: ${role}, ${status}`);
  res.json({
    user: userView(db.prepare("SELECT * FROM users WHERE id=?").get(user.id)),
  });
});
adminRouter.delete("/files/:id", (req, res) => {
  const f = db.prepare("SELECT * FROM files WHERE id=?").get(req.params.id);
  if (!f) fail("File not found.", 404);
  destroyFile(f);
  audit(req.user.id, "admin.file.delete", f.name);
  res.json({ ok: true });
});
adminRouter.delete("/shares/:id", (req, res) => {
  db.prepare("DELETE FROM shares WHERE id=?").run(req.params.id);
  audit(req.user.id, "admin.share.revoke", req.params.id);
  res.json({ ok: true });
});
