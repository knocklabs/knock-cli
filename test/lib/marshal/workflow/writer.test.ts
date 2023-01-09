import { expect } from "@oclif/test";
import { get } from "lodash";

import { WithAnnotation } from "@/lib/marshal/shared/types";
import { StepType, WorkflowData } from "@/lib/marshal/workflow";
import {
  buildWorkflowDirBundle,
  toWorkflowJson,
} from "@/lib/marshal/workflow/writer";
import { WorkflowDirContext } from "@/lib/run-context";

const remoteWorkflow: WorkflowData<WithAnnotation> = {
  name: "New comment",
  key: "new-comment",
  active: false,
  valid: false,
  steps: [
    {
      ref: "sms_1",
      type: "channel" as StepType.Channel,
      channel_key: "sms-provider",
      template: {
        default: {
          name: "Default",
          text_body: "Hi {{ recipient.name }}.",
          __annotation: {
            extractable_fields: {
              text_body: { default: true, file_ext: "txt" },
            },
            readonly_fields: [],
          },
        },
        it: {
          name: "Default",
          text_body: "Ciao {{ recipient.name }}.",
          __annotation: {
            extractable_fields: {
              text_body: { default: true, file_ext: "txt" },
            },
            readonly_fields: [],
          },
        },
      },
    },
    {
      ref: "delay_1",
      type: "delay" as StepType.Delay,
      settings: {
        delay_for: {
          unit: "seconds",
          value: 30,
        },
      },
    },
    {
      ref: "email_1",
      type: "channel" as StepType.Channel,
      channel_key: "email-provider",
      template: {
        default: {
          name: "Default",
          subject: "New activity",
          html_body: "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
          layout_key: "default",
          __annotation: {
            extractable_fields: {
              subject: { default: false, file_ext: "txt" },
              json_body: { default: true, file_ext: "json" },
              html_body: { default: true, file_ext: "html" },
              text_body: { default: true, file_ext: "txt" },
              pre_content: { default: true, file_ext: "txt" },
            },
            readonly_fields: [],
          },
        },
      },
    },
  ],
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

describe("lib/marshal/workflow/writer", () => {
  describe("toWorkflowJson", () => {
    it("moves over workflow's readonly fields under __readonly field", () => {
      const workflowJson = toWorkflowJson(remoteWorkflow);

      expect(workflowJson.key).to.equal(undefined);
      expect(workflowJson.active).to.equal(undefined);
      expect(workflowJson.active).to.equal(undefined);
      expect(workflowJson.valid).to.equal(undefined);
      expect(workflowJson.created_at).to.equal(undefined);
      expect(workflowJson.updated_at).to.equal(undefined);

      expect(workflowJson.__readonly).to.eql({
        key: "new-comment",
        active: false,
        valid: false,
        created_at: "2022-12-31T12:00:00.000000Z",
        updated_at: "2022-12-31T12:00:00.000000Z",
      });
    });

    it("removes all __annotation fields", () => {
      const workflowJson = toWorkflowJson(remoteWorkflow);

      expect(get(workflowJson, "__annotation")).to.equal(undefined);

      const template1 = get(workflowJson, "steps[0].template.default");
      expect(template1).to.eql({
        name: "Default",
        text_body: "Hi {{ recipient.name }}.",
      });

      const template2 = get(workflowJson, "steps[0].template.it");
      expect(template2).to.eql({
        name: "Default",
        text_body: "Ciao {{ recipient.name }}.",
      });

      const template3 = get(workflowJson, "steps[2].template.default");
      expect(template3).to.eql({
        name: "Default",
        subject: "New activity",
        html_body: "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
        layout_key: "default",
      });
    });
  });

  describe("buildWorkflowDirBundle", () => {
    describe("given a fetched workflow that has not been pulled before", () => {
      it("returns a dir bundle based on default extract settings", () => {
        const workflowDirCtx: WorkflowDirContext = {
          type: "workflow",
          key: "new-comment",
          abspath: "/my/workflows/new-comment",
          exists: false,
        };

        const result = buildWorkflowDirBundle(workflowDirCtx, remoteWorkflow);

        expect(result).to.eql({
          "workflow.json": {
            name: "New comment",
            steps: [
              {
                ref: "sms_1",
                type: "channel",
                channel_key: "sms-provider",
                template: {
                  default: {
                    name: "Default",
                    "text_body@": "sms_1/default.text_body.txt",
                  },
                  it: {
                    name: "Default",
                    "text_body@": "sms_1/it.text_body.txt",
                  },
                },
              },
              {
                ref: "delay_1",
                type: "delay",
                settings: {
                  delay_for: {
                    unit: "seconds",
                    value: 30,
                  },
                },
              },
              {
                ref: "email_1",
                type: "channel",
                channel_key: "email-provider",
                template: {
                  default: {
                    name: "Default",
                    subject: "New activity",
                    "html_body@": "email_1/default.html_body.html",
                    layout_key: "default",
                  },
                },
              },
            ],
            __readonly: {
              key: "new-comment",
              active: false,
              valid: false,
              created_at: "2022-12-31T12:00:00.000000Z",
              updated_at: "2022-12-31T12:00:00.000000Z",
            },
          },
          "sms_1/default.text_body.txt": "Hi {{ recipient.name }}.",
          "sms_1/it.text_body.txt": "Ciao {{ recipient.name }}.",
          "email_1/default.html_body.html":
            "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
        });
      });
    });

    describe("given a fetched workflow with a local version available", () => {
      it("returns a dir bundle based on default extract settings", () => {
        const localWorkflow = {
          name: "New comment",
          steps: [
            {
              type: "channel",
              ref: "email_1",
              channel_key: "email-provider",
              template: {
                default: {
                  name: "Default",
                  // Extracted out to a template file (not by default)
                  "subject@": "email_1/default/subject.txt",
                  // Extracted out to a different path (than the default)
                  "html_body@": "email_1/default/body.html",
                  layout_key: "default",
                },
              },
            },
          ],
          __readonly: {
            key: "new-comment",
            active: false,
            valid: false,
            created_at: "2022-12-31T12:00:00.000000Z",
            updated_at: "2022-12-31T12:00:00.000000Z",
          },
        };
        const workflowDirCtx: WorkflowDirContext = {
          type: "workflow",
          key: "new-comment",
          abspath: "/my/workflows/new-comment",
          exists: true,
        };

        const result = buildWorkflowDirBundle(
          workflowDirCtx,
          remoteWorkflow,
          localWorkflow,
        );

        expect(result).to.eql({
          "workflow.json": {
            name: "New comment",
            steps: [
              {
                ref: "sms_1",
                type: "channel",
                channel_key: "sms-provider",
                template: {
                  default: {
                    name: "Default",
                    "text_body@": "sms_1/default.text_body.txt",
                  },
                  it: {
                    name: "Default",
                    "text_body@": "sms_1/it.text_body.txt",
                  },
                },
              },
              {
                ref: "delay_1",
                type: "delay",
                settings: {
                  delay_for: {
                    unit: "seconds",
                    value: 30,
                  },
                },
              },
              {
                ref: "email_1",
                type: "channel",
                channel_key: "email-provider",
                template: {
                  default: {
                    name: "Default",
                    // Note here..
                    "subject@": "email_1/default/subject.txt",
                    "html_body@": "email_1/default/body.html",
                    layout_key: "default",
                  },
                },
              },
            ],
            __readonly: {
              key: "new-comment",
              active: false,
              valid: false,
              created_at: "2022-12-31T12:00:00.000000Z",
              updated_at: "2022-12-31T12:00:00.000000Z",
            },
          },
          "sms_1/default.text_body.txt": "Hi {{ recipient.name }}.",
          "sms_1/it.text_body.txt": "Ciao {{ recipient.name }}.",
          // And here..
          "email_1/default/subject.txt": "New activity",
          "email_1/default/body.html":
            "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
        });
      });
    });
  });
});
