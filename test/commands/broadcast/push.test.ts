import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import BroadcastValidate from "@/commands/broadcast/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const broadcastJsonFile = "welcome-broadcast/broadcast.json";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(BroadcastValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertBroadcast", (stub) =>
      stub.resolves(
        factory.resp({
          data: { broadcast: factory.broadcast(attrs) },
        }),
      ),
    );

const currCwd = process.cwd();

describe("commands/broadcast/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a broadcast directory exists, for the broadcast key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, broadcastJsonFile);
      fs.outputJsonSync(abspath, {
        key: "welcome-broadcast",
        name: "Welcome Broadcast",
        steps: [],
      });

      process.chdir(sandboxDir);
    });

    setupWithStub({ key: "welcome-broadcast" })
      .stdout()
      .command(["broadcast push", "welcome-broadcast"])
      .it("calls apiV1 upsertBroadcast with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertBroadcast as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { broadcastKey: "welcome-broadcast" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
              }),
          ),
          sinon.match((broadcast) =>
            isEqual(broadcast, {
              key: "welcome-broadcast",
              name: "Welcome Broadcast",
              steps: [],
            }),
          ),
        );
      });

    describe("given a branch flag", () => {
      setupWithStub({ key: "welcome-broadcast" })
        .stdout()
        .command([
          "broadcast push",
          "welcome-broadcast",
          "--branch",
          "my-feature-branch-123",
        ])
        .it("calls apiV1 upsertBroadcast with expected params", () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.upsertBroadcast as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, { broadcastKey: "welcome-broadcast" }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "development",
                  branch: "my-feature-branch-123",
                  annotate: true,
                }),
            ),
            sinon.match((broadcast) =>
              isEqual(broadcast, {
                key: "welcome-broadcast",
                name: "Welcome Broadcast",
                steps: [],
              }),
            ),
          );
        });
    });
  });

  describe("given a nonexistent broadcast directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["broadcast push", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(
          /^Cannot locate a broadcast directory at/,
        ),
      )
      .it("throws an error");
  });

  describe("given no broadcast key arg nor --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["broadcast push"])
      .exit(2)
      .it("exits with status 2");
  });
});
