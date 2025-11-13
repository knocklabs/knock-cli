import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import WorkflowValidate from "@/commands/workflow/validate";

const files = ["a/b/workflow.json", "a/b/c/foo.txt"];
const currCwd = process.cwd();

const channels = [
  factory.channel({ type: "email" }),
  factory.channel({ type: "in_app_feed" }),
];

const setupWithStub = (workflow?: any) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listAllChannels", (stub) =>
      stub.resolves(channels),
    )
    .stub(KnockApiV1.prototype, "getWorkflow", (stub) =>
      stub.resolves(
        workflow
          ? factory.resp({ status: 200, data: workflow })
          : factory.resp({ status: 404 }),
      ),
    );

describe("commands/workflow/new", () => {
  before(() => {
    fs.removeSync(sandboxDir);

    for (const relpath of files) {
      const abspath = path.join(sandboxDir, relpath);
      fs.ensureFileSync(abspath);
    }
  });
  beforeEach(() => {
    process.chdir(sandboxDir);
  });
  after(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("if invoked inside another workflow directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a", "b");
        process.chdir(newCwd);
      })
      .command([
        "workflow new",
        "--name",
        "My New Workflow",
        "--key",
        "my-new-workflow",
      ])
      .catch(
        "Cannot create a new workflow inside an existing workflow directory",
      )
      .it("throws an error");
  });

  describe("given an invalid workflow key, with uppercase chars", () => {
    setupWithStub()
      .command([
        "workflow new",
        "--name",
        "My New Workflow",
        "--key",
        "My-New-Workflow",
        "--steps",
        "delay",
      ])
      .catch((error) => expect(error.message).to.match(/^Invalid workflow key/))
      .it("throws an error");
  });

  describe("given a workflow key for an existing directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "workflow new",
        "--name",
        "My New Workflow",
        "--key",
        "b",
        "--force",
        "--steps",
        "delay",
      ])
      .it("writes a workflow dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "a", "b", "workflow.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given an invalid steps flag, with a nonexistent step tag", () => {
    setupWithStub()
      .command([
        "workflow new",
        "--key",
        "my-new-workflow",
        "--name",
        "My New Workflow",
        "--force",
        "--steps",
        "blah",
      ])
      .catch((error) =>
        expect(error.message).to.match(/^Invalid --steps `blah`/),
      )
      .it("throws an error");
  });

  describe("given a valid workflow key and a steps flag", () => {
    let workflowValidateAllStub: sinon.SinonStub;
    let upsertWorkflowStub: sinon.SinonStub;

    beforeEach(() => {
      workflowValidateAllStub = sinon
        .stub(WorkflowValidate, "validateAll")
        .resolves([]);
      upsertWorkflowStub = sinon
        .stub(KnockApiV1.prototype, "upsertWorkflow")
        .resolves(
          factory.resp({
            status: 200,
            data: {
              workflow: factory.workflow({ key: "my-new-workflow" }),
            },
          }),
        );
    });

    afterEach(() => {
      sinon.restore();
    });

    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })

      .command([
        "workflow new",
        "--key",
        "my-new-workflow",
        "--name",
        "My New Workflow",
        "--force",
        "--push",
        "--steps",
        "delay",
      ])
      .it(
        "generates a new workflow dir with a scaffolded workflow.json",
        () => {
          sinon.assert.calledOnce(workflowValidateAllStub);
          sinon.assert.calledOnce(upsertWorkflowStub);

          const exists = fs.pathExistsSync(
            path.resolve(sandboxDir, "a", "my-new-workflow", "workflow.json"),
          );

          expect(exists).to.equal(true);
        },
      );
  });

  describe("given a valid workflow key and a template flag", () => {
    setupWithStub()
      .command([
        "workflow new",
        "--key",
        "my-new-workflow",
        "--name",
        "My New Workflow",
        "--template",
        // Note: this is real template from the templates repo:
        // https://github.com/knocklabs/templates/tree/main/workflows/reset-password
        "workflows/reset-password",
        "--force",
      ])
      .stdout()
      .it(
        "generates a new workflow dir with a scaffolded workflow.json",
        () => {
          const exists = fs.pathExistsSync(
            path.resolve(sandboxDir, "a", "my-new-workflow", "workflow.json"),
          );

          expect(exists).to.equal(true);
        },
      );
  });
});
