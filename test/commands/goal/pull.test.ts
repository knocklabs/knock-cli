import * as path from "node:path";

import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { sandboxDir } from "@/lib/helpers/const";
import { GOAL_JSON, GoalData } from "@/lib/marshal/goal";
import { WithAnnotation } from "@/lib/marshal/shared/types";

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

function createAsyncIterator<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const item of items) {
        yield item;
      }
    },
  };
}

const setupWithStub = (goalData = mockGoalData) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.resolves({ input: true }),
    )
    .stub(KnockMgmt.Goals.prototype, "retrieve", (stub) =>
      stub.resolves(goalData),
    );

const currCwd = process.cwd();

describe("commands/goal/pull (a single goal)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a goal key arg", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["goal pull", "trial-conversion", "--force"])
      .it("calls goals.retrieve with expected props", () => {
        sinon.assert.calledWith(
          KnockMgmt.Goals.prototype.retrieve as sinon.SinonStub,
          "trial-conversion",
          sinon.match({
            annotate: true,
          }),
        );
      });

    setupWithStub()
      .stdout()
      .command(["goal pull", "trial-conversion", "--force"])
      .it("creates the goal directory with condition-based goal.json", () => {
        const goalJsonPath = path.resolve(
          sandboxDir,
          "trial-conversion",
          GOAL_JSON,
        );
        expect(fs.existsSync(goalJsonPath)).to.be.true;

        const goalJson = fs.readJsonSync(goalJsonPath);
        expect(goalJson.name).to.equal("Trial Conversion");
        expect(goalJson.condition.event.event_type).to.equal(
          "integration_source",
        );
        expect(goalJson).to.not.have.property("target");
        expect(goalJson).to.not.have.property("window");
      });
  });

  describe("given both goal key arg and --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["goal pull", "trial-conversion", "--all"])
      .exit(2)
      .it("exits with status 2");
  });
});

describe("commands/goal/pull (all goals)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given --all flag with goals-dir", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: true }),
      )
      .stub(KnockMgmt.Goals.prototype, "list", (stub) =>
        stub.returns(createAsyncIterator([mockGoalData])),
      )
      .stdout()
      .command(["goal pull", "--all", "--goals-dir", "goals", "--force"])
      .it("calls goals.list and creates goal directories", () => {
        sinon.assert.calledOnce(
          KnockMgmt.Goals.prototype.list as sinon.SinonStub,
        );

        const goalJsonPath = path.resolve(
          sandboxDir,
          "goals",
          "trial-conversion",
          GOAL_JSON,
        );
        expect(fs.existsSync(goalJsonPath)).to.be.true;
      });
  });
});
