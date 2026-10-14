import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { GOAL_JSON } from "@/lib/marshal/goal";

const currCwd = process.cwd();

describe("commands/goal/new", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .command(["goal new", "trial-conversion"])
    .it("writes a source-event goal.json scaffold", () => {
      const goalJsonPath = path.resolve(
        sandboxDir,
        "trial-conversion",
        GOAL_JSON,
      );
      expect(fs.existsSync(goalJsonPath)).to.be.true;

      const goalJson = fs.readJsonSync(goalJsonPath);
      expect(goalJson).to.eql({
        name: "trial-conversion",
        condition: {
          event: {
            event_type: "integration_source",
            event_key: "",
            integration_source_key: "",
            recipient_path: "body.userId",
          },
        },
      });
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(() => {
      fs.outputJsonSync(
        path.resolve(sandboxDir, "trial-conversion", GOAL_JSON),
        { name: "existing" },
      );
    })
    .stdout()
    .command(["goal new", "trial-conversion"])
    .catch((error) => expect(error.message).to.match(/already exists/))
    .it("errors when the goal directory already exists");

  describe("given inside an existing resource directory", () => {
    beforeEach(() => {
      const workflowJsonPath = path.resolve(
        sandboxDir,
        "my-workflow",
        "workflow.json",
      );
      fs.outputJsonSync(workflowJsonPath, { name: "My Workflow" });
      process.chdir(path.resolve(sandboxDir, "my-workflow"));
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["goal new", "nested-goal"])
      .catch((error) =>
        expect(error.message).to.match(
          /Cannot create a new goal inside an existing/,
        ),
      )
      .it("throws an error");
  });
});
