import type { HttpMethod } from "./types";

export type CurlRequest = {
  method: HttpMethod;
  url: string;
  /** Full URL including origin (for curl). */
  absoluteUrl: string;
  params: Record<string, unknown>;
  data?: unknown;
  headers: Record<string, string>;
};

function escapeShellSingleQuotes(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        parts.push(
          `${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`,
        );
      }
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * Generate a curl command using `$KNOCK_SERVICE_TOKEN` as the bearer placeholder.
 */
export function generateCurl(req: CurlRequest): string {
  const qs = buildQueryString(req.params);
  const urlWithQs = escapeShellSingleQuotes(`${req.absoluteUrl}${qs}`);

  const parts: string[] = [
    "curl",
    "-sS",
    "-X",
    req.method.toUpperCase(),
    urlWithQs,
  ];

  parts.push(
    "-H",
    escapeShellSingleQuotes("Authorization: Bearer $KNOCK_SERVICE_TOKEN"),
  );

  for (const [name, value] of Object.entries(req.headers)) {
    parts.push("-H", escapeShellSingleQuotes(`${name}: ${value}`));
  }

  if (req.data !== undefined) {
    if (!req.headers["Content-Type"] && !req.headers["content-type"]) {
      parts.push(
        "-H",
        escapeShellSingleQuotes("Content-Type: application/json"),
      );
    }

    const json = JSON.stringify(req.data);
    parts.push("-d", escapeShellSingleQuotes(json));
  }

  return parts.join(" ");
}
