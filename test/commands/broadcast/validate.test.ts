import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { BROADCAST_JSON } from "@/lib/marshal/broadcast";

const broadcastJsonFile = "welcome-broadcast/broadcast.json";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "validateBroadcast", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/broadcast/validate (a single broadcast)", () => {
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

    setupWithStub()
      .stdout()
      .command(["broadcast validate", "welcome-broadcast"])
      .it("calls apiV1 validateBroadcast with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateBroadcast as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { broadcastKey: "welcome-broadcast" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
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
      setupWithStub()
        .stdout()
        .command([
          "broadcast validate",
          "welcome-broadcast",
          "--branch",
          "my-feature-branch-123",
        ])
        .it("calls apiV1 validateBroadcast with expected params", () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.validateBroadcast as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, { broadcastKey: "welcome-broadcast" }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "development",
                  branch: "my-feature-branch-123",
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
      .command(["broadcast validate", "does-not-exist"])
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
      .command(["broadcast validate"])
      .exit(2)
      .it("exits with status 2");
  });
});

describe("commands/broadcast/validate (all broadcasts)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a nonexistent broadcasts index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "broadcast validate",
        "--all",
        "--broadcasts-dir",
        "broadcasts",
      ])
      .catch((error) =>
        expect(error.message).to.match(
          /Cannot locate broadcast directories in/,
        ),
      )
      .it("throws an error");
  });

  describe("given a broadcasts index directory with 2 valid broadcasts", () => {
    const indexDirPath = path.resolve(sandboxDir, "broadcasts");

    beforeEach(() => {
      const fooBroadcastJson = path.resolve(
        indexDirPath,
        "foo",
        BROADCAST_JSON,
      );
      fs.outputJsonSync(fooBroadcastJson, {
        key: "foo",
        name: "Foo Broadcast",
        steps: [],
      });

      const barBroadcastJson = path.resolve(
        indexDirPath,
        "bar",
        BROADCAST_JSON,
      );
      fs.outputJsonSync(barBroadcastJson, {
        key: "bar",
        name: "Bar Broadcast",
        steps: [],
      });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "broadcast validate",
        "--all",
        "--broadcasts-dir",
        "broadcasts",
      ])
      .it("calls apiV1 validateBroadcast with expected props twice", () => {
        const stub = KnockApiV1.prototype.validateBroadcast as any;
        sinon.assert.calledTwice(stub);

        const expectedFlags = {
          "service-token": "valid-token",
          environment: "development",
          all: true,
          "broadcasts-dir": {
            abspath: indexDirPath,
            exists: true,
          },
        };

        sinon.assert.calledWith(
          stub.firstCall,
          sinon.match(({ flags }) => isEqual(flags, expectedFlags)),
          sinon.match((broadcast) =>
            isEqual(broadcast, {
              key: "bar",
              name: "Bar Broadcast",
              steps: [],
            }),
          ),
        );

        sinon.assert.calledWith(
          stub.secondCall,
          sinon.match(({ flags }) => isEqual(flags, expectedFlags)),
          sinon.match((broadcast) =>
            isEqual(broadcast, {
              key: "foo",
              name: "Foo Broadcast",
              steps: [],
            }),
          ),
        );
      });
  });
});
