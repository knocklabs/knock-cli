import type {
  Endpoint,
  HttpMethod,
  OpenApiDocument,
  OpenApiOperationObject,
  OpenApiParameterObject,
  OpenApiPathItemObject,
  OpenApiSchemaObject,
  ParamSpec,
  ResolvedBodySchema,
} from "./types";

const HTTP_METHODS: HttpMethod[] = ["get", "put", "post", "delete", "patch"];

function resolveRef(
  doc: OpenApiDocument,
  ref: string,
): OpenApiSchemaObject | undefined {
  if (!ref.startsWith("#/")) return undefined;
  const parts = ref.slice(2).split("/");
  let cur: unknown = doc as unknown as Record<string, unknown>;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }

  return cur as OpenApiSchemaObject;
}

function resolveSchema(
  doc: OpenApiDocument,
  schema?: OpenApiSchemaObject,
  depth = 0,
): OpenApiSchemaObject | undefined {
  if (!schema || depth > 20) return schema;
  if (schema.$ref) {
    const resolved = resolveRef(doc, schema.$ref);
    return resolveSchema(doc, resolved, depth + 1);
  }

  if (schema.allOf?.length === 1) {
    return resolveSchema(doc, schema.allOf[0], depth + 1);
  }

  return schema;
}

function schemaToBodyResolved(
  doc: OpenApiDocument,
  schema?: OpenApiSchemaObject,
): ResolvedBodySchema | undefined {
  const s = resolveSchema(doc, schema);
  if (!s || s.type !== "object" || !s.properties) {
    // Some request bodies use allOf merged objects; shallow merge first allOf
    if (s?.allOf?.length) {
      const merged: ResolvedBodySchema = {
        required: [],
        properties: {},
        description: s.description,
      };
      for (const part of s.allOf) {
        const r = schemaToBodyResolved(doc, part);
        if (r) {
          Object.assign(merged.properties, r.properties);
          merged.required.push(...r.required);
          merged.description = merged.description ?? r.description;
        }
      }

      if (Object.keys(merged.properties).length > 0) return merged;
    }

    return undefined;
  }

  return {
    description: s.description,
    required: s.required ?? [],
    properties: s.properties,
  };
}

function normalizeParam(
  doc: OpenApiDocument,
  p: OpenApiParameterObject,
): ParamSpec | undefined {
  if (p.in !== "path" && p.in !== "query") return undefined;
  return {
    name: p.name,
    in: p.in,
    required: Boolean(p.required),
    description: p.description,
    schema: p.schema ? resolveSchema(doc, p.schema) : undefined,
  };
}

