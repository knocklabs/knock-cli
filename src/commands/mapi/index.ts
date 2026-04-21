import { Args, Flags, ux } from "@oclif/core";
import enquirer from "enquirer";

import BaseCommand from "@/lib/base-command";
import { generateCurl } from "@/lib/mapi/curl-generator";
import {
  formatEndpointsHelpLines,
  listEndpoints,
  resolveEndpoint,
} from "@/lib/mapi/endpoint-resolver";
import { runInteractiveMapi } from "@/lib/mapi/interactive";
import {
  loadOpenApiDocument,
  readCachedOpenApiForHelp,
} from "@/lib/mapi/openapi-loader";
import {
  buildRequest,
  type FieldInput,
  parseHeaderPair,
  warnOnDuplicateFieldKeys,
} from "@/lib/mapi/request-builder";
import {
  renderResponse,
  requestWithOptionalPagination,
} from "@/lib/mapi/response-renderer";
import type { HttpMethod } from "@/lib/mapi/types";

const HTTP_METHODS: HttpMethod[] = ["get", "put", "post", "delete", "patch"];

const MAP_DESCRIPTION_BASE = `Execute HTTP requests against the Knock Management API, similar to Vercel's \`vercel api\`.

Discover endpoints with \`knock mapi ls\` (from the live OpenAPI spec). Pass an OpenAPI path (e.g. \`/v1/whoami\`) or an \`operationId\` (e.g. \`getWhoami\`). Run \`knock mapi\` with no arguments for interactive mode.

OpenAPI spec is cached under the CLI cache directory (24h TTL); use \`--refresh\` to fetch the latest.

Only operations with HTTP GET, PUT, POST, DELETE, or PATCH appear in the spec (other methods are omitted).

Power-user flags: \`-F key=@path\` reads a local file; \`-H\` can override headers including \`Authorization\` (you are responsible for auth).`;

function parseHttpMethod(s: string | undefined): HttpMethod | undefined {
  if (!s) return undefined;
  const m = s.toLowerCase() as HttpMethod;
  if ((HTTP_METHODS as string[]).includes(m)) return m;
  return undefined;
}

function parseKeyEqualsValue(
  flag: string,
  label: string,
): { key: string; value: string } {
  const eq = flag.indexOf("=");
  if (eq < 0) {
    throw new Error(`${label} must be key=value, got: ${flag}`);
  }

  return { key: flag.slice(0, eq), value: flag.slice(eq + 1) };
}

function fieldInputsFromFlags(flags: {
  field?: string[];
  "raw-field"?: string[];
}): FieldInput[] {
  const out: FieldInput[] = [];
  for (const f of flags.field ?? []) {
    const { key, value } = parseKeyEqualsValue(f, "-F/--field");
    out.push({ key, value, raw: false });
  }

  for (const f of flags["raw-field"] ?? []) {
    const { key, value } = parseKeyEqualsValue(f, "-f/--raw-field");
    out.push({ key, value, raw: true });
  }

  return out;
}

export default class Mapi extends BaseCommand<typeof Mapi> {
  static summary = "Call any Knock Management API (mAPI) endpoint.";

  static description = MAP_DESCRIPTION_BASE;

  static enableJsonFlag = true;

  static strict = true;

  static args = {
    endpoint: Args.string({
      required: false,
      description:
        "OpenAPI path (e.g. /v1/whoami) or operationId (e.g. getWhoami). Omit for interactive mode.",
    }),
  };

  static flags = {
    method: Flags.string({
      char: "X",
      summary: "HTTP method (default from OpenAPI operation).",
      options: [...HTTP_METHODS],
    }),
    field: Flags.string({
      char: "F",
      summary:
        "Body, path, or query field (typed: booleans, numbers, null, @file). Repeatable.",
      multiple: true,
    }),
    "raw-field": Flags.string({
      char: "f",
      summary: "Field as raw string (no type coercion). Repeatable.",
      multiple: true,
    }),
    header: Flags.string({
      char: "H",
      summary: 'Extra header in "Name: value" form. Repeatable.',
      multiple: true,
    }),
    input: Flags.string({
      summary: "Read JSON request body from file path, or - for stdin.",
    }),
    paginate: Flags.boolean({
      summary:
        "Follow page_info.after and merge entries (Knock pagination shape).",
    }),
    include: Flags.boolean({
      char: "i",
      summary: "Print response status and headers before the body.",
    }),
    silent: Flags.boolean({
      summary: "Suppress response body; exit code reflects HTTP success.",
    }),
    verbose: Flags.boolean({
      summary: "Log request/response debug details to stderr.",
    }),
    raw: Flags.boolean({
      summary: "Print JSON without pretty-printing.",
    }),
    refresh: Flags.boolean({
      summary: "Force refresh of the cached OpenAPI specification.",
    }),
    generate: Flags.string({
      summary: "Print a command instead of executing (only: curl).",
      options: ["curl"],
    }),
    "dangerously-skip-permissions": Flags.boolean({
      summary: "Skip confirmation prompt for DELETE requests.",
    }),
  };

