import express from "express";
import helmet from "helmet";
import path from "node:path";
import { existsSync } from "node:fs";
import { db } from "./database.mjs";
import { csrf, identify } from "./security.mjs";
import { authRouter } from "./auth.mjs";
import { fileRouter, purgeTrash } from "./files.mjs";
import { shareRouter, publicRouter } from "./shares.mjs";
import { adminRouter } from "./admin.mjs";
const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'", "blob:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", "https:"],
        upgradeInsecureRequests:
          process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use("/api", express.json({ limit: "2mb" }), csrf, identify);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/files", fileRouter);
app.use("/api/shares", shareRouter);
app.use("/api/public", publicRouter);
app.use("/api/admin", adminRouter);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Endpoint not found." }),
);
const dist = path.resolve("dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
}
app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error("Request failed:", error.message);
  res.status(status).json({
    error:
      status >= 500 ? "The operation failed. Please try again." : error.message,
  });
});
purgeTrash();
const cleanup = setInterval(() => {
  db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  db.prepare("DELETE FROM grants WHERE expires<?").run(Date.now());
  purgeTrash();
}, 3600000);
cleanup.unref();
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, process.env.HOST || "0.0.0.0", () =>
  console.log(
    `Orbit API listening on port ${port}. Setup requires ORBIT_SETUP_TOKEN or the private .orbit/setup-token file.`,
  ),
);
process.on("SIGTERM", () =>
  server.close(() => {
    db.close();
    process.exit(0);
  }),
);
