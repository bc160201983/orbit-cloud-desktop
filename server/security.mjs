import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { db, settings } from "./database.mjs";
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password, stored) {
  if (typeof password !== "string" || password.length > 256) return false;
  const [salt, hash] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export function checkPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 128
  )
    throw Object.assign(
      Error("Use a password between 10 and 128 characters."),
      { status: 400 },
    );
}
const hashToken = (t) => createHash("sha256").update(t).digest("hex");
export function session(req, res, user) {
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    hashToken(token),
    user.id,
    Date.now() + 7 * 86400000,
  );
  res.cookie("orbit_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000,
    path: "/",
  });
  req.user = user;
}
export function sessionHash(req) {
  const token = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("orbit_session="))
    ?.slice(14);
  return token ? hashToken(token) : "";
}
export function identify(req, _res, next) {
  const row = db
    .prepare("SELECT user_id FROM sessions WHERE hash=? AND expires>?")
    .get(sessionHash(req), Date.now());
  req.user = row
    ? db.prepare("SELECT * FROM users WHERE id=?").get(row.user_id)
    : null;
  next();
}
export function auth(req, res, next) {
  if (!req.user || req.user.status !== "active")
    return res.status(401).json({ error: "Sign in to continue." });
  if (settings().maintenanceMode && req.user.role !== "admin")
    return res
      .status(503)
      .json({ error: "The workspace is temporarily in maintenance mode." });
  next();
}
export function admin(req, res, next) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Administrator access required." });
  next();
}
export function csrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    try {
      const expected = process.env.APP_ORIGIN
        ? new URL(process.env.APP_ORIGIN).origin
        : null;
      if (
        expected
          ? new URL(origin).origin !== expected
          : new URL(origin).host !== req.headers.host
      )
        return res
          .status(403)
          .json({ error: "Request origin is not allowed." });
    } catch {
      return res.status(403).json({ error: "Invalid origin." });
    }
  }
  if (req.headers["sec-fetch-site"] === "cross-site")
    return res.status(403).json({ error: "Cross-site request rejected." });
  if (!req.is("application/json") && !req.is("multipart/form-data"))
    return res.status(415).json({ error: "Use JSON or multipart form data." });
  next();
}
const buckets = new Map();
export function rateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  let item = buckets.get(key);
  if (!item || item.until < now) {
    item = { count: 0, until: now + 60000 };
    buckets.set(key, item);
  }
  item.count++;
  if (buckets.size > 10000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  if (item.count > 40)
    return res
      .status(429)
      .json({ error: "Too many attempts. Try again in a minute." });
  next();
}
export function fail(message, status = 400) {
  throw Object.assign(Error(message), { status });
}
export function validName(name) {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 180 ||
    /[\/\\\x00-\x1f]/.test(name)
  )
    fail("Enter a valid name without slashes.");
  return name.trim();
}
export function validEmail(value) {
  if (
    typeof value !== "string" ||
    value.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(value)
  )
    fail("Enter a valid email address.");
  return value.toLowerCase().trim();
}
