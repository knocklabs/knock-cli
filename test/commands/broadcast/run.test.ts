import { test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const setupWithStub = () =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "runBroadcast", (stub) =>
      stub.resolves(
        factory.resp({
          data: { broadcast_run_id: "run-123", request_id: "req-123" },
        }),
      ),
    );

describe("commands/broadcast/run", () => {
  describe("given no broadcast key arg", () => {
    setupWithStub()
      .stdout()
      .command(["broadcast run"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no recipient flag", () => {
    setupWithStub()
      .stdout()
      .command(["broadcast run", "welcome-broadcast"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a broadcast key and a recipient", () => {
    setupWithStub()
      .stdout()
      .command([
        "broadcast run",
        "welcome-broadcast",
        "--environment",
        "development",
        "--recipient",
        "user-1",
      ])
      .it("calls apiV1 runBroadcast with the recipient user id", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.runBroadcast as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { broadcastKey: "welcome-broadcast" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                recipient: "user-1",
              }),
          ),
        );
      });
  });

  describe("given tenant, sandbox-mode, and skip-delay flags", () => {
    setupWithStub()
      .stdout()
      .command([
        "broadcast run",
        "welcome-broadcast",
        "--recipient",
        "user-1",
        "--tenant",
        "tenant-1",
        "--sandbox-mode",
        "--skip-delay",
        "--branch",
        "my-feature-branch-123",
      ])
      .it("calls apiV1 runBroadcast with the run options", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.runBroadcast as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { broadcastKey: "welcome-broadcast" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                branch: "my-feature-branch-123",
                recipient: "user-1",
                tenant: "tenant-1",
                "sandbox-mode": true,
                "skip-delay": true,
              }),
          ),
        );
      });
  });
});
