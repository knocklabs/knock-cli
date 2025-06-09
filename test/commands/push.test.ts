/* eslint-disable max-nested-callbacks */
import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import PartialValidate from "@/commands/partial/validate";
import WorkflowValidate from "@/commands/workflow/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { PARTIAL_JSON, PartialData, PartialType } from "@/lib/marshal/partial";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { WORKFLOW_JSON, WorkflowData } from "@/lib/marshal/workflow";

import EmailLayoutValidate from "@/commands/layout/validate";
import TranslationValidate from "@/commands/translation/validate";
import { factory } from "../support";

const KNOCK_SERVICE_TOKEN = "valid-token";

const mockPartialData: PartialData<WithAnnotation> = {
  key: "default",
  name: "Default",
  type: PartialType.Html,
  valid: true,
  visual_block_enabled: true,
  description: "This is a default partial",
  icon_name: "Microphone",
  content: `
    <!doctype html>
    <html>
    <body>
    <p>This is some example text</p>
    </body>
    </html>
    `.trimStart(),
  environment: "development",
  updated_at: "2023-09-29T19:08:04.129228Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  __annotation: {
    extractable_fields: {
      content: { default: true, file_ext: "txt" },
    },
    readonly_fields: [
      "environment",
      "key",
      "type",
      "valid",
      "created_at",
      "updated_at",
    ],
  },
};

const mockWorkflowData: WorkflowData<WithAnnotation> = {
  name: "New comment",
  key: "new-comment",
  active: false,
  valid: false,
  steps: [],
  created_at: "2022-12-31T12:00:00.000000Z",
  updated_at: "2022-12-31T12:00:00.000000Z",
  __annotation: {
    extractable_fields: {},
    readonly_fields: [
      "environment",
      "key",
      "active",
      "valid",
      "created_at",
      "updated_at",
    ],
  },
};

