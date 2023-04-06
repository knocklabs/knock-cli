import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { WorkflowData } from "@/lib/marshal/workflow";

const currCwd = process.cwd();

const setupWithGetWorkflowStub = (workflowAttrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "getWorkflow",
      sinon.stub().resolves(
        factory.resp({
          data: factory.workflow(workflowAttrs),
        }),
      ),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

const setupWithListWorkflowsStub = (
  ...manyWorkflowAttrs: Partial<WorkflowData>[]
) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "listWorkflows",
      sinon.stub().resolves(
        factory.resp({
          data: {
            entries: manyWorkflowAttrs.map((attrs) => factory.workflow(attrs)),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

describe("commands/workflow/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a workflow key arg", () => {
    setupWithGetWorkflowStub({ key: "workflow-x" })
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

    setupWithGetWorkflowStub({ key: "workflow-y" })
      .stdout()
      .command(["workflow pull", "workflow-y"])
      .it("writes a workflow dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "workflow-y", "workflow.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a --all flag", () => {
    setupWithListWorkflowsStub({ key: "workflow-a" }, { key: "workflow-bar" })
      .stdout()
      .command(["workflow pull", "--all", "--workflows-dir", "./workflows"])
      .it("calls apiV1 listWorkflows with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listWorkflows as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                workflowKey: undefined,
              }) &&
              isEqual(flags, {
                all: true,
                "workflows-dir": {
                  abspath: path.resolve(sandboxDir, "workflows"),
                  exists: false,
                },
                "service-token": "valid-token",
                "api-origin": undefined,
                environment: "development",
                annotate: true,
                limit: 100,
              }),
          ),
        );
      });

    setupWithListWorkflowsStub(
      { key: "workflow-foo" },
      { key: "workflow-two" },
      { key: "workflow-c" },
    )
      .stdout()
      .command(["workflow pull", "--all", "--workflows-dir", "./workflows"])
      .it(
        "writes a workflows dir to the file system, with individual workflow dirs inside",
        () => {
          const path1 = path.resolve(sandboxDir, "workflows", "workflow-foo");
          expect(fs.pathExistsSync(path1)).to.equal(true);

          const path2 = path.resolve(sandboxDir, "workflows", "workflow-two");
          expect(fs.pathExistsSync(path2)).to.equal(true);

          const path3 = path.resolve(sandboxDir, "workflows", "workflow-c");
          expect(fs.pathExistsSync(path3)).to.equal(true);
        },
      );
  });

  describe("given both a workflow key arg and a --all flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["workflow pull", "workflow-x", "--all"])
      .catch(
        "workflowKey arg `workflow-x` cannot also be provided when using --all",
      )
      .it("throws an error");
  });
});