  static examples = [
    "knock mapi /v1/whoami",
    "knock mapi getWhoami",
    "knock mapi /v1/workflows/my-workflow/run -X put -F environment=development -F recipients='[\"user_1\"]'",
    "knock mapi ls",
    "knock mapi /v1/workflows --paginate",
    "knock mapi /v1/whoami --generate curl",
  ];

  public async init(): Promise<void> {
    await super.init();
    const wantsHelp = this.argv.some((a) => a === "--help" || a === "-h");
    if (!wantsHelp) return;
    try {
      const spec = readCachedOpenApiForHelp(
        this.config.cacheDir,
        this.sessionContext.apiOrigin,
      );
      Mapi.description = spec
        ? `${MAP_DESCRIPTION_BASE}\n\n${formatEndpointsHelpLines(
            listEndpoints(spec),
            35,
          )}`
        : MAP_DESCRIPTION_BASE;
    } catch {
      Mapi.description = MAP_DESCRIPTION_BASE;
    }
  }

  async run(): Promise<unknown> {
    const { args, flags } = this.props;
    const methodOverride = parseHttpMethod(flags.method);

    const { spec } = await loadOpenApiDocument({
      apiOrigin: this.sessionContext.apiOrigin,
      cacheDir: this.config.cacheDir,
      refresh: flags.refresh,
      onStaleCache: (m) => this.warn(m),
    });

    let endpointToken = args.endpoint?.trim();
    let extraFields: FieldInput[] = [];

    if (!endpointToken) {
      const interactive = await runInteractiveMapi(spec);
      if (!interactive) return;
      endpointToken =
        interactive.endpoint.operationId ??
        `${interactive.endpoint.method} ${interactive.endpoint.path}`;
      extraFields = interactive.fields;
    }

    const resolved = resolveEndpoint(spec, endpointToken, methodOverride);
    if (!resolved.ok) {
      if (resolved.reason === "ambiguous") {
        this.error(
          `Ambiguous endpoint "${endpointToken}". Candidates:\n${resolved.candidates
            .map(
              (c) =>
                `  ${c.method.toUpperCase()} ${c.path}  (${c.operationId})`,
            )
            .join("\n")}`,
        );
      }

      this.error(resolved.message);
    }

    const { endpoint, pathParamValues } = resolved;

    const fields: FieldInput[] = [
      ...extraFields,
      ...fieldInputsFromFlags(flags),
    ];
    warnOnDuplicateFieldKeys(fields, (m) => ux.logToStderr(`Warning: ${m}`));

    const headerList = flags.header ?? [];
    for (const h of headerList) {
      parseHeaderPair(h);
    }

    const built = await buildRequest({
      endpoint,
      pathParamDefaults: pathParamValues,
      fields,
      headers: headerList,
      inputPath: flags.input,
      methodOverride,
    });

    if (built.method === "delete" && !flags["dangerously-skip-permissions"]) {
      if (flags.silent) {
        this.error(
          "DELETE with --silent requires --dangerously-skip-permissions (non-interactive).",
        );
      }

      try {
        const ans = await enquirer.prompt<{ ok: boolean }>({
          type: "confirm",
          name: "ok",
          message: `About to call DELETE ${built.url}. Continue?`,
          initial: false,
        });
        if (!ans.ok) return;
      } catch {
        return;
      }
    }

    const apiOrigin = this.sessionContext.apiOrigin.replace(/\/$/, "");

    if (flags.generate === "curl") {
      const line = generateCurl({
        method: built.method,
        url: built.url,
        absoluteUrl: `${apiOrigin}${built.url}`,
        params: built.params as Record<string, unknown>,
        data: built.data,
        headers: built.headers,
      });
      this.log(line);
      return { curl: line };
    }

    const renderOpts = {
      raw: flags.raw,
      include: flags.include,
      silent: flags.silent,
      verbose: flags.verbose,
      log: this.log.bind(this),
      logToStderr: this.logToStderr.bind(this),
    };

    const resp = await requestWithOptionalPagination(
      this.apiV1.client,
      {
        method: built.method,
        url: built.url,
        params: built.params as Record<string, unknown>,
        data: built.data,
        headers: built.headers,
      },
      flags.paginate,
      renderOpts,
    );

    if (flags.json) {
      const payload = {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers,
        data: resp.data,
      };
      this.logJson(this.toSuccessJson(payload));
      if (resp.status >= 400) {
        // With `enableJsonFlag`, `this.exit()` is handled inside oclif and emits a second JSON
        // error object; set the exit code without throwing so only the response payload prints.
        const prev = process.exitCode;
        process.exitCode = prev !== undefined && prev !== 0 ? prev : 1;
      }

      return;
    }

    renderResponse(resp, renderOpts);

    if (resp.status >= 400) {
      this.exit(1);
    }

    return resp.data;
  }
}
