import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import WorkflowValidate from "@/commands/workflow/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { WORKFLOW_JSON, WorkflowData } from "@/lib/marshal/workflow";

const workflowJsonFile = "new-comment/workflow.json";

const mockWorkflowData: WorkflowData<WithAnnotation> = {
  name: "New comment",
  key: "new-comment",
  active: false,
  valid: false,
  steps: [],
  created_at: "2022-12-31T12:00:00.000000Z",
  updated_at: "2022-12-31T12:00:00.000000Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {},
    readonly_fields: [
      "environment",
      "key",
      "active",
      "valid",
      "created_at",
      "updated_at",
      "sha",
    ],
  },
};

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(WorkflowValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertWorkflow", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/workflow/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a workflow directory exists, for the workflow key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, workflowJsonFile);
      fs.outputJsonSync(abspath, { name: "New comment" });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command(["workflow push", "new-comment"])
      .it("calls apiV1 upsertWorkflow with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { workflowKey: "new-comment" }) &&
              isEqual(flags, {
                "service-token": "valid-token",

                environment: "development",
                // Internally set flags
                annotate: true,
              }),
          ),
          sinon.match((workflow) =>
            isEqual(workflow, {
              key: "new-comment",
              name: "New comment",
            }),
          ),
        );
      });

    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command([
        "workflow push",
        "new-comment",
        "--commit",
        "-m",
        "this is a commit comment!",
      ])
      .it("calls apiV1 upsertWorkflow with commit flags, if provided", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { workflowKey: "new-comment" }) &&
              isEqual(flags, {
                "service-token": "valid-token",

                environment: "development",
                // Commit flags
                commit: true,
                "commit-message": "this is a commit comment!",
                // Internally set flags
                annotate: true,
              }),
          ),
          sinon.match((workflow) =>
            isEqual(workflow, {
              key: "new-comment",
              name: "New comment",
            }),
          ),
        );
      });

    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command(["workflow push", "new-comment"])
      .it("writes the upserted workflow data into workflow.json", () => {
        const abspath = path.resolve(sandboxDir, workflowJsonFile);
        const workflowJson = fs.readJsonSync(abspath);

        expect(workflowJson).to.eql({
          $schema: "https://schemas.knock.app/cli/workflow.json",
          name: "New comment",
          steps: [],
          __readonly: {
            key: "new-comment",
            active: false,
            valid: false,
            created_at: "2022-12-31T12:00:00.000000Z",
          },
        });
      });
  });

  describe("given a workflow.json file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, workflowJsonFile);
      fs.outputFileSync(abspath, '{"name":"New comment",}');

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command(["workflow push", "new-comment"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a workflow.json file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, workflowJsonFile);
      fs.outputJsonSync(abspath, { name: 10 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["workflow push", "new-comment"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent workflow directory, for the workflow key", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command(["workflow push", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate a workflow directory/),
      )
      .it("throws an error");
  });

  describe("given no workflow key arg or --all flag", () => {
    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command(["workflow push"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given both workflow key arg and --all flag", () => {
    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command(["workflow push", "foo", "--all"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given --all and a nonexistent workflows index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["workflow push", "--all", "--workflows-dir", "workflows"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate workflow directories in/),
      )
      .it("throws an error");
  });

  describe("given --all and a workflows index directory, without any workflows", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "workflows");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["workflow push", "--all", "--workflows-dir", "workflows"])
      .catch((error) =>
        expect(error.message).to.match(/No workflow directories found in/),
      )
      .it("throws an error");
  });

  describe("given --all and a workflows index directory with 2 workflows", () => {
    const indexDirPath = path.resolve(sandboxDir, "workflows");

    beforeEach(() => {
      const fooWorkflowJson = path.resolve(indexDirPath, "foo", WORKFLOW_JSON);
      fs.outputJsonSync(fooWorkflowJson, { name: "Foo" });

      const barWorkflowJson = path.resolve(indexDirPath, "bar", WORKFLOW_JSON);
      fs.outputJsonSync(barWorkflowJson, { name: "Bar" });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command(["workflow push", "--all", "--workflows-dir", "workflows"])
      .it("calls apiV1 upsertWorkflow with expected props twice", () => {
        // Validate all first
        const stub1 = WorkflowValidate.validateAll as any;
        sinon.assert.calledOnce(stub1);

        const stub2 = KnockApiV1.prototype.upsertWorkflow as any;
        sinon.assert.calledTwice(stub2);

        const expectedArgs = {};
        const expectedFlags = {
          annotate: true,
          "service-token": "valid-token",

          environment: "development",
          all: true,
          "workflows-dir": {
            abspath: indexDirPath,
            exists: true,
          },
        };

        // First upsert call
        sinon.assert.calledWith(
          stub2.firstCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((workflow) =>
            isEqual(workflow, { key: "bar", name: "Bar" }),
          ),
        );

        // Second upsert call
        sinon.assert.calledWith(
          stub2.secondCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((workflow) =>
            isEqual(workflow, { key: "foo", name: "Foo" }),
          ),
        );
      });
  });

  describe("given a branch flag", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, "foo/workflow.json");
      fs.outputJsonSync(abspath, { name: "Foo", key: "foo" });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command(["workflow push", "foo", "--branch", "my-feature-branch-123"])
      .it("calls apiV1 upsertWorkflow with expected params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertWorkflow as any,
          sinon.match(({ args, flags }) => {
            return (
              args.workflowKey === "foo" &&
              flags["service-token"] === "valid-token" &&
              flags.environment === "development" &&
              flags.branch === "my-feature-branch-123" &&
              flags.annotate === true
            );
          }),
          sinon.match(
            (workflow) => workflow.key === "foo" && workflow.name === "Foo",
          ),
        );
      });
  });

  describe("given an environment flag", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, "foo/workflow.json");
      fs.outputJsonSync(abspath, { name: "Foo", key: "foo" });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { workflow: mockWorkflowData } })
      .stdout()
      .command(["workflow push", "foo", "--environment", "staging"])
      .it("calls apiV1 upsertWorkflow with the specified environment", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertWorkflow as any,
          sinon.match(({ args, flags }) => {
            return (
              args.workflowKey === "foo" &&
              flags["service-token"] === "valid-token" &&
              flags.environment === "staging" &&
              flags.annotate === true
            );
          }),
          sinon.match(
            (workflow) => workflow.key === "foo" && workflow.name === "Foo",
          ),
        );
      });
  });
});
