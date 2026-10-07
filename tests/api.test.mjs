import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
const data = mkdtempSync(`${tmpdir()}/orbit-api-test-`);
const token = randomBytes(32).toString("hex");
const password = randomBytes(16).toString("hex");
const origin = "http://127.0.0.1:3198";
let server,
  admin = "",
  alice = "",
  bob = "",
  file,
  share,
  protectedShare,
  copiedFile;
async function call(
  path,
  { method = "GET", body, cookie, form, headers = {} } = {},
) {
  const r = await fetch(origin + "/api" + path, {
    method,
    headers: {
      ...(!form ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: form || (body !== undefined && JSON.stringify(body)) || undefined,
  });
  const text = await r.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = text;
  }
  return {
    status: r.status,
    data: result,
    cookie: r.headers.get("set-cookie")?.split(";")[0],
    headers: r.headers,
  };
}
before(async () => {
  server = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      PORT: "3198",
      HOST: "127.0.0.1",
      ORBIT_DATA_DIR: data,
      ORBIT_SETUP_TOKEN: token,
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await call("/health")).status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  throw Error("API did not start");
});
after(async () => {
  if (server?.exitCode === null)
    await new Promise((resolve) => {
      server.once("exit", resolve);
      server.kill("SIGTERM");
    });
  rmSync(data, { recursive: true, force: true });
});
test("administrator initialization requires one-time server token", async () => {
  assert.equal(
    (
      await call("/auth/setup", {
        method: "POST",
        body: {
          name: "Admin",
          email: "admin@example.test",
          password,
          token: "invalid",
        },
      })
    ).status,
    403,
  );
  const r = await call("/auth/setup", {
    method: "POST",
    body: { name: "Admin", email: "admin@example.test", password, token },
  });
  assert.equal(r.status, 201);
  admin = r.cookie;
  assert.equal(r.data.user.role, "admin");
  assert.equal(
    (
      await call("/auth/setup", {
        method: "POST",
        body: { name: "Admin", email: "root@example.test", password, token },
      })
    ).status,
    409,
  );
});
test("member accounts use private sessions and cannot access admin APIs", async () => {
  let r = await call("/auth/register", {
    method: "POST",
    body: { name: "Alice", email: "alice@example.test", password },
  });
  assert.equal(r.status, 201);
  alice = r.cookie;
  r = await call("/auth/register", {
    method: "POST",
    body: { name: "Bob", email: "bob@example.test", password },
  });
  assert.equal(r.status, 201);
  bob = r.cookie;
  assert.equal((await call("/admin/overview", { cookie: alice })).status, 403);
  assert.equal((await call("/files")).status, 401);
  assert.equal(
    (
      await call("/auth/login", {
        method: "POST",
        body: { email: "alice@example.test", password: "wrong" },
      })
    ).status,
    401,
  );
  const settings = (await call("/admin/overview", { cookie: admin })).data
    .settings;
  assert.equal(settings.defaultQuotaMB, 2048);
  assert.equal(
    (
      await call("/auth/profile", {
        method: "PATCH",
        cookie: alice,
        body: { name: "Mallory" },
        headers: { Origin: "https://evil.test" },
      })
    ).status,
    403,
  );
});
test("uploads persist, are private and enforce valid parent/name constraints", async () => {
  const form = new FormData();
  form.append(
    "file",
    new Blob(["hello hosted orbit"], { type: "text/plain" }),
    "welcome.txt",
  );
  const r = await call("/files/upload", {
    method: "POST",
    cookie: alice,
    form,
  });
  assert.equal(r.status, 201);
  file = r.data.file;
  assert.equal(file.size, 18);
  assert.equal(
    (await call(`/files/${file.id}/download`, { cookie: bob })).status,
    404,
  );
  const download = await call(`/files/${file.id}/download`, { cookie: alice });
  assert.equal(download.data, "hello hosted orbit");
  assert.match(download.headers.get("content-disposition"), /attachment/);
  const list = (await call("/files", { cookie: alice })).data;
  assert.equal(list.user.used, 18);
  assert.ok(list.files.some((f) => f.id === file.id));
  const folder = (
    await call("/files/folder", {
      method: "POST",
      cookie: alice,
      body: { name: "Work" },
    })
  ).data.file;
  assert.equal(
    (
      await call(`/files/${folder.id}`, {
        method: "PATCH",
        cookie: alice,
        body: { parent: folder.id },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(`/files/${file.id}`, {
        method: "PATCH",
        cookie: bob,
        body: { name: "stolen.txt" },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call(`/files/${file.id}`, {
        method: "PATCH",
        cookie: alice,
        body: { name: "../escape" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(`/files/${file.id}`, {
        method: "PATCH",
        cookie: alice,
        body: { parent: folder.id, name: "project.txt", starred: true },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(`/files/${file.id}`, {
        method: "PATCH",
        cookie: alice,
        body: { parent: folder.id, name: "project.txt" },
      })
    ).status,
    200,
  );
});
test("public, protected, expiring and member-only shares enforce permissions", async () => {
  let r = await call("/shares", {
    method: "POST",
    cookie: alice,
    body: { fileId: file.id, maxDownloads: 1 },
  });
  assert.equal(r.status, 201);
  share = r.data.share;
  assert.equal((await call(`/public/${share.token}`)).status, 200);
  assert.equal(
    (await call(`/public/${share.token}/download`)).data,
    "hello hosted orbit",
  );
  assert.equal((await call(`/public/${share.token}/download`)).status, 404);
  r = await call("/shares", {
    method: "POST",
    cookie: alice,
    body: { fileId: file.id, password, expires: Date.now() + 60000 },
  });
  assert.equal(r.status, 201);
  protectedShare = r.data.share;
  assert.equal(
    (await call(`/public/${protectedShare.token}/download`)).status,
    403,
  );
  assert.equal(
    (
      await call(`/public/${protectedShare.token}/access`, {
        method: "POST",
        body: { password: "wrong" },
      })
    ).status,
    403,
  );
  const access = await call(`/public/${protectedShare.token}/access`, {
    method: "POST",
    body: { password },
  });
  assert.equal(access.status, 200);
  assert.equal(
    (
      await call(`/public/${protectedShare.token}/download`, {
        cookie: access.cookie,
      })
    ).status,
    200,
  );
  r = await call("/shares", {
    method: "POST",
    cookie: alice,
    body: { fileId: file.id, recipient: "bob@example.test" },
  });
  assert.equal(r.status, 201);
  assert.equal((await call(`/public/${r.data.share.token}`)).status, 403);
  assert.equal(
    (await call(`/public/${r.data.share.token}`, { cookie: bob })).status,
    200,
  );
  assert.equal(
    (await call("/shares/incoming", { cookie: bob })).data.shares.length,
    1,
  );
  assert.equal(
    (
      await call("/shares", {
        method: "POST",
        cookie: alice,
        body: { fileId: file.id, expires: Date.now() - 1 },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(`/shares/${protectedShare.id}`, {
        method: "DELETE",
        cookie: alice,
        body: {},
      })
    ).status,
    200,
  );
  assert.equal((await call(`/public/${protectedShare.token}`)).status, 404);
});
test("hosted editor creates and updates private files with quota and share consistency", async () => {
  const folders = (await call("/files", { cookie: alice })).data.files;
  const documents = folders.find(
    (f) => f.kind === "folder" && f.name === "Documents",
  );
  const created = await call("/files/text", {
    cookie: alice,
    method: "POST",
    body: { parent: documents.id, name: "editor.txt", content: "Original 🌍" },
  });
  assert.equal(created.status, 201);
  const id = created.data.file.id;
  assert.equal(created.data.file.size, Buffer.byteLength("Original 🌍"));
  assert.equal(
    (
      await call(`/files/${id}/content`, {
        cookie: bob,
        method: "PUT",
        body: { content: "intrusion" },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call("/files/text", {
        cookie: bob,
        method: "POST",
        body: { parent: documents.id, name: "intrusion.txt", content: "bad" },
      })
    ).status,
    404,
  );
  const link = await call("/shares", {
    cookie: alice,
    method: "POST",
    body: { fileId: id },
  });
  assert.equal(link.status, 201);
  assert.equal(
    (
      await call(`/files/${id}/content`, {
        cookie: alice,
        method: "PUT",
        body: { content: "Saved from desktop" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(`/public/${link.data.share.token}/download`)).data,
    "Saved from desktop",
  );
  assert.equal(
    (
      await call(`/files/${id}/content`, {
        cookie: alice,
        method: "PUT",
        body: { content: "x".repeat(1048577) },
      })
    ).status,
    413,
  );
  assert.equal(
    (await call(`/files/${id}/download`, { cookie: alice })).data,
    "Saved from desktop",
  );
  const copy = await call(`/files/${id}/copy`, {
    cookie: alice,
    method: "POST",
    body: { parent: null, name: "terminal-copy.txt" },
  });
  assert.equal(copy.status, 201);
  assert.equal(
    (await call(`/files/${copy.data.file.id}/download`, { cookie: alice }))
      .data,
    "Saved from desktop",
  );
  const user = (await call("/files", { cookie: alice })).data.user;
  await call(`/admin/users/${user.id}`, {
    cookie: admin,
    method: "PATCH",
    body: { quota: 1048576 },
  });
  const denied = await call(`/files/${id}/content`, {
    cookie: alice,
    method: "PUT",
    body: { content: "x".repeat(1048576) },
  });
  assert.equal(denied.status, 413);
  assert.equal(
    (await call(`/files/${id}/download`, { cookie: alice })).data,
    "Saved from desktop",
  );
});
test("admin policies, quota, suspension, trash and auditing are enforced", async () => {
  assert.equal(
    (
      await call("/admin/settings", {
        method: "PATCH",
        cookie: admin,
        body: {
          registrationEnabled: false,
          publicSharing: false,
          allowedExtensions: "txt",
          maxUploadMB: 1,
        },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call("/auth/register", {
        method: "POST",
        body: { name: "Closed", email: "closed@example.test", password },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("/shares", {
        method: "POST",
        cookie: alice,
        body: { fileId: file.id },
      })
    ).status,
    403,
  );
  const bad = new FormData();
  bad.append("file", new Blob(["not allowed"]), "bad.exe");
  assert.equal(
    (await call("/files/upload", { method: "POST", cookie: alice, form: bad }))
      .status,
    403,
  );
  const overview = (await call("/admin/overview", { cookie: admin })).data;
  const aliceUser = overview.users.find(
    (u) => u.email === "alice@example.test",
  );
  assert.equal(
    (
      await call(`/admin/users/${aliceUser.id}`, {
        method: "PATCH",
        cookie: admin,
        body: { quota: 1048576 },
      })
    ).status,
    200,
  );
  const large = new FormData();
  large.append("file", new Blob([new Uint8Array(1048576)]), "large.txt");
  assert.equal(
    (
      await call("/files/upload", {
        method: "POST",
        cookie: alice,
        form: large,
      })
    ).status,
    413,
  );
  assert.equal(
    (
      await call(`/files/${file.id}`, {
        method: "PATCH",
        cookie: alice,
        body: { trashed: true },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(`/files/${file.id}/download`, { cookie: alice })).status,
    404,
  );
  assert.equal(
    (await call("/shares/incoming", { cookie: bob })).data.shares.length,
    0,
  );
  assert.equal(
    (
      await call(`/files/${file.id}`, {
        method: "PATCH",
        cookie: alice,
        body: { trashed: false },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(`/files/${file.id}/download`, { cookie: alice })).status,
    200,
  );
  assert.equal(
    (
      await call(`/admin/users/${aliceUser.id}`, {
        method: "PATCH",
        cookie: admin,
        body: { status: "suspended" },
      })
    ).status,
    200,
  );
  assert.equal((await call("/files", { cookie: alice })).status, 401);
  assert.equal(
    (
      await call("/auth/login", {
        method: "POST",
        body: { email: "alice@example.test", password },
      })
    ).status,
    403,
  );
  assert.ok(overview.activity.some((a) => a.action === "file.upload"));
  assert.equal(
    (
      await call(
        `/admin/users/${overview.users.find((u) => u.role === "admin").id}`,
        { method: "PATCH", cookie: admin, body: { role: "user" } },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(`/admin/files/${file.id}`, {
        method: "DELETE",
        cookie: admin,
        body: {},
      })
    ).status,
    200,
  );
});

test("recursive copies stay private and administrator password resets revoke sessions", async () => {
  const overview = (await call("/admin/overview", { cookie: admin })).data;
  const user = overview.users.find((u) => u.email === "alice@example.test");
  await call(`/admin/users/${user.id}`, {
    method: "PATCH",
    cookie: admin,
    body: { status: "active" },
  });
  alice = (
    await call("/auth/login", {
      method: "POST",
      body: { email: user.email, password },
    })
  ).cookie;
  const nested = (
    await call("/files/folder", {
      method: "POST",
      cookie: alice,
      body: { name: "Source folder" },
    })
  ).data.file;
  const form = new FormData();
  form.append(
    "file",
    new Blob(["Persistent original"], { type: "text/plain" }),
    "persist.txt",
  );
  form.append("parent", nested.id);
  const original = (
    await call("/files/upload", { method: "POST", cookie: alice, form })
  ).data.file;
  assert.equal(
    (
      await call(`/files/${nested.id}/copy`, {
        method: "POST",
        cookie: alice,
        body: { parent: nested.id },
      })
    ).status,
    400,
  );
  const copied = await call(`/files/${nested.id}/copy`, {
    method: "POST",
    cookie: alice,
    body: { parent: null },
  });
  assert.equal(copied.status, 201);
  const files = (await call("/files", { cookie: alice })).data.files;
  copiedFile = files.find(
    (f) => f.parent === copied.data.file.id && f.kind === "file",
  );
  assert.ok(copiedFile);
  assert.equal(
    (await call(`/files/${copiedFile.id}/download`, { cookie: alice })).data,
    "Persistent original",
  );
  assert.equal(
    (await call(`/files/${copiedFile.id}/download`, { cookie: bob })).status,
    404,
  );
  const bobUser = overview.users.find((u) => u.email === "bob@example.test");
  const replacement = randomBytes(16).toString("hex");
  assert.equal(
    (
      await call(`/admin/users/${bobUser.id}`, {
        method: "PATCH",
        cookie: admin,
        body: { password: replacement },
      })
    ).status,
    200,
  );
  assert.equal((await call("/files", { cookie: bob })).status, 401);
  assert.equal(
    (
      await call("/auth/login", {
        method: "POST",
        body: { email: bobUser.email, password: replacement },
      })
    ).status,
    200,
  );
});
test("accounts, policies, sessions and file bytes survive server restart", async () => {
  await new Promise((resolve) => {
    server.once("exit", resolve);
    server.kill("SIGTERM");
  });
  server = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      PORT: "3198",
      HOST: "127.0.0.1",
      ORBIT_DATA_DIR: data,
      ORBIT_SETUP_TOKEN: token,
    },
    stdio: "ignore",
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await call("/health")).status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.ok(ready);
  assert.equal(
    (await call("/auth/status", { cookie: admin })).data.user.role,
    "admin",
  );
  assert.equal(
    (await call("/admin/overview", { cookie: admin })).data.settings
      .registrationEnabled,
    false,
  );
  assert.equal(
    (await call(`/files/${copiedFile.id}/download`, { cookie: alice })).data,
    "Persistent original",
  );
});
