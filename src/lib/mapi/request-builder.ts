import * as fs from "fs-extra";

import { parseJson, tryJsonParse } from "@/lib/helpers/json";

import type { Endpoint, FieldInput, HttpMethod } from "./types";

export type { FieldInput };

/** Warn once per repeated `key` (CLI order: last value wins). */
export function warnOnDuplicateFieldKeys(
  fields: FieldInput[],
  warn: (message: string) => void,
): void {
  const seen = new Set<string>();
  for (const f of fields) {
    if (seen.has(f.key)) {
      warn(`Duplicate field key "${f.key}"; last value wins.`);
    }

    seen.add(f.key);
  }
}

export type BuiltRequest = {
  method: HttpMethod;
  url: string;
  params: Record<string, unknown>;
  data?: unknown;
  headers: Record<string, string>;
};

async function parseFieldValue(value: string, raw: boolean): Promise<unknown> {
  if (raw) return value;
  const t = value.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    if (!Number.isNaN(n)) return n;
  }

  if (t.startsWith("@")) {
    const filePath = t.slice(1);
    const content = await fs.readFile(filePath, "utf8");
    const parsed = tryJsonParse(content.trim());
    return parsed;
  }

  return tryJsonParse(t);
}

async function parseFieldArgs(
  fields: FieldInput[],
): Promise<Record<string, unknown>> {
  const pairs = await Promise.all(
    fields.map(
      async (f) =>
        [f.key, await parseFieldValue(f.value, f.raw)] as [string, unknown],
    ),
  );
  return Object.fromEntries(pairs);
}

export function parseHeaderPair(h: string): { name: string; value: string } {
  const idx = h.indexOf(":");
  if (idx < 0) {
    throw new Error(`Invalid header "${h}": expected "Name: value"`);
  }

  const name = h.slice(0, idx).trim();
  const value = h.slice(idx + 1).trim();
  if (!name) throw new Error(`Invalid header "${h}": empty name`);
  return { name, value };
}

async function readInputBody(inputPath: string): Promise<unknown> {
  const raw =
    inputPath === "-"
      ? await readStdin()
      : await fs.readFile(inputPath, "utf8");

  const text = raw.toString().trim();
  if (!text) return undefined;
  const [parsed, errors] = parseJson(text);
  if (errors.length > 0 || parsed === undefined) {
    throw new Error(errors[0]?.message ?? "Invalid JSON in --input");
  }

  return parsed;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (c) => chunks.push(c as Buffer));
    process.stdin.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8")),
    );
    process.stdin.on("error", reject);
  });
}

/**
 * Substitute `{param}` segments in a path template. Values must be encoded.
 */
export function buildUrlPath(
  template: string,
  pathParams: Record<string, unknown>,
): string {
  let url = template;
  for (const [name, val] of Object.entries(pathParams)) {
    const encoded =
      val === undefined || val === null ? "" : encodeURIComponent(String(val));
    url = url.replace(`{${name}}`, encoded);
  }

  if (/{[^}]+}/.test(url)) {
    const missing = url.match(/{([^}]+)}/g)?.join(", ") ?? "";
    throw new Error(`Missing path parameter(s) for template: ${missing}`);
  }

  return url;
}

export type BuildRequestOptions = {
  endpoint: Endpoint;
  /** Values extracted from matching a path template (e.g. workflow_key). */
  pathParamDefaults: Record<string, string>;
  fields: FieldInput[];
  headers: string[];
  inputPath?: string;
  methodOverride?: HttpMethod;
};

export async function buildRequest(
  opts: BuildRequestOptions,
): Promise<BuiltRequest> {
  const {
    endpoint,
    pathParamDefaults,
    fields,
    headers: headerList,
    inputPath,
    methodOverride,
  } = opts;

  const headerMap: Record<string, string> = {};
  for (const h of headerList) {
    const { name, value } = parseHeaderPair(h);
    headerMap[name] = value;
  }

  const merged = await parseFieldArgs(fields);
  const pathValues: Record<string, unknown> = { ...pathParamDefaults };
  for (const p of endpoint.pathParams) {
    if (p.name in merged) {
      pathValues[p.name] = merged[p.name];
    }
  }

  const url = buildUrlPath(endpoint.path, pathValues);

  const params: Record<string, unknown> = {};
  for (const q of endpoint.queryParams) {
    if (q.name in merged) {
      params[q.name] = merged[q.name];
    }
  }

  const pathNames = new Set(endpoint.pathParams.map((p) => p.name));
  const queryNames = new Set(endpoint.queryParams.map((q) => q.name));
  const bodyKeys = new Set<string>();
  for (const key of Object.keys(merged)) {
    if (pathNames.has(key) || queryNames.has(key)) continue;
    bodyKeys.add(key);
  }

  const method = methodOverride ?? endpoint.method;

  let data: unknown;
  if (inputPath) {
    data = await readInputBody(inputPath);
  } else if (bodyKeys.size > 0) {
    if (method === "get") {
      for (const k of bodyKeys) {
        params[k] = merged[k];
      }
    } else {
      data = {};
      for (const k of bodyKeys) {
        (data as Record<string, unknown>)[k] = merged[k];
      }
    }
  }

  return {
    method,
    url,
    params,
    data,
    headers: headerMap,
  };
}
