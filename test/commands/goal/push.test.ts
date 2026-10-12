import * as path from "node:path";

import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import GoalValidate from "@/commands/goal/validate";
import { sandboxDir } from "@/lib/helpers/const";
import { GOAL_JSON, GoalData } from "@/lib/marshal/goal";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const goalJsonFile = "trial-conversion/goal.json";

const mockGoalData: GoalData<WithAnnotation> = {
  key: "trial-conversion",
  name: "Trial Conversion",
  description: "Tracks when a trial user converts to paid",
  condition: {
    event: {
      event_type: "integration_source",
      event_key: "order.completed",
      integration_source_key: "stripe",
      recipient_path: "body.userId",
    },
  },
  environment: "development",
  updated_at: "2023-09-29T19:08:04.129228Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {},
    readonly_fields: ["environment", "key", "created_at", "updated_at", "sha"],
  },
};

const setupWithStub = (goalData = mockGoalData) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(GoalValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockMgmt.Goals.prototype, "upsert", (stub) =>
      stub.resolves({ goal: goalData }),
    );

const currCwd = process.cwd();

describe("commands/goal/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a goal directory exists, for the goal key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, goalJsonFile);
      fs.outputJsonSync(abspath, {
        name: "Trial Conversion",
        description: "Tracks when a trial user converts to paid",
        condition: {
          event: {
            event_type: "integration_source",
            event_key: "order.completed",
            integration_source_key: "stripe",
            recipient_path: "body.userId",
          },
        },
      });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["goal push", "trial-conversion"])
      .it(
        "calls goals.upsert with a goal envelope and no target/window",
        () => {
          sinon.assert.calledWith(
            KnockMgmt.Goals.prototype.upsert as sinon.SinonStub,
            "trial-conversion",
            sinon.match({
              annotate: true,
              goal: sinon.match({
                name: "Trial Conversion",
                condition: sinon.match({
                  event: sinon.match({
                    event_type: "integration_source",
                    event_key: "order.completed",
                    integration_source_key: "stripe",
                  }),
                }),
              }),
            }),
          );

          const [, params] = (
            KnockMgmt.Goals.prototype.upsert as sinon.SinonStub
          ).firstCall.args;
          expect(params.goal).to.not.have.property("target");
          expect(params.goal).to.not.have.property("window");
          expect(params.goal).to.not.have.property("key");
        },
      );
  });

  describe("given --all with multiple goal directories", () => {
    beforeEach(() => {
      fs.outputJsonSync(
        path.resolve(sandboxDir, "goals", "trial-conversion", GOAL_JSON),
        {
          name: "Trial Conversion",
          condition: {
            event: {
              event_type: "integration_source",
              event_key: "order.completed",
              integration_source_key: "stripe",
            },
          },
        },
      );
      fs.outputJsonSync(
        path.resolve(sandboxDir, "goals", "audience-enter", GOAL_JSON),
        {
          name: "Audience Enter",
          condition: {
            event: {
              event_type: "audience",
              audience_key: "vip",
              event_key: "enter",
            },
          },
        },
      );

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["goal push", "--all", "--goals-dir", "goals"])
      .it("pushes every local goal file", () => {
        sinon.assert.calledTwice(
          KnockMgmt.Goals.prototype.upsert as sinon.SinonStub,
        );
      });
  });
});
