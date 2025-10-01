import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { WORKFLOW_JSON } from "@/lib/marshal/workflow";

const workflowJsonFile = "new-comment/workflow.json";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "validateWorkflow", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/workflow/validate (a single workflow)", () => {
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

    setupWithStub()
      .stdout()
      .command(["workflow validate", "new-comment"])
      .it("calls apiV1 validateWorkflow with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { workflowKey: "new-comment" }) &&
              isEqual(flags, {
                "service-token": "valid-token",

                environment: "development",
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
  });

  describe("given a workflow.json file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, workflowJsonFile);
      fs.outputFileSync(abspath, '{"name":"New comment",}');

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["workflow validate", "new-comment"])
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
      .command(["workflow validate", "new-comment"])
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

    setupWithStub()
      .stdout()
      .command(["workflow validate", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate a workflow directory/),
      )
      .it("throws an error");
  });

  describe("given no workflow key arg nor --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["workflow validate"])
      .exit(2)
      .it("exits with status 2");
  });
});

describe("commands/workflow/validate (all workflows)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a nonexistent workflows index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["workflow validate", "--all", "--workflows-dir", "workflows"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate workflow directories in/),
      )
      .it("throws an error");
  });

  describe("given a workflows index directory, without any workflows", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "workflows");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["workflow validate", "--all", "--workflows-dir", "workflows"])
      .catch((error) =>
        expect(error.message).to.match(/No workflow directories found in/),
      )
      .it("throws an error");
  });

  describe("given a workflows index directory with 2 valid workflows", () => {
    const indexDirPath = path.resolve(sandboxDir, "workflows");

    beforeEach(() => {
      const fooWorkflowJson = path.resolve(indexDirPath, "foo", WORKFLOW_JSON);
      fs.outputJsonSync(fooWorkflowJson, { name: "Foo" });

      const barWorkflowJson = path.resolve(indexDirPath, "bar", WORKFLOW_JSON);
      fs.outputJsonSync(barWorkflowJson, { name: "Bar" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["workflow validate", "--all", "--workflows-dir", "workflows"])
      .it("calls apiV1 validateWorkflow with expected props twice", () => {
        const stub = KnockApiV1.prototype.validateWorkflow as any;
        sinon.assert.calledTwice(stub);

        const expectedArgs = {};
        const expectedFlags = {
          "service-token": "valid-token",

          environment: "development",
          all: true,
          "workflows-dir": {
            abspath: indexDirPath,
            exists: true,
          },
        };

        // First validate call
        sinon.assert.calledWith(
          stub.firstCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((workflow) =>
            isEqual(workflow, { key: "bar", name: "Bar" }),
          ),
        );

        // Second validate call
        sinon.assert.calledWith(
          stub.secondCall,
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

  describe("given a workflows index directory, with 1 valid and 1 invalid workflows", () => {
    const indexDirPath = path.resolve(sandboxDir, "workflows");

    beforeEach(() => {
      const fooWorkflowJson = path.resolve(indexDirPath, "foo", WORKFLOW_JSON);
      fs.outputJsonSync(fooWorkflowJson, { name: "Foo" });

      const barWorkflowJson = path.resolve(indexDirPath, "bar", WORKFLOW_JSON);
      fs.outputJsonSync(barWorkflowJson, { name: 6 });

      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateWorkflow", (stub) =>
        stub
          .onFirstCall()
          .resolves(
            factory.resp({
              status: 422,
              data: {
                errors: [{ field: "name", message: "must be a string" }],
              },
            }),
          )
          .onSecondCall()
          .resolves(factory.resp()),
      )
      .stdout()
      .command(["workflow validate", "--all", "--workflows-dir", "workflows"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError: data at "name" must be a string/,
        ),
      )
      .it("calls apiV1 validateWorkflow twice, then errors", () => {
        const stub = KnockApiV1.prototype.validateWorkflow as any;
        sinon.assert.calledTwice(stub);
      });
  });

  describe("given a branch flag", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, "foo/workflow.json");
      fs.outputJsonSync(abspath, { name: "Foo", key: "foo" });

      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateWorkflow", (stub) =>
        stub.resolves(factory.resp({ data: { workflow: factory.workflow() } })),
      )
      .stdout()
      .command([
        "workflow validate",
        "foo",
        "--branch",
        "my-feature-branch-123",
      ])
      .it("calls apiV1 validateWorkflow with expected params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateWorkflow as any,
          sinon.match(({ args, flags }) => {
            return (
              args.workflowKey === "foo" &&
              flags["service-token"] === "valid-token" &&
              flags.environment === "development" &&
              flags.branch === "my-feature-branch-123"
            );
          }),
          sinon.match(
            (workflow) => workflow.key === "foo" && workflow.name === "Foo",
          ),
        );
      });
  });
});
