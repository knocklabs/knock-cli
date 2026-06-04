import { Channel } from "@knocklabs/mgmt/resources/channels";
import { expect } from "@oclif/test";

import { factory, xpath } from "@/../test/support";
import {
  parseStepsInput,
  scaffoldWorkflowDirBundle,
  StepTag,
} from "@/lib/marshal/workflow/generator";

const channelsByType: Record<any, Channel[]> = {
  email: [factory.channel({ type: "email", key: "email-channel" })],
  sms: [factory.channel({ type: "sms", key: "sms-channel" })],
  push: [factory.channel({ type: "push", key: "push-channel" })],
  chat: [factory.channel({ type: "chat", key: "chat-channel" })],
  in_app_feed: [
    factory.channel({ type: "in_app_feed", key: "in-app-feed-channel" }),
  ],
};

const availableStepTypes: StepTag[] = [
  "delay",
  "batch",
  "fetch",
  "email",
  "in_app_feed",
  "sms",
  "push",
  "chat",
];

describe("lib/marshal/workflow/generator", () => {
  describe("parseStepsInput", () => {
    it("parses a comma separated list of step tags", () => {
      const [tags, error] = parseStepsInput(
        "delay,email,sms",
        availableStepTypes,
      );

      expect(error).to.equal(undefined);
      expect(tags).to.eql(["delay", "email", "sms"]);
    });

    it("accepts the canonical `in_app_feed` step tag", () => {
      const [tags, error] = parseStepsInput("in_app_feed", availableStepTypes);

      expect(error).to.equal(undefined);
      expect(tags).to.eql(["in_app_feed"]);
    });

    it("normalizes the legacy hyphenated `in-app-feed` step tag to `in_app_feed`", () => {
      const [tags, error] = parseStepsInput(
        "delay,in-app-feed,sms",
        availableStepTypes,
      );

      expect(error).to.equal(undefined);
      expect(tags).to.eql(["delay", "in_app_feed", "sms"]);
    });

    it("returns an error for an invalid step tag", () => {
      const [tags, error] = parseStepsInput("blah", availableStepTypes);

      expect(tags).to.equal(undefined);
      expect(error).to.equal("Invalid step type: blah");
    });
  });

  describe("scaffoldWorkflowDirBundle", () => {
    describe("given no steps attrs", () => {
      it("returns a bundle with scaffolded workflow.json", () => {
        const bundle = scaffoldWorkflowDirBundle(
          { name: "My new workflow" },
          channelsByType,
        );

        expect(bundle).to.eql({
          "workflow.json": {
            name: "My new workflow",
            steps: [],
          },
        });
      });
    });

    describe("given a single function step", () => {
      it("returns a bundle with scaffolded workflow.json", () => {
        const bundle = scaffoldWorkflowDirBundle(
          {
            name: "My new workflow",
            steps: ["fetch"],
          },
          channelsByType,
        );

        expect(bundle).to.eql({
          "workflow.json": {
            name: "My new workflow",
            steps: [
              {
                ref: "http_fetch_1",
                type: "http_fetch",
                settings: {
                  method: "get",
                  url: "https://example.com",
                },
              },
            ],
          },
        });
      });
    });

    describe("given a single channel step", () => {
      it("returns a bundle with scaffolded workflow.json and template files", () => {
        const bundle = scaffoldWorkflowDirBundle(
          {
            name: "My new workflow",
            steps: ["sms"],
          },
          channelsByType,
        );

        expect(bundle).to.eql({
          "workflow.json": {
            name: "My new workflow",
            steps: [
              {
                ref: "sms_1",
                type: "channel",
                channel_key: "sms-channel",
                template: {
                  "text_body@": xpath("sms_1/text_body.txt"),
                },
              },
            ],
          },
          [xpath("sms_1/text_body.txt")]: "Hello, {{ recipient.name }}!",
        });
      });
    });

    describe("given a mix of all function and channel steps", () => {
      it("returns a bundle with scaffolded workflow.json and template files", () => {
        const bundle = scaffoldWorkflowDirBundle(
          {
            name: "My new workflow",
            steps: [
              "email",
              "sms",
              "delay",
              "push",
              "batch",
              "fetch",
              "chat",
              "in_app_feed",
              "sms",
            ],
          },
          channelsByType,
        );

        expect(bundle).to.eql({
          "workflow.json": {
            name: "My new workflow",
            steps: [
              {
                ref: "email_1",
                type: "channel",
                channel_key: "email-channel",
                template: {
                  settings: {
                    layout_key: "default",
                  },
                  subject: "You've got mail!",
                  "html_body@": xpath("email_1/html_body.html"),
                },
              },
              {
                ref: "sms_1",
                type: "channel",
                channel_key: "sms-channel",
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
                ref: "push_1",
                type: "channel",
                channel_key: "push-channel",
                template: {
                  settings: {
                    delivery_type: "content",
                  },
                  "text_body@": xpath("push_1/text_body.txt"),
                },
              },
              {
                ref: "batch_1",
                type: "batch",
                settings: {
                  batch_order: "asc",
                  batch_window: {
                    unit: "seconds",
                    value: 30,
                  },
                  batch_window_type: "sliding",
                },
              },
              {
                ref: "http_fetch_1",
                type: "http_fetch",
                settings: {
                  method: "get",
                  url: "https://example.com",
                },
              },
              {
                ref: "chat_1",
                type: "channel",
                channel_key: "chat-channel",
                template: {
                  "markdown_body@": xpath("chat_1/markdown_body.md"),
                },
              },
              {
                ref: "in_app_feed_1",
                type: "channel",
                channel_key: "in-app-feed-channel",
                template: {
                  "markdown_body@": xpath("in_app_feed_1/markdown_body.md"),
                  action_url: "{{ vars.app_url }}",
                },
              },
              {
                // A second SMS step.
                ref: "sms_2",
                type: "channel",
                channel_key: "sms-channel",
                template: {
                  "text_body@": xpath("sms_2/text_body.txt"),
                },
              },
            ],
          },
          [xpath("email_1/html_body.html")]:
            "<p>Hello, <strong>{{ recipient.name }}</strong>!</p>",
          [xpath("sms_1/text_body.txt")]: "Hello, {{ recipient.name }}!",
          [xpath("push_1/text_body.txt")]: "Hello, {{ recipient.name }}!",
          [xpath("chat_1/markdown_body.md")]:
            "Hello, **{{ recipient.name }}**!",
          [xpath("in_app_feed_1/markdown_body.md")]:
            "Hello, **{{ recipient.name }}**!",
          [xpath("sms_2/text_body.txt")]: "Hello, {{ recipient.name }}!",
        });
      });
    });
  });
});
