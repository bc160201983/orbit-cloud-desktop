import { rmSync } from "node:fs";
export default function teardown() {
  if (process.env.ORBIT_TEST_DATA_DIR?.startsWith("/tmp/orbit-browser-test-"))
    rmSync(process.env.ORBIT_TEST_DATA_DIR, { recursive: true, force: true });
}
