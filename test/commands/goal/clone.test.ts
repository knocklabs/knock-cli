import KnockMgmt from "@knocklabs/mgmt";
import { test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import KnockApiV1 from "@/lib/api-v1";

describe("commands/goal/clone", () => {
  describe("given no goal key args", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["goal clone"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given source and new goal keys with --force", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getDefaultEnvironmentSlug", (stub) =>
        stub.resolves("development"),
      )
      .stub(KnockMgmt.Goals.prototype, "clone", (stub) =>
        stub.resolves({
          goal: {
            key: "trial-conversion-copy",
            name: "trial-conversion-copy",
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
      )
      .stdout()
      .command([
        "goal clone",
        "trial-conversion",
        "trial-conversion-copy",
        "--force",
      ])
      .it("calls goals.clone with a clone envelope", () => {
        sinon.assert.calledWith(
          KnockMgmt.Goals.prototype.clone as sinon.SinonStub,
          "trial-conversion",
          sinon.match({
            environment: undefined,
            clone: {
              key: "trial-conversion-copy",
              name: "trial-conversion-copy",
              environment: "development",
            },
          }),
        );
      });
  });

  describe("given --name and --dest-environment flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: true }),
      )
      .stub(KnockMgmt.Goals.prototype, "clone", (stub) =>
        stub.resolves({
          goal: {
            key: "trial-conversion-copy",
            name: "Trial Conversion Copy",
            condition: {
              event: {
                event_type: "integration_source",
                event_key: "order.completed",
                integration_source_key: "stripe",
              },
            },
            environment: "production",
            created_at: "2023-09-18T18:32:18.398053Z",
            updated_at: "2023-09-29T19:08:04.129228Z",
            sha: "<SOME_SHA>",
          },
        }),
      )
      .stdout()
      .command([
        "goal clone",
        "trial-conversion",
        "trial-conversion-copy",
        "--name",
        "Trial Conversion Copy",
        "--dest-environment",
        "production",
        "--force",
      ])
      .it("passes custom name and destination environment", () => {
        sinon.assert.calledWith(
          KnockMgmt.Goals.prototype.clone as sinon.SinonStub,
          "trial-conversion",
          sinon.match({
            clone: {
              key: "trial-conversion-copy",
              name: "Trial Conversion Copy",
              environment: "production",
            },
          }),
        );
      });
  });
});
