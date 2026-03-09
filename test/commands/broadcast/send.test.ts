import { test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/broadcast/send", () => {
  describe("given confirmation accepted", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "sendBroadcast", (stub) =>
        stub.resolves(
          factory.resp({
            data: { broadcast: factory.broadcast({ status: "sent" }) },
          }),
        ),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.onFirstCall().resolves({ input: true }),
      )
      .stdout()
      .command([
        "broadcast send",
        "my-broadcast",
        "--environment",
        "development",
      ])
      .it("calls apiV1 sendBroadcast with correct params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.sendBroadcast as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { broadcastKey: "my-broadcast" }) &&
              isEqual(flags.environment, "development"),
          ),
        );
      });
  });

  describe("given --force flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "sendBroadcast", (stub) =>
        stub.resolves(
          factory.resp({
            data: { broadcast: factory.broadcast({ status: "sent" }) },
          }),
        ),
      )
      .stdout()
      .command([
        "broadcast send",
        "my-broadcast",
        "--environment",
        "development",
        "--force",
      ])
      .it("calls sendBroadcast without prompting for confirmation", () => {
        sinon.assert.calledOnce(KnockApiV1.prototype.sendBroadcast as any);
      });
  });

  describe("given no environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["broadcast send", "my-broadcast"])
      .exit(2)
      .it("exits with status 2");
  });
});
