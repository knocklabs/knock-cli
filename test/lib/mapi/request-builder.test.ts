import * as os from "node:os";
import * as path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";

import { resolveEndpoint } from "@/lib/mapi/endpoint-resolver";
import { buildRequest, parseHeaderPair } from "@/lib/mapi/request-builder";
import type { OpenApiDocument } from "@/lib/mapi/types";

describe("lib/mapi/request-builder", () => {
  let doc: OpenApiDocument;

  before(async () => {
    const p = path.resolve(
      __dirname,
      "../../support/fixtures/mapi-openapi.json",
    );
    doc = (await fs.readJSON(p)) as OpenApiDocument;
  });

  it("parseHeaderPair parses Name: value", () => {
    expect(parseHeaderPair("Content-Type: application/json")).to.deep.equal({
      name: "Content-Type",
      value: "application/json",
    });
  });

  it("buildRequest splits path, query, and body", async () => {
    const resolved = resolveEndpoint(doc, "/v1/workflows/wf-1/run");
    expect(resolved.ok).to.equal(true);
    if (!resolved.ok) return;

    const built = await buildRequest({
      endpoint: resolved.endpoint,
      pathParamDefaults: resolved.pathParamValues,
      fields: [
        { key: "environment", value: "development", raw: false },
        { key: "recipients", value: '["u1"]', raw: false },
      ],
      headers: [],
    });

    expect(built.url).to.equal("/v1/workflows/wf-1/run");
    expect(built.params).to.deep.equal({ environment: "development" });
    expect(built.data).to.deep.equal({ recipients: ["u1"] });
  });

  it("-F typed boolean and number", async () => {
    const resolved = resolveEndpoint(doc, "listWorkflows");
    expect(resolved.ok).to.equal(true);
    if (!resolved.ok) return;

    const built = await buildRequest({
      endpoint: resolved.endpoint,
      pathParamDefaults: {},
      fields: [
        { key: "environment", value: "staging", raw: false },
        { key: "flag", value: "true", raw: false },
        { key: "n", value: "42", raw: false },
      ],
      headers: [],
    });
    expect(built.params).to.deep.include({
      environment: "staging",
      flag: true,
      n: 42,
    });
  });

  it("@file reads JSON from disk", async () => {
    const tmp = path.join(os.tmpdir(), `knock-mapi-test-${Date.now()}.json`);
    await fs.writeJSON(tmp, ["a"]);

    const resolved = resolveEndpoint(doc, "/v1/workflows/wf-1/run");
    expect(resolved.ok).to.equal(true);
    if (!resolved.ok) return;

    const built = await buildRequest({
      endpoint: resolved.endpoint,
      pathParamDefaults: resolved.pathParamValues,
      fields: [
        { key: "environment", value: "development", raw: false },
        { key: "recipients", value: `@${tmp}`, raw: false },
      ],
      headers: [],
    });

    expect(built.data).to.deep.equal({ recipients: ["a"] });
    await fs.remove(tmp);
  });
});
