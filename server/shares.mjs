import { Router } from "express";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import path from "node:path";
import { db, settings, uploadDir, audit } from "./database.mjs";
import {
  auth,
  rateLimit,
  fail,
  hashPassword,
  verifyPassword,
  validEmail,
} from "./security.mjs";
import { ownedFile } from "./files.mjs";
db.exec(
  "CREATE TABLE IF NOT EXISTS grants(hash TEXT PRIMARY KEY,share_id TEXT REFERENCES shares(id) ON DELETE CASCADE,expires INTEGER NOT NULL)",
);
export const shareRouter = Router();
shareRouter.use(auth);
const listSql =
  "SELECT s.id,s.file_id,s.owner,s.token,s.recipient,s.expires,s.downloads,s.max_downloads,s.created,CASE WHEN s.password IS NOT NULL THEN 1 ELSE 0 END AS protected,f.name,f.size,f.mime,u.name AS ownerName,u.email AS ownerEmail FROM shares s JOIN files f ON f.id=s.file_id JOIN users u ON u.id=s.owner";
shareRouter.get("/", (req, res) =>
  res.json({
    shares: db
      .prepare(listSql + " WHERE s.owner=? ORDER BY s.created DESC")
      .all(req.user.id),
  }),
);
shareRouter.get("/incoming", (req, res) =>
  res.json({
    shares: db
      .prepare(
        listSql +
          " WHERE s.recipient=? AND f.trashed=0 AND u.status='active' AND (s.expires IS NULL OR s.expires>?) AND (s.max_downloads IS NULL OR s.downloads<s.max_downloads) ORDER BY s.created DESC",
      )
      .all(req.user.email, Date.now()),
  }),
);
shareRouter.post("/", (req, res) => {
  const f = ownedFile(req, req.body.fileId);
  if (f.kind !== "file")
    fail("Share individual files. Folder sharing is not supported yet.");
  const recipient = req.body.recipient ? validEmail(req.body.recipient) : null;
  if (!recipient && !settings().publicSharing)
    fail("Public links are disabled by the administrator.", 403);
  if (
    recipient &&
    !db
      .prepare("SELECT id FROM users WHERE email=? AND status='active'")
      .get(recipient)
  )
    fail("The recipient needs an active workspace account.", 404);
  if (recipient === req.user.email) fail("Choose another workspace member.");
  const expiry = req.body.expires ? Number(req.body.expires) : null;
  if (
    expiry !== null &&
    (!Number.isFinite(expiry) ||
      expiry <= Date.now() ||
      expiry > Date.now() + 365 * 86400000)
  )
    fail("Choose an expiry within the next year.");
  const max = req.body.maxDownloads ? Number(req.body.maxDownloads) : null;
  if (max !== null && (!Number.isInteger(max) || max < 1 || max > 1000000))
    fail("Enter a valid download limit.");
  const password = req.body.password;
  if (
    password &&
    (typeof password !== "string" ||
      password.length < 6 ||
      password.length > 128)
  )
    fail("Share passwords need 6–128 characters.");
  const id = randomUUID(),
    token = randomBytes(24).toString("hex");
  db.prepare("INSERT INTO shares VALUES(?,?,?,?,?,?,?,?,?,?)").run(
    id,
    f.id,
    req.user.id,
    token,
    recipient,
    expiry,
    password ? hashPassword(password) : null,
    0,
    max,
    Date.now(),
  );
  audit(req.user.id, "share.create", `${f.name} · ${recipient || "link"}`);
  res
    .status(201)
    .json({ share: db.prepare(listSql + " WHERE s.id=?").get(id) });
});
shareRouter.delete("/:id", (req, res) => {
  const s = db
    .prepare("SELECT * FROM shares WHERE id=? AND owner=?")
    .get(req.params.id, req.user.id);
  if (!s) fail("Share not found.", 404);
  db.prepare("DELETE FROM shares WHERE id=?").run(s.id);
  audit(req.user.id, "share.revoke", "Sharing access revoked");
  res.json({ ok: true });
});
export const publicRouter = Router();
function lookup(token) {
  const s = db
    .prepare(
      "SELECT s.*,f.name,f.size,f.mime,f.blob,f.trashed,u.status FROM shares s JOIN files f ON f.id=s.file_id JOIN users u ON u.id=s.owner WHERE s.token=?",
    )
    .get(token);
  if (
    !s ||
    s.trashed ||
    s.status !== "active" ||
    (s.expires && s.expires <= Date.now()) ||
    (s.max_downloads && s.downloads >= s.max_downloads)
  )
    fail(
      "This link is unavailable, expired, or has reached its download limit.",
      404,
    );
  if (!s.recipient && !settings().publicSharing)
    fail("Public sharing is currently disabled.", 403);
  if (settings().maintenanceMode)
    fail("The workspace is in maintenance mode.", 503);
  return s;
}
function recipientAccess(req, s) {
  if (
    s.recipient &&
    (!req.user ||
      req.user.email !== s.recipient ||
      req.user.status !== "active")
  )
    fail("Sign in with the invited account to access this file.", 403);
}
publicRouter.get("/:token", (req, res) => {
  const s = lookup(req.params.token);
  recipientAccess(req, s);
  res.json({
    name: s.name,
    size: s.size,
    mime: s.mime,
    protected: !!s.password,
    expires: s.expires,
    workspaceName: settings().workspaceName,
  });
});
publicRouter.post("/:token/access", rateLimit, (req, res) => {
  const s = lookup(req.params.token);
  recipientAccess(req, s);
  if (s.password && !verifyPassword(req.body.password, s.password))
    fail("The share password is incorrect.", 403);
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO grants VALUES(?,?,?)").run(
    createHash("sha256").update(token).digest("hex"),
    s.id,
    Date.now() + 600000,
  );
  res.cookie(`orbit_share_${s.token}`, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: `/api/public/${s.token}`,
    maxAge: 600000,
  });
  res.json({ ok: true });
});
publicRouter.get("/:token/download", (req, res) => {
  const s = lookup(req.params.token);
  recipientAccess(req, s);
  if (s.password) {
    const token =
      req.headers.cookie
        ?.split(";")
        .map((x) => x.trim())
        .find((x) => x.startsWith(`orbit_share_${s.token}=`))
        ?.split("=")[1] || "";
    const grant = db
      .prepare(
        "SELECT hash FROM grants WHERE hash=? AND share_id=? AND expires>?",
      )
      .get(createHash("sha256").update(token).digest("hex"), s.id, Date.now());
    if (!grant) fail("Unlock this file with its share password.", 403);
  }
  db.prepare("UPDATE shares SET downloads=downloads+1 WHERE id=?").run(s.id);
  audit(s.owner, "share.download", s.name);
  res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
  res.download(path.join(uploadDir, s.blob), s.name);
});
