import { Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { listEndpoints } from "@/lib/mapi/endpoint-resolver";
import { loadOpenApiDocument } from "@/lib/mapi/openapi-loader";
import type { Endpoint } from "@/lib/mapi/types";

export default class MapiLs extends BaseCommand<typeof MapiLs> {
  static summary = "List Management API endpoints from the OpenAPI spec.";

  static description =
    "Fetches (or loads from cache) the live OpenAPI document and lists operations.";

  static aliases = ["list"];

  static enableJsonFlag = true;

  static flags = {
    format: Flags.string({
      summary: "Output format.",
      options: ["human", "json"],
      default: "human",
    }),
    tag: Flags.string({
      summary: "Filter by OpenAPI tag name (exact match, case-sensitive).",
    }),
    search: Flags.string({
      summary:
        "Filter by substring match on path, operationId, or summary (case-insensitive).",
    }),
    refresh: Flags.boolean({
      summary: "Force refresh of the cached OpenAPI specification.",
    }),
  };

  async run(): Promise<unknown> {
    const { flags } = this.props;

    const { spec } = await loadOpenApiDocument({
      apiOrigin: this.sessionContext.apiOrigin,
      cacheDir: this.config.cacheDir,
      refresh: flags.refresh,
      onStaleCache: (m) => this.warn(m),
    });

    let endpoints = listEndpoints(spec);

    if (flags.tag) {
      endpoints = endpoints.filter((e) => e.tags.includes(flags.tag!));
    }

    if (flags.search) {
      const q = flags.search.toLowerCase();
      endpoints = endpoints.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.operationId.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q),
      );
    }

    const payload = endpoints.map((e) => ({
      method: e.method,
      path: e.path,
      operationId: e.operationId,
      summary: e.summary,
      tags: e.tags,
    }));

    if (flags.json) {
      return payload;
    }

    if (flags.format === "json") {
      this.log(JSON.stringify(payload, null, 2));
      return;
    }

    const byTag = new Map<string, Endpoint[]>();
    for (const e of endpoints) {
      const tag = e.tags[0] ?? "Other";
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push(e);
    }

    for (const [tag, eps] of [...byTag.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      this.log(`\n[${tag}]`);
      ux.table(
        eps.sort((a, b) => a.path.localeCompare(b.path)),
        {
          method: {
            header: "METHOD",
            get: (r) => r.method.toUpperCase(),
          },
          path: { header: "PATH" },
          operationId: { header: "OPERATION" },
          summary: { header: "SUMMARY" },
        },
      );
    }
  }
}
