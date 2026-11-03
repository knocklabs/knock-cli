import enquirer from "enquirer";

import { listEndpoints } from "./endpoint-resolver";
import type { Endpoint, FieldInput, OpenApiDocument } from "./types";

function endpointKey(e: Endpoint): string {
  return `${e.method.toUpperCase()} ${e.path}`;
}

export type InteractiveResult = {
  endpoint: Endpoint;
  fields: FieldInput[];
};

/**
 * Interactive picker: choose an endpoint, then prompt for required path/query params.
 */
export async function runInteractiveMapi(
  doc: OpenApiDocument,
): Promise<InteractiveResult | undefined> {
  const endpoints = listEndpoints(doc).sort((a, b) => {
    const pa = `${a.method} ${a.path}`;
    const pb = `${b.method} ${b.path}`;
    return pa.localeCompare(pb);
  });

  const byKey = new Map<string, Endpoint>();
  for (const e of endpoints) {
    byKey.set(endpointKey(e), e);
  }

  let picked: Endpoint;
  try {
    const ans = await enquirer.prompt<{ ep: string }>({
      type: "autocomplete",
      name: "ep",
      message: "Select a Management API endpoint",
      choices: endpoints.map((e) => ({
        name: `${e.method.toUpperCase().padEnd(6)} ${e.path} — ${e.summary}`,
        value: endpointKey(e),
      })),
      limit: 15,
      // enquirer autocomplete supports `limit`; types are incomplete
    } as never);
    picked = byKey.get(ans.ep)!;
    if (!picked) return undefined;
  } catch {
    return undefined;
  }

  const fields: FieldInput[] = [];

  for (const p of picked.pathParams) {
    const initial = "";
    try {
      // Sequential prompts; order matters.
      // eslint-disable-next-line no-await-in-loop
      const ans = await enquirer.prompt<{ v: string }>({
        type: "input",
        name: "v",
        message: `Path param ${p.name}${
          p.description ? ` (${p.description})` : ""
        }`,
        initial,
        validate: (v) => (v.trim().length > 0 ? true : "Required"),
      });
      fields.push({ key: p.name, value: ans.v.trim(), raw: false });
    } catch {
      return undefined;
    }
  }

  for (const q of picked.queryParams) {
    if (!q.required) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const ans = await enquirer.prompt<{ v: string }>({
        type: "input",
        name: "v",
        message: `Query param ${q.name}${
          q.description ? ` (${q.description})` : ""
        }`,
        validate: (v) => (v.trim().length > 0 ? true : "Required"),
      });
      fields.push({ key: q.name, value: ans.v.trim(), raw: false });
    } catch {
      return undefined;
    }
  }

  try {
    const go = await enquirer.prompt<{ ok: boolean }>({
      type: "confirm",
      name: "ok",
      message: `Send ${picked.method.toUpperCase()} ${picked.path}?`,
      initial: true,
    });
    if (!go.ok) return undefined;
  } catch {
    return undefined;
  }

  return { endpoint: picked, fields };
}
