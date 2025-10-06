/* eslint-disable max-nested-callbacks */
import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import EmailLayoutValidate from "@/commands/layout/validate";
import PartialValidate from "@/commands/partial/validate";
import TranslationValidate from "@/commands/translation/validate";
import WorkflowValidate from "@/commands/workflow/validate";
import MessageTypeValidate from "@/commands/message-type/validate";
import GuideValidate from "@/commands/guide/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { EmailLayoutData, LAYOUT_JSON } from "@/lib/marshal/email-layout";
import { PARTIAL_JSON, PartialData, PartialType } from "@/lib/marshal/partial";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { WORKFLOW_JSON, WorkflowData } from "@/lib/marshal/workflow";
import { MESSAGE_TYPE_JSON, MessageTypeData } from "@/lib/marshal/message-type";
import { GUIDE_JSON, GuideData } from "@/lib/marshal/guide";

import { factory } from "../support";

const KNOCK_SERVICE_TOKEN = "valid-token";

const mockEmailLayoutData: EmailLayoutData<WithAnnotation> = {
  key: "default",
  name: "Default",
  html_layout: `
    <!doctype html>
    <html>
    <body>
    <p>This is some example text</p>
    </body>
    </html>
    `.trimStart(),
  text_layout: "Text {{ content }}",
  footer_links: [],
  environment: "development",
  updated_at: "2023-09-29T19:08:04.129228Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {
      html_layout: { default: true, file_ext: "html" },
      text_layout: { default: true, file_ext: "txt" },
    },
    readonly_fields: ["environment", "key", "created_at", "updated_at", "sha"],
  },
};

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
  sha: "<SOME_SHA>",
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
      "sha",
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
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {},
    readonly_fields: [
      "environment",
      "key",
      "active",
      "valid",
      "created_at",
      "updated_at",
      "sha",
    ],
  },
};

const mockMessageTypeData: MessageTypeData<WithAnnotation> = {
  key: "default",
  name: "Default",
  valid: true,
  owner: "user",
  variants: [],
  preview: "This is a preview",
  semver: "1.0.0",
  description: "This is a default message type",
  icon_name: "Bell",
  environment: "development",
  updated_at: "2023-09-29T19:08:04.129228Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {
      preview: { default: true, file_ext: "html" },
    },
    readonly_fields: [
      "environment",
      "key",
      "valid",
      "owner",
      "created_at",
      "updated_at",
      "sha",
    ],
  },
};

const mockGuideData: GuideData<WithAnnotation> = {
  key: "default",
  name: "Default",
  valid: true,
  active: false,
  description: "This is a default guide",
  priority: "high",
  channel_key: null,
  type: null,
  semver: "1.0.0",
  steps: [],
  environment: "development",
  updated_at: "2023-09-29T19:08:04.129228Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {},
    readonly_fields: [
      "environment",
      "key",
      "valid",
      "active",
      "created_at",
      "updated_at",
      "sha",
    ],
  },
};

const currCwd = process.cwd();

