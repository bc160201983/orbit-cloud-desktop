export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const form = options.body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(!form ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const deployment = location.hostname.endsWith(".vercel.app")
      ? " This Vercel deployment needs a separately hosted backend. Deploy the complete service on a host with Node.js and persistent storage, such as Render."
      : " Check that the workspace server is running and /api requests reach it.";
    throw Error(
      `The workspace server is unavailable (HTTP ${response.status}).${deployment}`,
    );
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw Error(
      "The workspace server returned an invalid response. Please retry or contact your administrator.",
    );
  }
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("session-expired"));
    throw Error(body.error || "Something went wrong.");
  }
  return body as T;
}
export const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});
export function bytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1073741824) return `${(size / 1048576).toFixed(1)} MB`;
  return `${(size / 1073741824).toFixed(1)} GB`;
}
export function relative(time: number) {
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(time).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
