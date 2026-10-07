import { Router } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { db, settings, setupToken, userView, audit } from "./database.mjs";
import {
  session,
  sessionHash,
  hashPassword,
  verifyPassword,
  checkPassword,
  auth,
  rateLimit,
  validEmail,
  validName,
  fail,
} from "./security.mjs";
export const authRouter = Router();
authRouter.get("/status", (req, res) => {
  const s = settings();
  res.json({
    initialized: !!db.prepare("SELECT id FROM users LIMIT 1").get(),
    workspaceName: s.workspaceName,
    tagline: s.tagline,
    registrationEnabled: s.registrationEnabled,
    maintenanceMode: s.maintenanceMode,
    user: req.user?.status === "active" ? userView(req.user) : null,
  });
});
function createUser(body, role) {
  const email = validEmail(body.email);
  const name = validName(body.name);
  checkPassword(body.password);
  if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
    fail("An account with this email already exists.", 409);
  const id = randomUUID();
  db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?,?,?)").run(
    id,
    email,
    name,
    hashPassword(body.password),
    role,
    "active",
    settings().defaultQuotaMB * 1048576,
    Date.now(),
  );
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  for (const name of [
    "Documents",
    "Pictures",
    "Music",
    "Videos",
    "Downloads",
  ]) {
    const now = Date.now();
    db.prepare(
      "INSERT INTO files(id,owner,parent,name,kind,created,modified) VALUES(?,?,NULL,?,?,?,?)",
    ).run(randomUUID(), id, name, "folder", now, now);
  }
  return user;
}
authRouter.post("/setup", rateLimit, (req, res) => {
  if (db.prepare("SELECT id FROM users LIMIT 1").get())
    fail("Workspace is already initialized.", 409);
  const supplied = Buffer.from(String(req.body.token || ""));
  const expected = Buffer.from(setupToken);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    fail("The setup token is incorrect.", 403);
  const user = createUser(req.body, "admin");
  session(req, res, user);
  audit(user.id, "workspace.setup", "Initial administrator created");
  res.status(201).json({ user: userView(user) });
});
authRouter.post("/register", rateLimit, (req, res) => {
  if (!db.prepare("SELECT id FROM users LIMIT 1").get())
    fail("An administrator must initialize the workspace first.", 403);
  if (!settings().registrationEnabled || settings().maintenanceMode)
    fail("Registration is currently closed.", 403);
  const user = createUser(req.body, "user");
  session(req, res, user);
  audit(user.id, "account.register", "Account created");
  res.status(201).json({ user: userView(user) });
});
authRouter.post("/login", rateLimit, (req, res) => {
  const email = validEmail(req.body.email);
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!user || !verifyPassword(req.body.password, user.password))
    fail("Email or password is incorrect.", 401);
  if (user.status !== "active")
    fail("This account has been suspended. Contact your administrator.", 403);
  if (settings().maintenanceMode && user.role !== "admin")
    fail("The workspace is in maintenance mode.", 503);
  session(req, res, user);
  audit(user.id, "account.login", "Signed in");
  res.json({ user: userView(user) });
});
authRouter.post("/logout", (req, res) => {
  db.prepare("DELETE FROM sessions WHERE hash=?").run(sessionHash(req));
  res.clearCookie("orbit_session", { path: "/" });
  res.json({ ok: true });
});
authRouter.patch("/profile", auth, (req, res) => {
  const name = validName(req.body.name);
  db.prepare("UPDATE users SET name=? WHERE id=?").run(name, req.user.id);
  res.json({
    user: userView(
      db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id),
    ),
  });
});
authRouter.post("/password", auth, rateLimit, (req, res) => {
  if (!verifyPassword(req.body.currentPassword, req.user.password))
    fail("Current password is incorrect.", 403);
  checkPassword(req.body.password);
  db.prepare("UPDATE users SET password=? WHERE id=?").run(
    hashPassword(req.body.password),
    req.user.id,
  );
  db.prepare("DELETE FROM sessions WHERE user_id=?").run(req.user.id);
  session(req, res, req.user);
  audit(
    req.user.id,
    "account.password",
    "Password changed; other sessions revoked",
  );
  res.json({ ok: true });
});
