import { writeFileSync } from "node:fs";
const input = process.argv[2];
let backend;
try {
  backend = new URL(input);
  if (
    backend.protocol !== "https:" ||
    backend.username ||
    backend.password ||
    backend.pathname !== "/" ||
    backend.search ||
    backend.hash ||
    ["localhost", "127.0.0.1", "::1"].includes(backend.hostname) ||
    backend.hostname.endsWith(".vercel.app")
  )
    throw Error();
} catch {
  console.error(
    "Usage: npm run configure:vercel -- https://your-node-backend.example\nProvide the HTTPS origin of your persistent Node backend, without a path or credentials.",
  );
  process.exit(1);
}
const config = {
  framework: "vite",
  buildCommand: "npm run build",
  outputDirectory: "dist",
  rewrites: [
    { source: "/api/:path*", destination: `${backend.origin}/api/:path*` },
    { source: "/s/:token", destination: "/index.html" },
  ],
};
writeFileSync(
  new URL("../vercel.json", import.meta.url),
  JSON.stringify(config, null, 2) + "\n",
);
console.log(
  `Vercel API forwarding configured for ${backend.origin}.\nSet APP_ORIGIN on the backend to your exact Vercel HTTPS origin, then commit vercel.json and redeploy Vercel.`,
);
