import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import type { BroadcastData } from "@/lib/marshal/broadcast";

const currCwd = process.cwd();

const setupWithGetBroadcastStub = (broadcastAttrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getBroadcast", (stub) =>
      stub.resolves(
        factory.resp({
          data: factory.broadcast(broadcastAttrs),
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: true }),
    );

const setupWithListBroadcastsStub = (
  ...manyBroadcastsAttrs: Partial<BroadcastData>[]
) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listBroadcasts", (stub) =>
      stub.resolves(
        factory.resp({
          data: factory.paginatedResp(
            manyBroadcastsAttrs.map((attrs) => factory.broadcast(attrs)),
          ),
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: true }),
    );

describe("commands/broadcast/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a broadcast key arg", () => {
    setupWithGetBroadcastStub({ key: "onboarding" })
      .stdout()
      .command(["broadcast pull", "onboarding"])
      .it("calls apiV1 getBroadcast with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getBroadcast as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                broadcastKey: "onboarding",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
              }),
          ),
        );
      });

    setupWithGetBroadcastStub({ key: "welcome" })
      .stdout()
      .command(["broadcast pull", "welcome"])
      .it("writes a broadcast dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "welcome", "broadcast.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a --all flag", () => {
    setupWithListBroadcastsStub({ key: "onboarding" }, { key: "welcome" })
      .stdout()
      .command(["broadcast pull", "--all", "--broadcasts-dir", "./broadcasts"])
      .it("calls apiV1 listBroadcasts with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listBroadcasts as any,
          sinon.match(
            ({ flags }) =>
              isEqual(flags.annotate, true) &&
              isEqual(flags["service-token"], "valid-token"),
          ),
        );
      });
  });

  describe("given both broadcast key arg and --all flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["broadcast pull", "foo", "--all"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no broadcast key arg nor --all flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["broadcast pull"])
      .catch((error) =>
        expect(error.message).to.match(/Missing 1 required arg/),
      )
      .it("throws an error");
  });
});
