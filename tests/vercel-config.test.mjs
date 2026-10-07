import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "orbit-vercel-config-"));
  mkdirSync(join(root, "scripts"));
  const script = join(root, "scripts/configure-vercel.mjs");
  copyFileSync("scripts/configure-vercel.mjs", script);
  return { root, script };
}
test("Vercel configuration forwards API and preserves public share routes", () => {
  const { root, script } = fixture();
  try {
    const result = spawnSync(
      process.execPath,
      [script, "https://orbit-backend.example/"],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0);
    const config = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    assert.equal(config.outputDirectory, "dist");
    assert.deepEqual(config.rewrites, [
      {
        source: "/api/:path*",
        destination: "https://orbit-backend.example/api/:path*",
      },
      { source: "/s/:token", destination: "/index.html" },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("invalid origins cannot overwrite an existing Vercel configuration", () => {
  const { root, script } = fixture();
  try {
    const file = join(root, "vercel.json");
    writeFileSync(file, "existing configuration");
    for (const input of [
      "http://backend.example",
      "https://localhost",
      "https://user:secret@backend.example",
      "https://backend.example/api",
      "https://orbit.vercel.app",
      undefined,
    ]) {
      const result = spawnSync(
        process.execPath,
        [script, ...(input ? [input] : [])],
        { encoding: "utf8" },
      );
      assert.equal(result.status, 1);
      assert.equal(readFileSync(file, "utf8"), "existing configuration");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
