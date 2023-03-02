import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const workflowJsonFile = "new-comment/workflow.json";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "validateWorkflow",
      sinon.stub().resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/workflow/validate", () => {
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
                "api-origin": undefined,
                environment: "development",
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

  describe("given no workflow key arg", () => {
    setupWithStub()
      .stdout()
      .command(["workflow validate"])
      .exit(2)
      .it("exists with status 2");
  });
});
