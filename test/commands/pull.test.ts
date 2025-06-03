import { test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import * as path from "node:path";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { EmailLayoutData } from "@/lib/marshal/email-layout";
import { PartialData } from "@/lib/marshal/partial";
import { TranslationData } from "@/lib/marshal/translation";
import { WorkflowData } from "@/lib/marshal/workflow";
import { isEqual } from "lodash";
import * as sinon from "sinon";

const currCwd = process.cwd();

const setupWithListStubs = (
  manyLayoutsAttrs: Partial<EmailLayoutData>[],
  manyPartialsAttrs: Partial<PartialData>[],
  manyTranslationsAttrs: Partial<TranslationData>[],
  manyWorkflowAttrs: Partial<WorkflowData>[],
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

  setupWithListStubs(
    [{ key: "messages" }, { key: "transactional" }],
    [{ key: "partial-a" }, { key: "partial-b" }],
    [{ locale_code: "en" }, { locale_code: "es-MX" }],
    [{ key: "workflow-a" }, { key: "workflow-bar" }],
  )
    .stdout()
    .command(["pull", "--dir", "."])
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
              force: true,
              annotate: true,
              limit: 100,
            }),
        ),
      );
    });

  // describe("given a valid service token via flag", () => {
  //   test
  //     .stdout()
  //     .command(["pull", "--service-token", "valid-token"])
  //     .it("runs the command", (ctx) => {
  //       expect(ctx.stdout).to.contain("TODO");
  //     });
  // });

  // describe("given a valid service token via env var", () => {
  //   test
  //     .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
  //     .stdout()
  //     .command(["pull"])
  //     .it("runs the command", (ctx) => {
  //       expect(ctx.stdout).to.contain("TODO");
  //     });
  // });

  describe("given no service token flag", () => {
    test.command(["pull"]).exit(2).it("exits with status 2");
  });
});
