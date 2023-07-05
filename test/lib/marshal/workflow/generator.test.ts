import { expect } from "@oclif/test";

import { xpath } from "@/../test/support";
import { scaffoldWorkflowDirBundle } from "@/lib/marshal/workflow/generator";

describe("lib/marshal/workflow/generator", () => {
  describe("scaffoldWorkflowDirBundle", () => {
    describe("given no steps attrs", () => {
      it("returns a bundle with scaffolded workflow.json", () => {
        const bundle = scaffoldWorkflowDirBundle({ name: "My new workflow" });

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
        const bundle = scaffoldWorkflowDirBundle({
          name: "My new workflow",
          steps: ["fetch"],
        });

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
        const bundle = scaffoldWorkflowDirBundle({
          name: "My new workflow",
          steps: ["sms"],
        });

        expect(bundle).to.eql({
          "workflow.json": {
            name: "My new workflow",
            steps: [
              {
                ref: "sms_1",
                type: "channel",
                channel_key: "<SMS CHANNEL KEY>",
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
        const bundle = scaffoldWorkflowDirBundle({
          name: "My new workflow",
          steps: [
            "email",
            "sms",
            "delay",
            "push",
            "batch",
            "fetch",
            "chat",
            "in-app",
            "sms",
          ],
        });

        expect(bundle).to.eql({
          "workflow.json": {
            name: "My new workflow",
            steps: [
              {
                ref: "email_1",
                type: "channel",
                channel_key: "<EMAIL CHANNEL KEY>",
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
                channel_key: "<SMS CHANNEL KEY>",
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
                channel_key: "<PUSH CHANNEL KEY>",
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
                channel_key: "<CHAT CHANNEL KEY>",
                template: {
                  "markdown_body@": xpath("chat_1/markdown_body.md"),
                },
              },
              {
                ref: "in_app_feed_1",
                type: "channel",
                channel_key: "<IN-APP-FEED CHANNEL KEY>",
                template: {
                  "markdown_body@": xpath("in_app_feed_1/markdown_body.md"),
                  action_url: "{{ vars.app_url }}",
                },
              },
              {
                // A second SMS step.
                ref: "sms_2",
                type: "channel",
                channel_key: "<SMS CHANNEL KEY>",
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