function collectParameters(
  doc: OpenApiDocument,
  pathItem: OpenApiPathItemObject,
  op: OpenApiOperationObject,
): { pathParams: ParamSpec[]; queryParams: ParamSpec[] } {
  const pathParams: ParamSpec[] = [];
  const queryParams: ParamSpec[] = [];
  const rawParams = [
    ...((pathItem.parameters as OpenApiParameterObject[] | undefined) ?? []),
    ...(op.parameters ?? []),
  ];
  const seen = new Set<string>();
  for (const raw of rawParams) {
    let p = raw as OpenApiParameterObject & { $ref?: string };
    if (p.$ref) {
      const ref = p.$ref;
      const resolved = resolveRef(doc, ref) as
        | OpenApiParameterObject
        | undefined;
      if (!resolved) continue;
      p = resolved;
    }

    const spec = normalizeParam(doc, p);
    if (!spec) continue;
    const dedupeKey = `${spec.in}:${spec.name}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    if (spec.in === "path") pathParams.push(spec);
    else queryParams.push(spec);
  }

  return { pathParams, queryParams };
}

function operationBodySchema(
  doc: OpenApiDocument,
  op: OpenApiOperationObject,
): ResolvedBodySchema | undefined {
  const body = op.requestBody;
  if (!body?.content) return undefined;
  const json = body.content["application/json"];
  if (!json?.schema) return undefined;
  return schemaToBodyResolved(doc, json.schema);
}

function operationIdFor(
  op: OpenApiOperationObject,
  method: HttpMethod,
  path: string,
): string {
  if (op.operationId) return op.operationId;
  const seg = path.replace(/^\//, "").replace(/[{}]/g, "").replace(/\//g, "_");
  return `${method}_${seg}`;
}

/**
 * Flatten OpenAPI paths into a list of endpoints.
 */
export function listEndpoints(doc: OpenApiDocument): Endpoint[] {
  const paths = doc.paths ?? {};
  const out: Endpoint[] = [];
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as OpenApiOperationObject | undefined;
      if (!op) continue;
      const { pathParams, queryParams } = collectParameters(doc, pathItem, op);
      out.push({
        method,
        path: pathKey.startsWith("/") ? pathKey : `/${pathKey}`,
        operationId: operationIdFor(op, method, pathKey),
        summary: op.summary ?? op.operationId ?? pathKey,
        description: op.description,
        tags: op.tags ?? [],
        pathParams,
        queryParams,
        bodySchema: operationBodySchema(doc, op),
      });
    }
  }

  return out;
}

/** Ensure path starts with /v1 */
export function normalizeEndpointPath(input: string): string {
  let p = input.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p === "/v1" || p.startsWith("/v1/")) return p;
  // "/whoami" -> "/v1/whoami"
  return `/v1${p}`;
}

function pathTemplateSegments(template: string): string[] {
  return template.replace(/\/$/, "").split("/").filter(Boolean);
}

function decodePathSegment(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

function matchPathTemplate(
  template: string,
  concrete: string,
): Record<string, string> | undefined {
  const tSeg = pathTemplateSegments(template);
  const cSeg = pathTemplateSegments(concrete);
  if (tSeg.length !== cSeg.length) return undefined;
  const params: Record<string, string> = {};
  for (const [i, element] of tSeg.entries()) {
    const ts = element!;
    const cs = cSeg[i]!;
    if (ts.startsWith("{") && ts.endsWith("}")) {
      const decoded = decodePathSegment(cs);
      if (decoded === undefined) return undefined;
      params[ts.slice(1, -1)] = decoded;
    } else if (ts !== cs) {
      return undefined;
    }
  }

  return params;
}

export function findEndpointsByOperationId(
  endpoints: Endpoint[],
  operationId: string,
): Endpoint[] {
  const exact = endpoints.filter((e) => e.operationId === operationId);
  if (exact.length > 0) return exact;
  const lower = operationId.toLowerCase();
  return endpoints.filter((e) => e.operationId.toLowerCase() === lower);
}

export function findEndpointsByPathAndMethod(
  endpoints: Endpoint[],
  userPath: string,
  method?: HttpMethod,
): Endpoint[] {
  const normalized = normalizeEndpointPath(userPath);
  const matches: Endpoint[] = [];
  for (const e of endpoints) {
    if (method && e.method !== method) continue;
    if (e.path === normalized) {
      matches.push(e);
      continue;
    }

    const m = matchPathTemplate(e.path, normalized);
    if (m) matches.push(e);
  }

  return matches;
}

export type ResolveEndpointResult =
  | { ok: true; endpoint: Endpoint; pathParamValues: Record<string, string> }
  | { ok: false; reason: "ambiguous"; candidates: Endpoint[] }
  | { ok: false; reason: "not_found"; message: string };

/**
 * Resolve user token (operationId or URL path) to a single endpoint.
 */
export function resolveEndpoint(
  doc: OpenApiDocument,
  token: string,
  method?: HttpMethod,
): ResolveEndpointResult {
  const endpoints = listEndpoints(doc);
  const trimmed = token.trim();

  if (!trimmed.includes("/")) {
    const byId = findEndpointsByOperationId(endpoints, trimmed);
    if (byId.length === 1) {
      return {
        ok: true,
        endpoint: byId[0]!,
        pathParamValues: {},
      };
    }

    if (byId.length > 1) {
      return { ok: false, reason: "ambiguous", candidates: byId };
    }
  }

  const normalized = normalizeEndpointPath(trimmed);
  const byPath = findEndpointsByPathAndMethod(endpoints, normalized, method);
  if (byPath.length === 1) {
    const endpoint = byPath[0]!;
    const values =
      endpoint.path === normalized
        ? {}
        : matchPathTemplate(endpoint.path, normalized) ?? {};
    return { ok: true, endpoint, pathParamValues: values };
  }

  if (byPath.length > 1) {
    return { ok: false, reason: "ambiguous", candidates: byPath };
  }

  if (!trimmed.includes("/")) {
    return {
      ok: false,
      reason: "not_found",
      message: `Unknown operationId or path: ${trimmed}`,
    };
  }

  return {
    ok: false,
    reason: "not_found",
    message: `No operation matches path ${normalized}${
      method ? ` with method ${method.toUpperCase()}` : ""
    }`,
  };
}

/** Short endpoint listing for help text (from cached OpenAPI). */
export function formatEndpointsHelpLines(
  endpoints: Endpoint[],
  maxLines = 40,
): string {
  const byTag = new Map<string, Endpoint[]>();
  for (const e of endpoints) {
    const tag = e.tags[0] ?? "Other";
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag)!.push(e);
  }

  const lines: string[] = [
    "ENDPOINTS (from cached OpenAPI; run `knock mapi ls` for the authoritative list):",
  ];
  let count = 0;
  for (const [tag, eps] of [...byTag.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    lines.push(`  [${tag}]`);
    for (const e of eps.sort((a, b) => a.path.localeCompare(b.path))) {
      if (count >= maxLines) {
        lines.push("  … (truncated; run `knock mapi ls` for the full list)");
        return lines.join("\n");
      }

      lines.push(
        `    ${e.method.toUpperCase().padEnd(6)} ${e.path}  ${e.operationId}`,
      );
      count++;
    }
  }

  return lines.join("\n");
}
