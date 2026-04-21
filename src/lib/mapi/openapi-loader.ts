import * as path from "node:path";

import axios from "axios";
import * as fs from "fs-extra";

import { isTestEnv } from "@/lib/helpers/const";
import { openApiSpecUrl } from "@/lib/urls";

import type { CachedOpenApiDocument, OpenApiDocument } from "./types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cacheFileName(apiOrigin: string): string {
  const safe = Buffer.from(apiOrigin, "utf8")
    .toString("base64url")
    .replace(/=/g, "");
  return `mapi-openapi-${safe}.json`;
}

function cachePath(cacheDir: string, apiOrigin: string): string {
  return path.join(cacheDir, cacheFileName(apiOrigin));
}

export type LoadOpenApiOptions = {
  apiOrigin: string;
  cacheDir: string;
  refresh: boolean;
  /** If set, called when network fetch fails but stale cache is used. */
  onStaleCache?: (message: string) => void;
};

export type LoadOpenApiResult = {
  spec: OpenApiDocument;
  fromCache: boolean;
  stale?: boolean;
};

async function fetchSpec(apiOrigin: string): Promise<OpenApiDocument> {
  const url = openApiSpecUrl(apiOrigin);
  const resp = await axios.get<OpenApiDocument>(url, {
    timeout: 60_000,
    validateStatus: (s) => s === 200,
    headers: { Accept: "application/json" },
  });
  return resp.data;
}

async function readFreshCache(
  file: string,
  apiOrigin: string,
): Promise<OpenApiDocument | undefined> {
  try {
    if (!(await fs.pathExists(file))) return undefined;
    const cached = (await fs.readJSON(file)) as CachedOpenApiDocument;
    const valid =
      cached?.spec && cached?.fetchedAt && cached?.apiOrigin === apiOrigin;
    if (!valid) return undefined;
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < 0 || age >= CACHE_TTL_MS) return undefined;
    return cached.spec;
  } catch {
    return undefined;
  }
}

async function readStaleCache(
  file: string,
  apiOrigin: string,
): Promise<OpenApiDocument | undefined> {
  try {
    if (!(await fs.pathExists(file))) return undefined;
    const cached = (await fs.readJSON(file)) as CachedOpenApiDocument;
    if (cached?.spec && cached?.apiOrigin === apiOrigin) return cached.spec;
  } catch {
    /* ignore */
  }

  return undefined;
}

/**
 * Load OpenAPI spec from cache and/or network.
 * In test env, skips disk cache read/write and always fetches (stub axios in tests).
 */
export async function loadOpenApiDocument(
  opts: LoadOpenApiOptions,
): Promise<LoadOpenApiResult> {
  const { apiOrigin, cacheDir, refresh, onStaleCache } = opts;
  const file = cachePath(cacheDir, apiOrigin);

  if (!isTestEnv && !refresh) {
    const fresh = await readFreshCache(file, apiOrigin);
    if (fresh) return { spec: fresh, fromCache: true };
  }

  try {
    const spec = await fetchSpec(apiOrigin);
    if (!isTestEnv) {
      await fs.ensureDir(cacheDir);
      const payload: CachedOpenApiDocument = {
        fetchedAt: new Date().toISOString(),
        apiOrigin,
        spec,
      };
      await fs.writeJSON(file, payload, { spaces: 0 });
    }

    return { spec, fromCache: false };
  } catch (error) {
    if (!isTestEnv && !refresh) {
      const staleSpec = await readStaleCache(file, apiOrigin);
      if (staleSpec) {
        onStaleCache?.(
          "Could not refresh OpenAPI spec; using cached copy. Try again with --refresh.",
        );
        return { spec: staleSpec, fromCache: true, stale: true };
      }
    }

    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load OpenAPI spec from ${openApiSpecUrl(apiOrigin)}: ${msg}`,
    );
  }
}
