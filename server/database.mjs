import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
export const dataDir = path.resolve(process.env.ORBIT_DATA_DIR || ".orbit");
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
export const uploadDir = path.join(dataDir, "uploads");
mkdirSync(uploadDir, { recursive: true, mode: 0o700 });
export const db = new DatabaseSync(path.join(dataDir, "orbit.sqlite"));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',status TEXT NOT NULL DEFAULT 'active',quota INTEGER NOT NULL,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),parent TEXT REFERENCES files(id),name TEXT NOT NULL,kind TEXT NOT NULL,mime TEXT NOT NULL DEFAULT '',size INTEGER NOT NULL DEFAULT 0,blob TEXT,starred INTEGER NOT NULL DEFAULT 0,trashed INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,modified INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS shares(id TEXT PRIMARY KEY,file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,owner TEXT NOT NULL REFERENCES users(id),token TEXT UNIQUE NOT NULL,recipient TEXT,expires INTEGER,password TEXT,downloads INTEGER NOT NULL DEFAULT 0,max_downloads INTEGER,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor TEXT,action TEXT NOT NULL,detail TEXT NOT NULL,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS files_owner ON files(owner);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS audit_created ON audit(created);
`);
export const defaults = {
  workspaceName: "Orbit",
  tagline: "Your files. A little more connected.",
  registrationEnabled: true,
  publicSharing: true,
  maintenanceMode: false,
  defaultQuotaMB: 2048,
  maxUploadMB: 100,
  trashRetentionDays: 30,
  allowedExtensions: "",
};
for (const [key, value] of Object.entries(defaults))
  db.prepare("INSERT OR IGNORE INTO settings VALUES(?,?)").run(
    key,
    JSON.stringify(value),
  );
export function settings() {
  return Object.fromEntries(
    db
      .prepare("SELECT * FROM settings")
      .all()
      .map((r) => [r.key, JSON.parse(r.value)]),
  );
}
export function audit(actor, action, detail) {
  db.prepare("INSERT INTO audit VALUES(?,?,?,?,?)").run(
    randomUUID(),
    actor,
    action,
    detail.slice(0, 500),
    Date.now(),
  );
}
export function userView(u) {
  if (!u) return null;
  const used = db
    .prepare(
      "SELECT COALESCE(SUM(size),0) AS total FROM files WHERE owner=? AND kind='file'",
    )
    .get(u.id).total;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    quota: u.quota,
    used,
    created: u.created,
  };
}
export function fileView(f) {
  return { ...f, starred: !!f.starred, trashed: !!f.trashed, blob: undefined };
}
export const setupToken = (() => {
  if (process.env.ORBIT_SETUP_TOKEN) return process.env.ORBIT_SETUP_TOKEN;
  const file = path.join(dataDir, "setup-token");
  if (!existsSync(file))
    writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
  return readFileSync(file, "utf8").trim();
})();
