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
import { PartialData } from "@/lib/marshal/partial";
import { TranslationData } from "@/lib/marshal/translation";
import { WorkflowData } from "@/lib/marshal/workflow";
import { MessageTypeData } from "@/lib/marshal/message-type";
import { GuideData } from "@/lib/marshal/guide";

const currCwd = process.cwd();

const setupWithListStubs = (
  manyLayoutsAttrs: Partial<EmailLayoutData>[],
  manyPartialsAttrs: Partial<PartialData>[],
  manyTranslationsAttrs: Partial<TranslationData>[],
  manyWorkflowAttrs: Partial<WorkflowData>[],
  manyMessageTypeAttrs: Partial<MessageTypeData>[],
  manyGuideAttrs: Partial<GuideData>[],
) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listEmailLayouts", (stub) =>
      stub.resolves(
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
    .stub(KnockApiV1.prototype, "listPartials", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyPartialsAttrs.map((attrs) => factory.partial(attrs)),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(KnockApiV1.prototype, "listTranslations", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyTranslationsAttrs.map((attrs) =>
              factory.translation(attrs),
            ),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyWorkflowAttrs.map((attrs) => factory.workflow(attrs)),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(KnockApiV1.prototype, "listMessageTypes", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyMessageTypeAttrs.map((attrs) =>
              factory.messageType(attrs),
            ),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(KnockApiV1.prototype, "listGuides", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyGuideAttrs.map((attrs) => factory.guide(attrs)),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

describe("commands/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("without environment flag", () => {
    setupWithListStubs(
      [{ key: "messages" }, { key: "transactional" }],
      [{ key: "partial-a" }, { key: "partial-b" }],
      [{ locale_code: "en" }, { locale_code: "es-MX" }],
      [{ key: "workflow-a" }, { key: "workflow-bar" }],
      [{ key: "message-type-a" }, { key: "message-type-b" }],
      [{ key: "guide-a" }, { key: "guide-b" }],
    )
      .stdout()
      .command(["pull", "--knock-dir", "."])
      .it(
        "calls apiV1 to list resources in the development environment",
        () => {
          assertApiV1ListFunctionsCalled({ environment: "development" });
          sinon.assert.calledOnce(enquirer.prototype.prompt as any);
        },
      );
  });

  describe("with environment flag", () => {
    setupWithListStubs(
      [{ key: "messages" }, { key: "transactional" }],
      [{ key: "partial-a" }, { key: "partial-b" }],
      [{ locale_code: "en" }, { locale_code: "es-MX" }],
      [{ key: "workflow-a" }, { key: "workflow-bar" }],
      [{ key: "message-type-a" }, { key: "message-type-b" }],
      [{ key: "guide-a" }, { key: "guide-b" }],
    )
      .stdout()
      .command(["pull", "--knock-dir", ".", "--environment", "staging"])
      .it("calls apiV1 to list resources in the given environment", () => {
        assertApiV1ListFunctionsCalled({ environment: "staging" });
        sinon.assert.calledOnce(enquirer.prototype.prompt as any);
      });
  });

  describe("with branch flag", () => {
    setupWithListStubs(
      [{ key: "messages" }, { key: "transactional" }],
      [{ key: "partial-a" }, { key: "partial-b" }],
      [{ locale_code: "en" }, { locale_code: "es-MX" }],
      [{ key: "workflow-a" }, { key: "workflow-bar" }],
      [{ key: "message-type-a" }, { key: "message-type-b" }],
      [{ key: "guide-a" }, { key: "guide-b" }],
    )
      .stdout()
      .command([
        "pull",
        "--knock-dir",
        ".",
        "--branch",
        "my-feature-branch-123",
      ])
      .it("calls apiV1 to list resources in the given branch", () => {
        assertApiV1ListFunctionsCalled({
          environment: "development",
          branch: "my-feature-branch-123",
        });
        sinon.assert.calledOnce(enquirer.prototype.prompt as any);
      });
  });

  describe("with hide-uncommitted-changes flag", () => {
    setupWithListStubs(
      [{ key: "messages" }, { key: "transactional" }],
      [{ key: "partial-a" }, { key: "partial-b" }],
      [{ locale_code: "en" }, { locale_code: "es-MX" }],
      [{ key: "workflow-a" }, { key: "workflow-bar" }],
      [{ key: "message-type-a" }, { key: "message-type-b" }],
      [{ key: "guide-a" }, { key: "guide-b" }],
    )
      .stdout()
      .command(["pull", "--knock-dir", ".", "--hide-uncommitted-changes"])
      .it(
        "calls apiV1 to list resources with uncommitted changes hidden",
        () => {
          assertApiV1ListFunctionsCalled({ "hide-uncommitted-changes": true });
          sinon.assert.calledOnce(enquirer.prototype.prompt as any);
        },
      );
  });

  describe("with service-token flag", () => {
    setupWithListStubs(
      [{ key: "messages" }, { key: "transactional" }],
      [{ key: "partial-a" }, { key: "partial-b" }],
      [{ locale_code: "en" }, { locale_code: "es-MX" }],
      [{ key: "workflow-a" }, { key: "workflow-bar" }],
      [{ key: "message-type-a" }, { key: "message-type-b" }],
      [{ key: "guide-a" }, { key: "guide-b" }],
    )
      .env({ KNOCK_SERVICE_TOKEN: null })
      .stdout()
      .command(["pull", "--knock-dir", ".", "--service-token=token123"])
      .it("calls apiV1 to list resources using the given service token", () => {
        assertApiV1ListFunctionsCalled({ "service-token": "token123" });
        sinon.assert.calledOnce(enquirer.prototype.prompt as any);
      });
  });

  describe("with force flag", () => {
    setupWithListStubs(
      [{ key: "messages" }, { key: "transactional" }],
      [{ key: "partial-a" }, { key: "partial-b" }],
      [{ locale_code: "en" }, { locale_code: "es-MX" }],
      [{ key: "workflow-a" }, { key: "workflow-bar" }],
      [{ key: "message-type-a" }, { key: "message-type-b" }],
      [{ key: "guide-a" }, { key: "guide-b" }],
    )
      .stdout()
      .command(["pull", "--knock-dir", ".", "--force"])
      .it("skips the confirmation prompt", () => {
        assertApiV1ListFunctionsCalled({ environment: "development" });
        sinon.assert.notCalled(enquirer.prototype.prompt as any);
      });
  });

  setupWithListStubs(
    [{ key: "layout1" }, { key: "layout2" }],
    [{ key: "partial1" }, { key: "partial2" }],
    [{ locale_code: "en" }, { locale_code: "es-MX" }],
    [{ key: "workflow1" }, { key: "workflow2" }],
    [{ key: "message-type1" }, { key: "message-type2" }],
    [{ key: "guide1" }, { key: "guide2" }],
  )
    .stdout()
    .command(["pull", "--knock-dir", "resources"])
    .it(
      "writes directories to the file system, with individual dirs inside",
      () => {
        const path1 = path.resolve(
          sandboxDir,
          "resources",
          "layouts",
          "layout1",
        );
        expect(fs.pathExistsSync(path1)).to.equal(true);

        const path2 = path.resolve(
          sandboxDir,
          "resources",
          "layouts",
          "layout2",
        );
        expect(fs.pathExistsSync(path2)).to.equal(true);

        const path3 = path.resolve(
          sandboxDir,
          "resources",
          "partials",
          "partial1",
        );
        expect(fs.pathExistsSync(path3)).to.equal(true);

        const path4 = path.resolve(
          sandboxDir,
          "resources",
          "partials",
          "partial2",
        );
        expect(fs.pathExistsSync(path4)).to.equal(true);

        const path5 = path.resolve(
          sandboxDir,
          "resources",
          "translations",
          "en",
        );
        expect(fs.pathExistsSync(path5)).to.equal(true);

        const path6 = path.resolve(
          sandboxDir,
          "resources",
          "translations",
          "es-MX",
        );
        expect(fs.pathExistsSync(path6)).to.equal(true);

        const path7 = path.resolve(
          sandboxDir,
          "resources",
          "workflows",
          "workflow1",
        );
        expect(fs.pathExistsSync(path7)).to.equal(true);

        const path8 = path.resolve(
          sandboxDir,
          "resources",
          "workflows",
          "workflow2",
        );
        expect(fs.pathExistsSync(path8)).to.equal(true);

        const path9 = path.resolve(
          sandboxDir,
          "resources",
          "message-types",
          "message-type1",
        );
        expect(fs.pathExistsSync(path9)).to.equal(true);

        const path10 = path.resolve(
          sandboxDir,
          "resources",
          "message-types",
          "message-type2",
        );
        expect(fs.pathExistsSync(path10)).to.equal(true);

        const path11 = path.resolve(
          sandboxDir,
          "resources",
          "guides",
          "guide1",
        );
        expect(fs.pathExistsSync(path11)).to.equal(true);

        const path12 = path.resolve(
          sandboxDir,
          "resources",
          "guides",
          "guide2",
        );
        expect(fs.pathExistsSync(path12)).to.equal(true);
      },
    );

  describe("without directory", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["pull"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("without service token", () => {
    test
      .command(["pull", "--knock-dir", "."])
      .exit(2)
      .it("exits with status 2");
  });
});

function assertApiV1ListFunctionsCalled(
  expectedFlags: Record<string, unknown> = {},
) {
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
          force: true,
          annotate: true,
          limit: 100,
          ...expectedFlags,
        }),
    ),
  );

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
          force: true,
          annotate: true,
          limit: 100,
          ...expectedFlags,
        }),
    ),
  );

  sinon.assert.calledWith(
    KnockApiV1.prototype.listTranslations as any,
    sinon.match(
      ({ args, flags }) =>
        isEqual(args, {}) &&
        isEqual(flags, {
          all: true,
          "translations-dir": {
            abspath: path.resolve(sandboxDir, "translations"),
            exists: false,
          },
          "service-token": "valid-token",
          environment: "development",
          force: true,
          limit: 100,
          format: "json",
          ...expectedFlags,
        }),
    ),
  );

  sinon.assert.calledWith(
    KnockApiV1.prototype.listWorkflows as any,
    sinon.match(
      ({ args, flags }) =>
        isEqual(args, {}) &&
        isEqual(flags, {
          all: true,
          "workflows-dir": {
            abspath: path.resolve(sandboxDir, "workflows"),
            exists: false,
          },
          "service-token": "valid-token",
          environment: "development",
          force: true,
          annotate: true,
          limit: 100,
          ...expectedFlags,
        }),
    ),
  );
}
