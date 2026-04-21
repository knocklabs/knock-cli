import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import type { HttpMethod } from "./types";

export type RenderOptions = {
  raw: boolean;
  include: boolean;
  silent: boolean;
  verbose: boolean;
  log: (msg?: string, ...args: unknown[]) => void;
  logToStderr: (msg?: string, ...args: unknown[]) => void;
};

function formatHeaders(headers: AxiosResponse["headers"]): string {
  if (!headers || typeof headers !== "object") return "";
  const lines: string[] = [];
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) continue;
    lines.push(`${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  }

  return lines.join("\n");
}

function stringifyBody(data: unknown, raw: boolean): string {
  if (data === undefined || data === "") return "";
  if (typeof data === "string") return raw ? data : data;
  try {
    return raw ? JSON.stringify(data) : JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function renderResponse(resp: AxiosResponse, opts: RenderOptions): void {
  if (opts.verbose) {
    opts.logToStderr(`← ${resp.status} ${resp.statusText}`);
    opts.logToStderr(formatHeaders(resp.headers));
  }

  if (opts.include) {
    opts.log(`${resp.status} ${resp.statusText}`);
    const h = formatHeaders(resp.headers);
    if (h) opts.log(h);
    opts.log("");
  }

  if (opts.silent) return;
  const body = resp.data;
  if (body === undefined || body === null || body === "") return;
  if (typeof body === "string") {
    opts.log(opts.raw ? body : body);
    return;
  }

  opts.log(stringifyBody(body, opts.raw));
}

export type PaginatedRequest = {
  method: HttpMethod;
  url: string;
  params: Record<string, unknown>;
  data?: unknown;
  headers: Record<string, string>;
};

function isPaginatedShape(data: unknown): data is {
  entries: unknown[];
  page_info?: { after?: string | null; before?: string | null };
} {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.entries) && d.page_info !== undefined;
}

/**
 * Execute request, optionally following `page_info.after` and merging `entries`.
 */
export async function requestWithOptionalPagination(
  client: AxiosInstance,
  req: PaginatedRequest,
  paginate: boolean,
  opts: RenderOptions,
): Promise<AxiosResponse> {
  if (!paginate) {
    const config: AxiosRequestConfig = {
      method: req.method,
      url: req.url,
      params: pruneParams(req.params),
      data: req.data,
      headers: req.headers,
    };
    if (opts.verbose) {
      opts.logToStderr(`→ ${req.method.toUpperCase()} ${req.url}`);
      opts.logToStderr(JSON.stringify({ params: req.params, data: req.data }));
    }

    return client.request(config);
  }

  const allEntries: unknown[] = [];
  let params = { ...req.params };
  let page = 0;

  for (;;) {
    const config: AxiosRequestConfig = {
      method: req.method,
      url: req.url,
      params: pruneParams(params),
      data: req.data,
      headers: req.headers,
    };
    if (opts.verbose) {
      opts.logToStderr(
        `→ ${req.method.toUpperCase()} ${req.url} (page ${page})`,
      );
      opts.logToStderr(JSON.stringify({ params, data: req.data }));
    }

    // eslint-disable-next-line no-await-in-loop
    const resp = await client.request(config);
    const data = resp.data;

    if (!isPaginatedShape(data)) {
      if (page === 0 && opts.verbose) {
        opts.logToStderr(
          "Response is not paginated (missing entries/page_info); returning single response.",
        );
      }

      return resp;
    }

    allEntries.push(...data.entries);
    const after = data.page_info?.after;
    if (!after) {
      return {
        ...resp,
        data: {
          ...data,
          entries: allEntries,
        },
      };
    }

    params = { ...params, after };
    page += 1;
  }
}

function pruneParams(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null) out[k] = v;
  }

  return out;
}