describe("commands/push", () => {
  // TODO Test pushes layouts, partials, translations, and workflows

  describe("with service token", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      process.env = {
        ...originalEnv,
        KNOCK_SERVICE_TOKEN: "valid-token",
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    describe("with development environment", () => {
      describe("and some (but not all) resource-specific subdirectories", () => {
        const partialsSubdirPath = path.resolve(sandboxDir, "partials");
        const workflowsSubdirPath = path.resolve(sandboxDir, "workflows");

        let layoutValidateAllStub: sinon.SinonStub;
        let partialValidateAllStub: sinon.SinonStub;
        let translationValidateAllStub: sinon.SinonStub;
        let workflowValidateAllStub: sinon.SinonStub;

        let upsertLayoutStub: sinon.SinonStub;
        let upsertPartialStub: sinon.SinonStub;
        let upsertTranslationStub: sinon.SinonStub;
        let upsertWorkflowStub: sinon.SinonStub;

        beforeEach(() => {
          layoutValidateAllStub = sinon
            .stub(EmailLayoutValidate, "validateAll")
            .resolves([]);

          partialValidateAllStub = sinon
            .stub(PartialValidate, "validateAll")
            .resolves([]);

          translationValidateAllStub = sinon
            .stub(TranslationValidate, "validateAll")
            .resolves([]);

          workflowValidateAllStub = sinon
            .stub(WorkflowValidate, "validateAll")
            .resolves([]);

          upsertLayoutStub = sinon.stub(
            KnockApiV1.prototype,
            "upsertEmailLayout",
          );

          upsertPartialStub = sinon
            .stub(KnockApiV1.prototype, "upsertPartial")
            .resolves(factory.resp({ data: { partial: mockPartialData } }));

          upsertTranslationStub = sinon.stub(
            KnockApiV1.prototype,
            "upsertTranslation",
          );

          upsertWorkflowStub = sinon
            .stub(KnockApiV1.prototype, "upsertWorkflow")
            .resolves(factory.resp({ data: { workflow: mockWorkflowData } }));

          const messagesPartialJson = path.resolve(
            partialsSubdirPath,
            "messages",
            PARTIAL_JSON,
          );
          fs.outputJsonSync(messagesPartialJson, { name: "Messages" });

          const fooWorkflowJson = path.resolve(
            workflowsSubdirPath,
            "foo",
            WORKFLOW_JSON,
          );
          fs.outputJsonSync(fooWorkflowJson, { name: "Foo" });

          process.chdir(sandboxDir);
        });

        afterEach(() => {
          fs.removeSync(workflowsSubdirPath);
          fs.removeSync(partialsSubdirPath);
          sinon.restore();
        });

        test
          .command(["push", "--knock-dir", "."])
          .it(
            "only pushes the resources for the subdirectories which exist",
            () => {
              sinon.assert.notCalled(layoutValidateAllStub);
              sinon.assert.notCalled(translationValidateAllStub);
              sinon.assert.notCalled(upsertLayoutStub);
              sinon.assert.notCalled(upsertTranslationStub);

              sinon.assert.calledOnce(partialValidateAllStub);
              sinon.assert.calledOnce(workflowValidateAllStub);

              sinon.assert.calledOnceWithExactly(
                upsertPartialStub,
                sinon.match(
                  ({ args, flags }) =>
                    isEqual(args, {}) &&
                    isEqual(flags, {
                      annotate: true,
                      "service-token": "valid-token",
                      environment: "development",
                      all: true,
                      "partials-dir": {
                        abspath: partialsSubdirPath,
                        exists: true,
                      },
                    }),
                ),
                sinon.match((partial) =>
                  isEqual(partial, { key: "messages", name: "Messages" }),
                ),
              );

              sinon.assert.calledOnceWithExactly(
                upsertWorkflowStub,
                sinon.match(
                  ({ args, flags }) =>
                    isEqual(args, {}) &&
                    isEqual(flags, {
                      annotate: true,
                      "service-token": "valid-token",

                      environment: "development",
                      all: true,
                      "workflows-dir": {
                        abspath: workflowsSubdirPath,
                        exists: true,
                      },
                    }),
                ),
                sinon.match((workflow) =>
                  isEqual(workflow, { key: "foo", name: "Foo" }),
                ),
              );
            },
          );
      });

      describe("and an empty layouts directory", () => {
        let layoutsDirPath: string;

        beforeEach(() => {
          layoutsDirPath = path.resolve(sandboxDir, "layouts");
          fs.ensureDirSync(layoutsDirPath);
          process.chdir(sandboxDir);
        });

        afterEach(() => {
          fs.removeSync(layoutsDirPath);
        });

        test
          .stdout()
          .command(["push", "--knock-dir", "."])
          .catch((error) =>
            expect(error.message).to.match(/No layout directories found in/),
          )
          .it("throws an error");
      });

      describe("and an empty partials directory", () => {
        let partialsDirPath: string;

        beforeEach(() => {
          partialsDirPath = path.resolve(sandboxDir, "partials");
          fs.ensureDirSync(partialsDirPath);
          process.chdir(sandboxDir);
        });

        afterEach(() => {
          fs.removeSync(partialsDirPath);
        });

        test
          .stdout()
          .command(["push", "--knock-dir", "."])
          .catch((error) =>
            expect(error.message).to.match(/No partial directories found in/),
          )
          .it("throws an error");
      });

      describe("and an empty translations directory", () => {
        let translationsDirPath: string;

        beforeEach(() => {
          translationsDirPath = path.resolve(sandboxDir, "translations");
          fs.ensureDirSync(translationsDirPath);
          process.chdir(sandboxDir);
        });

        afterEach(() => {
          fs.removeSync(translationsDirPath);
        });

        test
          .stdout()
          .command(["push", "--knock-dir", "."])
          .catch((error) =>
            expect(error.message).to.match(/No translation files found in/),
          )
          .it("throws an error");
      });

      describe("and an empty workflows directory", () => {
        let workflowsDirPath: string;

        beforeEach(() => {
          workflowsDirPath = path.resolve(sandboxDir, "workflows");
          fs.ensureDirSync(workflowsDirPath);
          process.chdir(sandboxDir);
        });

        afterEach(() => {
          fs.removeSync(workflowsDirPath);
        });

        test
          .stdout()
          .command(["push", "--knock-dir", "."])
          .catch((error) =>
            expect(error.message).to.match(/No workflow directories found in/),
          )
          .it("throws an error");
      });
    });
  });

  describe("with environment other than development", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN })
      .command(["push", "--knock-dir", ".", "--environment", "production"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("without directory", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN })
      .command(["push"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("without service token", () => {
    test
      .command(["push", "--knock-dir", "."])
      .exit(2)
      .it("exits with status 2");
  });
});
