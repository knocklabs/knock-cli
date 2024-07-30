import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { PartialData } from "@/lib/marshal/partial";

const currCwd = process.cwd();

const setupWithGetPartialStub = (partialAttrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getPartial", (stub) =>
      stub.resolves(
        factory.resp({
          data: factory.partial(partialAttrs),
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

const setupWithListPartialsStub = (
  ...manyPartialAttrs: Partial<PartialData>[]
) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listPartials", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyPartialAttrs.map((attrs) => factory.partial(attrs)),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

describe("commands/partial/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a partial key arg", () => {
    setupWithGetPartialStub({ key: "partial-x" })
      .stdout()
      .command(["partial pull", "partial-x"])
      .it("calls apiV1 getPartial with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getPartial as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                partialKey: "partial-x",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",

                environment: "development",
                annotate: true,
              }),
          ),
        );
      });

    setupWithGetPartialStub({ key: "partial-y" })
      .stdout()
      .command(["partial pull", "partial-y"])
      .it("writes a partial dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "partial-y", "partial.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a --all flag", () => {
    setupWithListPartialsStub({ key: "partial-a" }, { key: "partial-bar" })
      .stdout()
      .command(["partial pull", "--all", "--partials-dir", "./partials"])
      .it("calls apiV1 listPartials with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listPartials as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                all: true,
                "partials-dir": {
                  abspath: path.resolve(sandboxDir, "partials"),
                  exists: false,
                },
                "service-token": "valid-token",

                environment: "development",
                annotate: true,
                limit: 100,
              }),
          ),
        );
      });

    setupWithListPartialsStub(
      { key: "partial-foo" },
      { key: "partial-two" },
      { key: "partial-c" },
    )
      .stdout()
      .command(["partial pull", "--all", "--partials-dir", "./partials"])
      .it(
        "writes a partials dir to the file system, with individual partial dirs inside",
        () => {
          const path1 = path.resolve(sandboxDir, "partials", "partial-foo");
          expect(fs.pathExistsSync(path1)).to.equal(true);

          const path2 = path.resolve(sandboxDir, "partials", "partial-two");
          expect(fs.pathExistsSync(path2)).to.equal(true);

          const path3 = path.resolve(sandboxDir, "partials", "partial-c");
          expect(fs.pathExistsSync(path3)).to.equal(true);
        },
      );
  });

  describe("given both a partial key arg and a --all flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["partial pull", "partial-x", "--all"])
      .catch(
        "partialKey arg `partial-x` cannot also be provided when using --all",
      )
      .it("throws an error");
  });
});
