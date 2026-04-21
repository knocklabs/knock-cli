import * as path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";

import {
  findEndpointsByOperationId,
  listEndpoints,
  normalizeEndpointPath,
  resolveEndpoint,
} from "@/lib/mapi/endpoint-resolver";
import type { OpenApiDocument } from "@/lib/mapi/types";

describe("lib/mapi/endpoint-resolver", () => {
  let doc: OpenApiDocument;

  before(async () => {
    const p = path.resolve(
      __dirname,
      "../../support/fixtures/mapi-openapi.json",
    );
    doc = (await fs.readJSON(p)) as OpenApiDocument;
  });

  it("listEndpoints flattens operations", () => {
    const eps = listEndpoints(doc);
    expect(eps.some((e) => e.operationId === "getWhoami")).to.equal(true);
    expect(eps.some((e) => e.operationId === "runWorkflow")).to.equal(true);
  });

  it("normalizeEndpointPath adds v1 prefix", () => {
    expect(normalizeEndpointPath("whoami")).to.equal("/v1/whoami");
    expect(normalizeEndpointPath("/v1/whoami")).to.equal("/v1/whoami");
  });

  it("resolveEndpoint finds by operationId", () => {
    const r = resolveEndpoint(doc, "getWhoami");
    expect(r.ok).to.equal(true);
    if (r.ok) {
      expect(r.endpoint.path).to.equal("/v1/whoami");
      expect(r.endpoint.method).to.equal("get");
    }
  });

  it("resolveEndpoint finds by path template and extracts path params", () => {
    const r = resolveEndpoint(doc, "/v1/workflows/wf-1/run");
    expect(r.ok).to.equal(true);
    if (r.ok) {
      expect(r.endpoint.operationId).to.equal("runWorkflow");
      expect(r.pathParamValues.workflow_key).to.equal("wf-1");
    }
  });

  it("findEndpointsByOperationId is case-insensitive fallback", () => {
    const eps = listEndpoints(doc);
    const found = findEndpointsByOperationId(eps, "getwhoami");
    expect(found.length).to.equal(1);
    expect(found[0]!.operationId).to.equal("getWhoami");
  });

  it("resolveEndpoint does not throw on invalid percent-encoding in path", () => {
    const r = resolveEndpoint(doc, "/v1/resource/bad%ZZ");
    expect(r.ok).to.equal(false);
    if (!r.ok) {
      expect(r.reason).to.equal("not_found");
    }
  });
});
