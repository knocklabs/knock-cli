import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { EmailLayoutData } from "@/lib/marshal/email-layout";

const currCwd = process.cwd();

const setupWithGetLayoutStub = (emailLayoutAttrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "getEmailLayout",
      sinon.stub().resolves(
        factory.resp({
          data: factory.emailLayout(emailLayoutAttrs),
        }),
      ),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

const setupWithListLayoutsStub = (
  ...manyLayoutsAttrs: Partial<EmailLayoutData>[]
) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "listEmailLayouts",
      sinon.stub().resolves(
        factory.resp({
          data: {
            entries: manyLayoutsAttrs.map((attrs) =>
              factory.emailLayout(attrs),
            ),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

describe("commands/layout/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given an email layout key arg", () => {
    setupWithGetLayoutStub({ key: "default" })
      .stdout()
      .command(["layout pull", "default"])
      .it("calls apiV1 getEmailLayout with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getEmailLayout as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                emailLayoutKey: "default",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
              }),
          ),
        );
      });

    setupWithGetLayoutStub({ key: "messages" })
      .stdout()
      .command(["layout pull", "messages"])
      .it("writes an email layout dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "messages", "layout.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a --all flag", () => {
    setupWithListLayoutsStub({ key: "messages" }, { key: "transactional" })
      .stdout()
      .command(["layout pull", "--all", "--layouts-dir", "./layouts"])
      .it("calls apiV1 listEmailLayouts with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listEmailLayouts as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                all: true,
                "layouts-dir": {
                  abspath: path.resolve(sandboxDir, "layouts"),
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

    setupWithListLayoutsStub(
      { key: "default" },
      { key: "messages" },
      { key: "transactional" },
    )
      .stdout()
      .command(["layout pull", "--all", "--layouts-dir", "./layouts"])
      .it(
        "writes a layout dir to the file system, with individual layouts dirs inside (plus a layout JSON file)",
        () => {
          const path1 = path.resolve(
            sandboxDir,
            "layouts",
            "default",
            "layout.json",
          );
          expect(fs.pathExistsSync(path1)).to.equal(true);

          const path2 = path.resolve(
            sandboxDir,
            "layouts",
            "messages",
            "layout.json",
          );
          expect(fs.pathExistsSync(path2)).to.equal(true);

          const path3 = path.resolve(
            sandboxDir,
            "layouts",
            "transactional",
            "layout.json",
          );
          expect(fs.pathExistsSync(path3)).to.equal(true);
        },
      );
  });

  describe("given both an email layout key arg and a --all flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["layout pull", "default", "--all"])
      .catch(
        "emailLayoutKey arg `default` cannot also be provided when using --all",
      )
      .it("throws an error");
  });
});
