import path from "node:path";

import { test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "runWorkflow",
      sinon.stub().resolves(factory.resp(attrs)),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

describe("commands/workflow/run", () => {
  describe("given no workflow key arg", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command(["workflow run"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given no recipients flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command(["workflow run", "workflow-x"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given the workflow key arg, the environment flag and the recipient flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "workflow-x",
        "--environment",
        "staging",
        "--recipient",
        "alice",
      ])
      .it("calls apiV1 runWorkflow with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.runWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                workflowKey: "workflow-x",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                environment: "staging",
                recipients: ["alice"],
                local: false,
              }),
          ),
        );
      });
  });

  describe("given the workflow key arg, the environment flag and the recipients flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "workflow-x",
        "--environment",
        "staging",
        "--recipient",
        "alice,barry",
      ])
      .it("calls apiV1 runWorkflow with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.runWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                workflowKey: "workflow-x",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                environment: "staging",
                recipients: ["alice", "barry"],
                local: false,
              }),
          ),
        );
      });
  });

  const currCwd = process.cwd();
  const workflowJsonFile = "new-comment/workflow.json";

  describe("given the workflow key arg and the local flag", () => {
    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(sandboxDir);
      const abspath = path.resolve(sandboxDir, workflowJsonFile);
      fs.outputJsonSync(abspath, { name: "New comment" });

      process.chdir(sandboxDir);
    });

    afterEach(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "new-comment",
        "--environment",
        "staging",
        "--recipient",
        "alice,barry",
        "--local",
      ])
      .it("calls apiV1 runWorkflow with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.runWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                workflowKey: "new-comment",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                environment: "staging",
                recipients: ["alice", "barry"],
                local: true,
              }),
          ),
          sinon.match((workflow) =>
            isEqual(workflow, { name: "New comment", key: "new-comment" }),
          ),
        );
      });
  });
});
