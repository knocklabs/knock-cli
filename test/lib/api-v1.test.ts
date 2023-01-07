import { Config } from "@oclif/core";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("lib/api-v1", () => {
  describe("listWorkflows", () => {
    it("makes a GET request to /v1/workflows with supported params", async () => {
      const config = new Config({ root: "/path/to/bin" });
      const apiV1 = new KnockApiV1(factory.gFlags(), config);

      const stub = sinon.stub(apiV1.client, "get").returns(
        Promise.resolve({
          status: 200,
          data: {
            entries: [],
            page_info: factory.pageInfo(),
          },
        }),
      );

      const flags = {
        environment: "staging",
        annotate: true,
        "hide-uncommitted-changes": true,
        after: "foo",
        before: "bar",
        limit: 99,
        "rogue-flag": "hey",
      };
      await apiV1.listWorkflows(factory.props({ flags }));

      const params = {
        environment: "staging",
        annotate: true,
        hide_uncommitted_changes: true,
        after: "foo",
        before: "bar",
        limit: 99,
      };
      sinon.assert.calledWith(stub, "/v1/workflows", { params });

      stub.restore();
    });
  });

  describe("getWorkflow", () => {
    it("makes a GET request to /v1/workflows/workflowKey with supported params", async () => {
      const config = new Config({ root: "/path/to/bin" });
      const apiV1 = new KnockApiV1(factory.gFlags(), config);

      const stub = sinon.stub(apiV1.client, "get").returns(
        Promise.resolve({
          data: factory.workflow(),
        }),
      );

      const args = { workflowKey: "foo" };
      const flags = {
        environment: "staging",
        annotate: true,
        "hide-uncommitted-changes": true,
        "rogue-flag": "hey",
      };
      await apiV1.getWorkflow(factory.props({ args, flags }));

      const params = {
        environment: "staging",
        annotate: true,
        hide_uncommitted_changes: true,
      };
      sinon.assert.calledWith(stub, "/v1/workflows/foo", { params });

      stub.restore();
    });
  });
});
