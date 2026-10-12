import * as path from "node:path";

import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { sandboxDir } from "@/lib/helpers/const";

const goalJsonFile = "trial-conversion/goal.json";

const setupWithStub = () =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockMgmt.Goals.prototype, "validate", (stub) =>
      stub.resolves({
        goal: {
          key: "trial-conversion",
          name: "Trial Conversion",
          condition: {
            event: {
              event_type: "integration_source",
              event_key: "order.completed",
              integration_source_key: "stripe",
            },
          },
          environment: "development",
          created_at: "2023-09-18T18:32:18.398053Z",
          updated_at: "2023-09-29T19:08:04.129228Z",
          sha: "<SOME_SHA>",
        },
      }),
    );

const currCwd = process.cwd();

describe("commands/goal/validate", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a goal directory exists", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, goalJsonFile);
      fs.outputJsonSync(abspath, {
        name: "Trial Conversion",
        condition: {
          event: {
            event_type: "integration_source",
            event_key: "order.completed",
            integration_source_key: "stripe",
          },
        },
      });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["goal validate", "trial-conversion"])
      .it("calls goals.validate with a goal envelope", () => {
        sinon.assert.calledWith(
          KnockMgmt.Goals.prototype.validate as sinon.SinonStub,
          "trial-conversion",
          sinon.match({
            goal: sinon.match({
              name: "Trial Conversion",
              condition: sinon.match({
                event: sinon.match({
                  event_type: "integration_source",
                }),
              }),
            }),
          }),
        );
      });
  });

  describe("given validate fails", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, goalJsonFile);
      fs.outputJsonSync(abspath, {
        name: "Trial Conversion",
        condition: {
          event: {
            event_type: "integration_source",
            event_key: "",
            integration_source_key: "",
          },
        },
      });

      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Goals.prototype, "validate", (stub) =>
        stub.rejects(new Error("event_key must be present")),
      )
      .stdout()
      .command(["goal validate", "trial-conversion"])
      .catch((error) =>
        expect(error.message).to.match(/event_key must be present/),
      )
      .it("surfaces the API validation error");
  });
});
