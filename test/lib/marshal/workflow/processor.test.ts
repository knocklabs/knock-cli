import { expect } from "@oclif/test";
import { get } from "lodash";

import { xpath } from "@/../test/support";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  buildWorkflowDirBundle,
  formatExtractedFilePath,
  StepType,
  toWorkflowJson,
  WorkflowData,
} from "@/lib/marshal/workflow";

const remoteWorkflow: WorkflowData<WithAnnotation> = {
  name: "New comment",
  key: "new-comment",
  active: false,
  valid: false,
  steps: [
    {
      ref: "sms_1",
      type: StepType.Channel,
      channel_key: "sms-provider",
      template: {
        text_body: "Hi {{ recipient.name }}.",
        __annotation: {
          extractable_fields: {
            text_body: { default: true, file_ext: "txt" },
          },
          readonly_fields: [],
        },
      },
    },
    {
      ref: "delay_1",
      type: StepType.Delay,
      settings: {
        delay_for: {
          unit: "seconds",
          value: 30,
        },
      },
    },
    {
      ref: "email_1",
      type: StepType.Channel,
      channel_key: "email-provider",
      template: {
        settings: {
          layout_key: "default",
          __annotation: {
            extractable_fields: {
              pre_content: { default: true, file_ext: "txt" },
            },
            readonly_fields: [],
          },
        },
        subject: "New activity",
        html_body: "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
        __annotation: {
          extractable_fields: {
            subject: { default: false, file_ext: "txt" },
            json_body: { default: true, file_ext: "json" },
            html_body: { default: true, file_ext: "html" },
            text_body: { default: true, file_ext: "txt" },
          },
          readonly_fields: [],
        },
      },
    },
    {
      ref: "branch_1",
      type: StepType.Branch,
      branches: [
        {
          name: "Branch 1",
          terminates: false,
          conditions: {
            all: [
              {
                variable: "data.branch_1_enabled",
                operator: "equal_to",
                argument: "true",
              },
            ],
          },
          steps: [
            {
              ref: "email_2",
              type: StepType.Channel,
              channel_key: "email-provider",
              template: {
                settings: {
                  layout_key: "default",
                  __annotation: {
                    extractable_fields: {
                      pre_content: { default: true, file_ext: "txt" },
                    },
                    readonly_fields: [],
                  },
                },
                subject: "New activity (2)",
                html_body:
                  "<p>Hi <strong>{{ recipient.name }}</strong>.</p><p>This is the second email!</p>",
                __annotation: {
                  extractable_fields: {
                    subject: { default: false, file_ext: "txt" },
                    json_body: { default: true, file_ext: "json" },
                    html_body: { default: true, file_ext: "html" },
                    text_body: { default: true, file_ext: "txt" },
                  },
                  readonly_fields: [],
                },
              },
            },
          ],
        },
        {
          name: "Default",
          terminates: false,
          steps: [
            {
              ref: "email_3",
              type: StepType.Channel,
              channel_key: "email-provider",
              template: {
                settings: {
                  layout_key: "default",
                  __annotation: {
                    extractable_fields: {
                      pre_content: { default: true, file_ext: "txt" },
                    },
                    readonly_fields: [],
                  },
                },
                subject: "New activity (3)",
                html_body:
                  "<p>Hi <strong>{{ recipient.name }}</strong>.</p><p>This is the third email!</p>",
                __annotation: {
                  extractable_fields: {
                    subject: { default: false, file_ext: "txt" },
                    json_body: { default: true, file_ext: "json" },
                    html_body: { default: true, file_ext: "html" },
                    text_body: { default: true, file_ext: "txt" },
                  },
                  readonly_fields: [],
                },
              },
            },
          ],
        },
      ],
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

describe("lib/marshal/workflow/processor", () => {
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

      const template1 = get(workflowJson, "steps[0].template");
      expect(template1).to.eql({
        text_body: "Hi {{ recipient.name }}.",
      });

      const template2 = get(workflowJson, "steps[2].template");
      expect(template2).to.eql({
        settings: {
          layout_key: "default",
        },
        subject: "New activity",
        html_body: "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
      });

      const template3 = get(
        workflowJson,
        "steps[3].branches[0].steps[0].template",
      );
      expect(template3).to.eql({
        settings: {
          layout_key: "default",
        },
        subject: "New activity (2)",
        html_body:
          "<p>Hi <strong>{{ recipient.name }}</strong>.</p><p>This is the second email!</p>",
      });

      const template4 = get(
        workflowJson,
        "steps[3].branches[1].steps[0].template",
      );
      expect(template4).to.eql({
        settings: {
          layout_key: "default",
        },
        subject: "New activity (3)",
        html_body:
          "<p>Hi <strong>{{ recipient.name }}</strong>.</p><p>This is the third email!</p>",
      });
    });
  });

  describe("formatExtractedFilePath", () => {
    it("returns a formatted file path based on the object path", () => {
      const result1 = formatExtractedFilePath(["a", "b", "c"], "md");
      expect(result1).to.equal(xpath("a/b/c.md"));

      const result2 = formatExtractedFilePath(["a", 0, "b", "c"], "txt");
      expect(result2).to.equal(xpath("a/1.b/c.txt"));

      const result3 = formatExtractedFilePath(["a", 0, "b", 2, "c"], "json");
      expect(result3).to.equal(xpath("a/1.b/3.c.json"));

      const result4 = formatExtractedFilePath(["a", 0, 2, "b"], "json");
      expect(result4).to.equal(xpath("a/1.3.b.json"));

      const result5 = formatExtractedFilePath(["a", 0, 2, "b", 1], "md");
      expect(result5).to.equal(xpath("a/1.3.b/2.md"));

      const result6 = formatExtractedFilePath(["a", 0, 2], "md");
      expect(result6).to.equal(xpath("a/1.3.md"));
    });

    it("returns a formatted file path based on the object path and opts", () => {
      const result1 = formatExtractedFilePath(["a", "b", 0, "c"], "md", {
        unnestDirsBy: 2,
        nestIntoDirs: ["foo", "bar"],
      });
      expect(result1).to.equal(xpath("foo/bar/1.c.md"));
    });
  });

  describe("buildWorkflowDirBundle", () => {
    describe("given a fetched workflow that has not been pulled before", () => {
      it("returns a dir bundle based on default extract settings", () => {
        const result = buildWorkflowDirBundle(remoteWorkflow);

        expect(result).to.eql({
          "workflow.json": {
            name: "New comment",
            steps: [
              {
                ref: "sms_1",
                type: "channel",
                channel_key: "sms-provider",
                template: {
                  "text_body@": xpath("sms_1/text_body.txt"),
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
                  settings: {
                    layout_key: "default",
                  },
                  subject: "New activity",
                  "html_body@": xpath("email_1/html_body.html"),
                },
              },
              {
                ref: "branch_1",
                type: StepType.Branch,
                branches: [
                  {
                    name: "Branch 1",
                    terminates: false,
                    conditions: {
                      all: [
                        {
                          variable: "data.branch_1_enabled",
                          operator: "equal_to",
                          argument: "true",
                        },
                      ],
                    },
                    steps: [
                      {
                        ref: "email_2",
                        type: StepType.Channel,
                        channel_key: "email-provider",
                        template: {
                          settings: {
                            layout_key: "default",
                          },
                          subject: "New activity (2)",
                          "html_body@": xpath("email_2/html_body.html"),
                        },
                      },
                    ],
                  },
                  {
                    name: "Default",
                    terminates: false,
                    steps: [
                      {
                        ref: "email_3",
                        type: StepType.Channel,
                        channel_key: "email-provider",
                        template: {
                          settings: {
                            layout_key: "default",
                          },
                          subject: "New activity (3)",
                          "html_body@": xpath("email_3/html_body.html"),
                        },
                      },
                    ],
                  },
                ],
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
          [xpath("sms_1/text_body.txt")]: "Hi {{ recipient.name }}.",
          [xpath("email_1/html_body.html")]:
            "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
          [xpath("email_2/html_body.html")]:
            "<p>Hi <strong>{{ recipient.name }}</strong>.</p><p>This is the second email!</p>",
          [xpath("email_3/html_body.html")]:
            "<p>Hi <strong>{{ recipient.name }}</strong>.</p><p>This is the third email!</p>",
        });
      });
    });

    describe("given a fetched workflow with a local version available", () => {
      it("returns a dir bundle based on a local version and default extract settings", () => {
        const localWorkflow = {
          name: "New comment",
          steps: [
            {
              type: "channel",
              ref: "email_1",
              channel_key: "email-provider",
              template: {
                settings: {
                  layout_key: "default",
                },
                // Extracted out to a template file (not by default)
                "subject@": xpath("email_1/default/subject.txt"),
                // Extracted out to a different path (than the default)
                "html_body@": xpath("email_1/default/body.html"),
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

        const result = buildWorkflowDirBundle(remoteWorkflow, localWorkflow);

        expect(result).to.eql({
          "workflow.json": {
            name: "New comment",
            steps: [
              {
                ref: "sms_1",
                type: "channel",
                channel_key: "sms-provider",
                template: {
                  "text_body@": xpath("sms_1/text_body.txt"),
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
                  settings: {
                    layout_key: "default",
                  },
                  // Note here..
                  "subject@": xpath("email_1/default/subject.txt"),
                  "html_body@": xpath("email_1/default/body.html"),
                },
              },
              {
                ref: "branch_1",
                type: StepType.Branch,
                branches: [
                  {
                    name: "Branch 1",
                    terminates: false,
                    conditions: {
                      all: [
                        {
                          variable: "data.branch_1_enabled",
                          operator: "equal_to",
                          argument: "true",
                        },
                      ],
                    },
                    steps: [
                      {
                        ref: "email_2",
                        type: StepType.Channel,
                        channel_key: "email-provider",
                        template: {
                          settings: {
                            layout_key: "default",
                          },
                          subject: "New activity (2)",
                          "html_body@": xpath("email_2/html_body.html"),
                        },
                      },
                    ],
                  },
                  {
                    name: "Default",
                    terminates: false,
                    steps: [
                      {
                        ref: "email_3",
                        type: StepType.Channel,
                        channel_key: "email-provider",
                        template: {
                          settings: {
                            layout_key: "default",
                          },
                          subject: "New activity (3)",
                          "html_body@": xpath("email_3/html_body.html"),
                        },
                      },
                    ],
                  },
                ],
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
          [xpath("sms_1/text_body.txt")]: "Hi {{ recipient.name }}.",
          // And here..
          [xpath("email_1/default/subject.txt")]: "New activity",
          [xpath("email_1/default/body.html")]:
            "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
          [xpath("email_2/html_body.html")]:
            "<p>Hi <strong>{{ recipient.name }}</strong>.</p><p>This is the second email!</p>",
          [xpath("email_3/html_body.html")]:
            "<p>Hi <strong>{{ recipient.name }}</strong>.</p><p>This is the third email!</p>",
        });
      });
    });

    describe("given a fetched workflow with visual blocks", () => {
      it("returns a dir bundle with extracted files from visual blocks", () => {
        const workflow = {
          name: "New comment",
          key: "new-comment",
          active: false,
          valid: false,
          steps: [
            {
              ref: "email_1",
              type: "channel" as StepType.Channel,
              channel_key: "email-provider",
              template: {
                __annotation: {
                  extractable_fields: {
                    html_body: { default: true, file_ext: "html" },
                    subject: { default: false, file_ext: "txt" },
                    text_body: { default: true, file_ext: "txt" },
                    visual_blocks: { default: true, file_ext: "json" },
                  },
                  readonly_fields: [],
                },
                settings: {
                  __annotation: {
                    extractable_fields: {
                      pre_content: { default: true, file_ext: "txt" },
                    },
                    readonly_fields: [],
                  },
                  layout_key: "default",
                  pre_content: "{{ foo }}",
                },
                subject: "You've got mail!",
                visual_blocks: [
                  {
                    __annotation: {
                      extractable_fields: {
                        content: { default: true, file_ext: "md" },
                      },
                      readonly_fields: [],
                    },
                    content: "Boom",
                    layout_attrs: {
                      padding_bottom: 8,
                      padding_left: 4,
                      padding_right: 4,
                      padding_top: 8,
                    },
                    type: "markdown",
                    variant: "default",
                    version: 1,
                  },
                ],
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

        const result = buildWorkflowDirBundle(workflow);

        expect(result).to.eql({
          "workflow.json": {
            name: "New comment",
            steps: [
              {
                ref: "email_1",
                type: "channel",
                channel_key: "email-provider",
                template: {
                  settings: {
                    layout_key: "default",
                    "pre_content@": xpath("email_1/settings/pre_content.txt"),
                  },
                  subject: "You've got mail!",
                  "visual_blocks@": xpath("email_1/visual_blocks.json"),
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
          [xpath("email_1/settings/pre_content.txt")]: "{{ foo }}",
          [xpath("email_1/visual_blocks.json")]: JSON.stringify(
            [
              {
                layout_attrs: {
                  padding_bottom: 8,
                  padding_left: 4,
                  padding_right: 4,
                  padding_top: 8,
                },
                type: "markdown",
                variant: "default",
                version: 1,
                "content@": xpath("visual_blocks/1.content.md"),
              },
            ],
            null,
            2,
          ),
          [xpath("email_1/visual_blocks/1.content.md")]: "Boom",
        });
      });
    });
  });
});
