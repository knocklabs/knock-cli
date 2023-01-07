import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/env";

const setupWithStub = (workflowAtts = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "getWorkflow",
      sinon.stub().resolves(
        factory.resp({
          data: factory.workflow(workflowAtts),
        }),
      ),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

describe("commands/workflow/pull", () => {
  before(() => fs.removeSync(sandboxDir));
  afterEach(() => fs.removeSync(sandboxDir));

  setupWithStub({ key: "workflow-x" })
    .stdout()
    .command(["workflow pull", "workflow-x"])
    .it("calls apiV1 getWorkflow with an annotate param", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.getWorkflow as any,
        sinon.match(
          ({ args, flags }) =>
            isEqual(args, {
              workflowKey: "workflow-x",
            }) &&
            isEqual(flags, {
              "service-token": "valid-token",
              "api-origin": undefined,
              environment: "development",
              annotate: true,
            }),
        ),
      );
    });

  setupWithStub({ key: "workflow-y" })
    .stdout()
    .command(["workflow pull", "workflow-y"])
    .it("writes a workflow dir to the file system", () => {
      const exists = fs.pathExistsSync(
        path.resolve(sandboxDir, "workflow-y", "workflow.json"),
      );

      expect(exists).to.equal(true);
    });
});
