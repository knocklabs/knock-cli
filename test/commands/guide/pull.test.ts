import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { GuideData } from "@/lib/marshal/guide";

const currCwd = process.cwd();

const setupWithGetGuideStub = (guideAttrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getGuide", (stub) =>
      stub.resolves(
        factory.resp({
          data: factory.guide(guideAttrs),
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

const setupWithListGuidesStub = (...manyGuidesAttrs: Partial<GuideData>[]) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listGuides", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyGuidesAttrs.map((attrs) => factory.guide(attrs)),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

describe("commands/guide/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a guide key arg", () => {
    setupWithGetGuideStub({ key: "onboarding" })
      .stdout()
      .command(["guide pull", "onboarding"])
      .it("calls apiV1 getGuide with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getGuide as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                guideKey: "onboarding",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
              }),
          ),
        );
      });

    setupWithGetGuideStub({ key: "welcome" })
      .stdout()
      .command(["guide pull", "welcome"])
      .it("writes a guide dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "welcome", "guide.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a --all flag", () => {
    setupWithListGuidesStub({ key: "onboarding" }, { key: "welcome" })
      .stdout()
      .command(["guide pull", "--all", "--guides-dir", "./guides"])
      .it("calls apiV1 listGuides with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listGuides as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                all: true,
                "guides-dir": {
                  abspath: path.resolve(sandboxDir, "guides"),
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

    setupWithListGuidesStub(
      { key: "onboarding" },
      { key: "welcome" },
      { key: "tutorial" },
    )
      .stdout()
      .command(["guide pull", "--all", "--guides-dir", "./guides"])
      .it(
        "writes a guides dir to the file system, with individual guide dirs inside",
        () => {
          const path1 = path.resolve(
            sandboxDir,
            "guides",
            "onboarding",
            "guide.json",
          );
          expect(fs.pathExistsSync(path1)).to.equal(true);

          const path2 = path.resolve(
            sandboxDir,
            "guides",
            "welcome",
            "guide.json",
          );
          expect(fs.pathExistsSync(path2)).to.equal(true);

          const path3 = path.resolve(
            sandboxDir,
            "guides",
            "tutorial",
            "guide.json",
          );
          expect(fs.pathExistsSync(path3)).to.equal(true);
        },
      );
  });

  describe("given both a guide key arg and a --all flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["guide pull", "onboarding", "--all"])
      .catch(
        "guideKey arg `onboarding` cannot also be provided when using --all",
      )
      .it("throws an error");
  });
});
