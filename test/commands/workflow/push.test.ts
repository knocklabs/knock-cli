import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { WorkflowData } from "@/lib/marshal/workflow";

const workflowJsonFile = "new-comment/workflow.json";

const mockWorkflowData: WorkflowData<WithAnnotation> = {
  name: "New comment",
  key: "new-comment",
  active: false,
  valid: false,
  steps: [],
  created_at: "2022-12-31T12:00:00.000000Z",
  updated_at: "2022-12-31T12:00:00.000000Z",
  __annotation: {
    extractable_fields: {},
    readonly_fields: [
      "environment",
      "key",
      "active",
      "valid",
      "created_at",
      "updated_at",
    ],
  },
};

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "upsertWorkflow",
      sinon.stub().resolves(factory.resp(attrs)),
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
      .it("calls apiV1 upsertWorkflow with correct inner flags", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { workflowKey: "new-comment" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                environment: "development",
                // Internally set flags
                annotate: true,
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
                "api-origin": undefined,
                environment: "development",
                // Commit flags
                commit: true,
                commit_message: "this is a commit comment!",
                // Internally set flags
                annotate: true,
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
          name: "New comment",
          steps: [],
          __readonly: {
            key: "new-comment",
            active: false,
            valid: false,
            created_at: "2022-12-31T12:00:00.000000Z",
            updated_at: "2022-12-31T12:00:00.000000Z",
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
      .catch((error) =>
        expect(error.message).to.match(/^Found the following errors in/),
      )
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
});