describe("commands/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

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
      describe("and a non-empty layouts directory", () => {
        const layoutsSubdirPath = path.resolve(sandboxDir, "layouts");

        let layoutValidateAllStub: sinon.SinonStub;
        let upsertLayoutStub: sinon.SinonStub;

        beforeEach(() => {
          layoutValidateAllStub = sinon
            .stub(EmailLayoutValidate, "validateAll")
            .resolves([]);

          upsertLayoutStub = sinon
            .stub(KnockApiV1.prototype, "upsertEmailLayout")
            .resolves(
              factory.resp({ data: { email_layout: mockEmailLayoutData } }),
            );

          const messagesLayoutJson = path.resolve(
            layoutsSubdirPath,
            "messages",
            LAYOUT_JSON,
          );
          fs.outputJsonSync(messagesLayoutJson, { name: "Messages" });

          process.chdir(sandboxDir);
        });

        afterEach(() => {
          sinon.restore();
        });

        test
          .command(["push", "--knock-dir", "."])
          .it("validates and upserts layouts", () => {
            sinon.assert.calledOnce(layoutValidateAllStub);

            sinon.assert.calledOnceWithExactly(
              upsertLayoutStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    annotate: true,
                    "service-token": "valid-token",
                    environment: "development",
                    all: true,
                    "layouts-dir": {
                      abspath: layoutsSubdirPath,
                      exists: true,
                    },
                  }),
              ),
              sinon.match((layout) =>
                isEqual(layout, { key: "messages", name: "Messages" }),
              ),
            );
          });

        test
          .command([
            "push",
            "--knock-dir",
            ".",
            "--commit",
            "-m",
            "this is a commit comment!",
          ])
          .it(
            "calls apiV1 upsertEmailLayout with commit flags, if provided",
            () => {
              sinon.assert.calledOnceWithExactly(
                upsertLayoutStub,
                sinon.match(
                  ({ args, flags }) =>
                    isEqual(args, {}) &&
                    isEqual(flags, {
                      annotate: true,
                      "service-token": "valid-token",
                      environment: "development",
                      all: true,
                      "layouts-dir": {
                        abspath: layoutsSubdirPath,
                        exists: true,
                      },
                      commit: true,
                      "commit-message": "this is a commit comment!",
                    }),
                ),
                sinon.match((layout) =>
                  isEqual(layout, { key: "messages", name: "Messages" }),
                ),
              );
            },
          );
      });

      describe("and a non-empty partials directory", () => {
        const partialsSubdirPath = path.resolve(sandboxDir, "partials");

        let partialValidateAllStub: sinon.SinonStub;
        let upsertPartialStub: sinon.SinonStub;

        beforeEach(() => {
          partialValidateAllStub = sinon
            .stub(PartialValidate, "validateAll")
            .resolves([]);

          upsertPartialStub = sinon
            .stub(KnockApiV1.prototype, "upsertPartial")
            .resolves(factory.resp({ data: { partial: mockPartialData } }));

          const messagesPartialJson = path.resolve(
            partialsSubdirPath,
            "messages",
            PARTIAL_JSON,
          );
          fs.outputJsonSync(messagesPartialJson, { name: "Messages" });

          process.chdir(sandboxDir);
        });

        afterEach(() => {
          sinon.restore();
        });

        test
          .command(["push", "--knock-dir", "."])
          .it("validates and upserts partials", () => {
            sinon.assert.calledOnce(partialValidateAllStub);

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
          });

        test
          .command([
            "push",
            "--knock-dir",
            ".",
            "--commit",
            "-m",
            "this is a commit comment!",
          ])
          .it(
            "calls apiV1 upsertPartial with commit flags, if provided",
            () => {
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
                      commit: true,
                      "commit-message": "this is a commit comment!",
                    }),
                ),
                sinon.match((partial) =>
                  isEqual(partial, { key: "messages", name: "Messages" }),
                ),
              );
            },
          );
      });

      describe("and a non-empty translations directory", () => {
        const translationsSubdirPath = path.resolve(sandboxDir, "translations");

        let translationValidateAllStub: sinon.SinonStub;
        let upsertTranslationStub: sinon.SinonStub;

        beforeEach(() => {
          translationValidateAllStub = sinon
            .stub(TranslationValidate, "validateAll")
            .resolves([]);

          upsertTranslationStub = sinon
            .stub(KnockApiV1.prototype, "upsertTranslation")
            .resolves(factory.resp());

          fs.outputJsonSync(
            path.resolve(translationsSubdirPath, "en", "en.json"),
            { hello: "Heyyyy" },
          );

          process.chdir(sandboxDir);
        });

        afterEach(() => {
          sinon.restore();
        });

        test
          .command(["push", "--knock-dir", "."])
          .it("validates and upserts translations", () => {
            sinon.assert.calledOnce(translationValidateAllStub);

            sinon.assert.calledOnceWithExactly(
              upsertTranslationStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    "service-token": "valid-token",
                    environment: "development",
                    all: true,
                    "translations-dir": {
                      abspath: translationsSubdirPath,
                      exists: true,
                    },
                  }),
              ),
              sinon.match((translation) =>
                isEqual(translation, {
                  locale_code: "en",
                  namespace: undefined,
                  content: '{"hello":"Heyyyy"}',
                  format: "json",
                }),
              ),
            );
          });

        test
          .command([
            "push",
            "--knock-dir",
            ".",
            "--commit",
            "-m",
            "this is a commit comment!",
          ])
          .it(
            "calls apiV1 upsertTranslation with commit flags, if provided",
            () => {
              sinon.assert.calledOnceWithExactly(
                upsertTranslationStub,
                sinon.match(
                  ({ args, flags }) =>
                    isEqual(args, {}) &&
                    isEqual(flags, {
                      "service-token": "valid-token",
                      environment: "development",
                      all: true,
                      "translations-dir": {
                        abspath: translationsSubdirPath,
                        exists: true,
                      },
                      commit: true,
                      "commit-message": "this is a commit comment!",
                    }),
                ),
                sinon.match((translation) =>
                  isEqual(translation, {
                    locale_code: "en",
                    namespace: undefined,
                    content: '{"hello":"Heyyyy"}',
                    format: "json",
                  }),
                ),
              );
            },
          );
      });

      describe("and a non-empty workflows directory", () => {
        const workflowsSubdirPath = path.resolve(sandboxDir, "workflows");

        let workflowValidateAllStub: sinon.SinonStub;
        let upsertWorkflowStub: sinon.SinonStub;

        beforeEach(() => {
          workflowValidateAllStub = sinon
            .stub(WorkflowValidate, "validateAll")
            .resolves([]);

          upsertWorkflowStub = sinon
            .stub(KnockApiV1.prototype, "upsertWorkflow")
            .resolves(factory.resp({ data: { workflow: mockWorkflowData } }));

          const fooWorkflowJson = path.resolve(
            workflowsSubdirPath,
            "foo",
            WORKFLOW_JSON,
          );
          fs.outputJsonSync(fooWorkflowJson, { name: "Foo" });

          process.chdir(sandboxDir);
        });

        afterEach(() => {
          sinon.restore();
        });

        test
          .command(["push", "--knock-dir", "."])
          .it("validates and upserts workflows", () => {
            sinon.assert.calledOnce(workflowValidateAllStub);

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
          });

        test
          .command([
            "push",
            "--knock-dir",
            ".",
            "--commit",
            "-m",
            "this is a commit comment!",
          ])
          .it(
            "calls apiV1 upsertWorkflow with commit flags, if provided",
            () => {
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
                      commit: true,
                      "commit-message": "this is a commit comment!",
                    }),
                ),
                sinon.match((workflow) =>
                  isEqual(workflow, { key: "foo", name: "Foo" }),
                ),
              );
            },
          );
      });

      describe("and a non-empty message-types directory", () => {
        const messageTypesSubdirPath = path.resolve(
          sandboxDir,
          "message-types",
        );

        let messageTypeValidateAllStub: sinon.SinonStub;
        let upsertMessageTypeStub: sinon.SinonStub;

        beforeEach(() => {
          messageTypeValidateAllStub = sinon
            .stub(MessageTypeValidate, "validateAll")
            .resolves([]);

          upsertMessageTypeStub = sinon
            .stub(KnockApiV1.prototype, "upsertMessageType")
            .resolves(
              factory.resp({ data: { message_type: mockMessageTypeData } }),
            );

          const defaultMessageTypeJson = path.resolve(
            messageTypesSubdirPath,
            "default",
            MESSAGE_TYPE_JSON,
          );
          fs.outputJsonSync(defaultMessageTypeJson, { name: "Default" });

          process.chdir(sandboxDir);
        });

        afterEach(() => {
          sinon.restore();
        });

        test
          .command(["push", "--knock-dir", "."])
          .it("validates and upserts message types", () => {
            sinon.assert.calledOnce(messageTypeValidateAllStub);

            sinon.assert.calledOnceWithExactly(
              upsertMessageTypeStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    annotate: true,
                    "service-token": "valid-token",
                    environment: "development",
                    all: true,
                    "message-types-dir": {
                      abspath: messageTypesSubdirPath,
                      exists: true,
                    },
                  }),
              ),
              sinon.match((messageType) =>
                isEqual(messageType, { key: "default", name: "Default" }),
              ),
            );
          });

        test
          .command([
            "push",
            "--knock-dir",
            ".",
            "--commit",
            "-m",
            "this is a commit comment!",
          ])
          .it(
            "calls apiV1 upsertMessageType with commit flags, if provided",
            () => {
              sinon.assert.calledOnceWithExactly(
                upsertMessageTypeStub,
                sinon.match(
                  ({ args, flags }) =>
                    isEqual(args, {}) &&
                    isEqual(flags, {
                      annotate: true,
                      "service-token": "valid-token",
                      environment: "development",
                      all: true,
                      "message-types-dir": {
                        abspath: messageTypesSubdirPath,
                        exists: true,
                      },
                      commit: true,
                      "commit-message": "this is a commit comment!",
                    }),
                ),
                sinon.match((messageType) =>
                  isEqual(messageType, { key: "default", name: "Default" }),
                ),
              );
            },
          );
      });

      describe("and a non-empty guides directory", () => {
        const guidesSubdirPath = path.resolve(sandboxDir, "guides");

        let guideValidateAllStub: sinon.SinonStub;
        let upsertGuideStub: sinon.SinonStub;

        beforeEach(() => {
          guideValidateAllStub = sinon
            .stub(GuideValidate, "validateAll")
            .resolves([]);

          upsertGuideStub = sinon
            .stub(KnockApiV1.prototype, "upsertGuide")
            .resolves(factory.resp({ data: { guide: mockGuideData } }));

          const defaultGuideJson = path.resolve(
            guidesSubdirPath,
            "default",
            GUIDE_JSON,
          );
          fs.outputJsonSync(defaultGuideJson, { name: "Default" });

          process.chdir(sandboxDir);
        });

        afterEach(() => {
          sinon.restore();
        });

        test
          .command(["push", "--knock-dir", "."])
          .it("validates and upserts guides", () => {
            sinon.assert.calledOnce(guideValidateAllStub);

            sinon.assert.calledOnceWithExactly(
              upsertGuideStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    annotate: true,
                    "service-token": "valid-token",
                    environment: "development",
                    all: true,
                    "guides-dir": {
                      abspath: guidesSubdirPath,
                      exists: true,
                    },
                  }),
              ),
              sinon.match((guide) =>
                isEqual(guide, { key: "default", name: "Default" }),
              ),
            );
          });

        test
          .command([
            "push",
            "--knock-dir",
            ".",
            "--commit",
            "-m",
            "this is a commit comment!",
          ])
          .it("calls apiV1 upsertGuide with commit flags, if provided", () => {
            sinon.assert.calledOnceWithExactly(
              upsertGuideStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    annotate: true,
                    "service-token": "valid-token",
                    environment: "development",
                    all: true,
                    "guides-dir": {
                      abspath: guidesSubdirPath,
                      exists: true,
                    },
                    commit: true,
                    "commit-message": "this is a commit comment!",
                  }),
              ),
              sinon.match((guide) =>
                isEqual(guide, { key: "default", name: "Default" }),
              ),
            );
          });
      });

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

      describe("and all resource-specific subdirectories", () => {
        const layoutsSubdirPath = path.resolve(sandboxDir, "layouts");
        const partialsSubdirPath = path.resolve(sandboxDir, "partials");
        const translationsSubdirPath = path.resolve(sandboxDir, "translations");
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

          upsertLayoutStub = sinon
            .stub(KnockApiV1.prototype, "upsertEmailLayout")
            .resolves(
              factory.resp({ data: { email_layout: mockEmailLayoutData } }),
            );

          upsertPartialStub = sinon
            .stub(KnockApiV1.prototype, "upsertPartial")
            .resolves(factory.resp({ data: { partial: mockPartialData } }));

          upsertTranslationStub = sinon
            .stub(KnockApiV1.prototype, "upsertTranslation")
            .resolves(factory.resp());

          upsertWorkflowStub = sinon
            .stub(KnockApiV1.prototype, "upsertWorkflow")
            .resolves(factory.resp({ data: { workflow: mockWorkflowData } }));

          const messagesLayoutJson = path.resolve(
            layoutsSubdirPath,
            "messages",
            LAYOUT_JSON,
          );
          fs.outputJsonSync(messagesLayoutJson, { name: "Messages" });

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

          const enTranslationJson = path.resolve(
            translationsSubdirPath,
            "en",
            "en.json",
          );
          fs.outputJsonSync(enTranslationJson, { hello: "Heyyyy" });

          process.chdir(sandboxDir);
        });

        afterEach(() => {
          sinon.restore();
        });

        test
          .command(["push", "--knock-dir", "."])
          .it("pushes all resources in the correct order", () => {
            sinon.assert.callOrder(
              partialValidateAllStub,
              upsertPartialStub,
              layoutValidateAllStub,
              upsertLayoutStub,
              workflowValidateAllStub,
              upsertWorkflowStub,
              translationValidateAllStub,
              upsertTranslationStub,
            );
          });
      });

      describe("and a branch flag", () => {
        const layoutsSubdirPath = path.resolve(sandboxDir, "layouts");
        const partialsSubdirPath = path.resolve(sandboxDir, "partials");
        const translationsSubdirPath = path.resolve(sandboxDir, "translations");
        const workflowsSubdirPath = path.resolve(sandboxDir, "workflows");
        const messageTypesSubdirPath = path.resolve(
          sandboxDir,
          "message-types",
        );
        const guidesSubdirPath = path.resolve(sandboxDir, "guides");

        let upsertLayoutStub: sinon.SinonStub;
        let upsertPartialStub: sinon.SinonStub;
        let upsertTranslationStub: sinon.SinonStub;
        let upsertWorkflowStub: sinon.SinonStub;
        let upsertMessageTypeStub: sinon.SinonStub;
        let upsertGuideStub: sinon.SinonStub;

        beforeEach(() => {
          sinon.stub(EmailLayoutValidate, "validateAll").resolves([]);
          sinon.stub(PartialValidate, "validateAll").resolves([]);
          sinon.stub(TranslationValidate, "validateAll").resolves([]);
          sinon.stub(WorkflowValidate, "validateAll").resolves([]);
          sinon.stub(MessageTypeValidate, "validateAll").resolves([]);
          sinon.stub(GuideValidate, "validateAll").resolves([]);

          upsertLayoutStub = sinon
            .stub(KnockApiV1.prototype, "upsertEmailLayout")
            .resolves(
              factory.resp({ data: { email_layout: mockEmailLayoutData } }),
            );

          upsertPartialStub = sinon
            .stub(KnockApiV1.prototype, "upsertPartial")
            .resolves(factory.resp({ data: { partial: mockPartialData } }));

          upsertTranslationStub = sinon
            .stub(KnockApiV1.prototype, "upsertTranslation")
            .resolves(factory.resp());

          upsertWorkflowStub = sinon
            .stub(KnockApiV1.prototype, "upsertWorkflow")
            .resolves(factory.resp({ data: { workflow: mockWorkflowData } }));

          upsertMessageTypeStub = sinon
            .stub(KnockApiV1.prototype, "upsertMessageType")
            .resolves(
              factory.resp({ data: { message_type: mockMessageTypeData } }),
            );

          upsertGuideStub = sinon
            .stub(KnockApiV1.prototype, "upsertGuide")
            .resolves(factory.resp({ data: { guide: mockGuideData } }));

          const messagesLayoutJson = path.resolve(
            layoutsSubdirPath,
            "messages",
            LAYOUT_JSON,
          );
          fs.outputJsonSync(messagesLayoutJson, { name: "Messages" });

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

          const enTranslationJson = path.resolve(
            translationsSubdirPath,
            "en",
            "en.json",
          );
          fs.outputJsonSync(enTranslationJson, { hello: "Heyyyy" });

          const defaultMessageTypeJson = path.resolve(
            messageTypesSubdirPath,
            "default",
            MESSAGE_TYPE_JSON,
          );
          fs.outputJsonSync(defaultMessageTypeJson, { name: "Default" });

          const defaultGuideJson = path.resolve(
            guidesSubdirPath,
            "default",
            GUIDE_JSON,
          );
          fs.outputJsonSync(defaultGuideJson, { name: "Default" });

          process.chdir(sandboxDir);
        });

        afterEach(() => {
          sinon.restore();
        });

        test
          .command([
            "push",
            "--knock-dir",
            ".",
            "--branch",
            "my-feature-branch-123",
          ])
          .it("upserts all resources with expected params", () => {
            sinon.assert.calledOnceWithExactly(
              upsertLayoutStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    annotate: true,
                    "service-token": "valid-token",
                    environment: "development",
                    branch: "my-feature-branch-123",
                    all: true,
                    "layouts-dir": {
                      abspath: layoutsSubdirPath,
                      exists: true,
                    },
                  }),
              ),
              sinon.match((layout) =>
                isEqual(layout, { key: "messages", name: "Messages" }),
              ),
            );

            sinon.assert.calledOnceWithExactly(
              upsertPartialStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    annotate: true,
                    "service-token": "valid-token",
                    environment: "development",
                    branch: "my-feature-branch-123",
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
              upsertTranslationStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    "service-token": "valid-token",
                    environment: "development",
                    branch: "my-feature-branch-123",
                    all: true,
                    "translations-dir": {
                      abspath: translationsSubdirPath,
                      exists: true,
                    },
                  }),
              ),
              sinon.match((translation) =>
                isEqual(translation, {
                  locale_code: "en",
                  namespace: undefined,
                  content: '{"hello":"Heyyyy"}',
                  format: "json",
                }),
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
                    branch: "my-feature-branch-123",
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

            sinon.assert.calledOnceWithExactly(
              upsertMessageTypeStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    annotate: true,
                    "service-token": "valid-token",
                    environment: "development",
                    branch: "my-feature-branch-123",
                    all: true,
                    "message-types-dir": {
                      abspath: messageTypesSubdirPath,
                      exists: true,
                    },
                  }),
              ),
              sinon.match((messageType) =>
                isEqual(messageType, { key: "default", name: "Default" }),
              ),
            );

            sinon.assert.calledOnceWithExactly(
              upsertGuideStub,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    annotate: true,
                    "service-token": "valid-token",
                    environment: "development",
                    branch: "my-feature-branch-123",
                    all: true,
                    "guides-dir": {
                      abspath: guidesSubdirPath,
                      exists: true,
                    },
                  }),
              ),
              sinon.match((guide) =>
                isEqual(guide, { key: "default", name: "Default" }),
              ),
            );
          });
      });

      describe("and an empty layouts directory", () => {
        let layoutsDirPath: string;

        beforeEach(() => {
          layoutsDirPath = path.resolve(sandboxDir, "layouts");
          fs.ensureDirSync(layoutsDirPath);
          process.chdir(sandboxDir);
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
