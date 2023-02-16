import { expect } from "@oclif/test";

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
                  "text_body@": "sms_1/text_body.txt",
                },
              },
            ],
          },
          "sms_1/text_body.txt": "Hello, {{ recipient.name }}!",
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
                  "html_body@": "email_1/html_body.html",
                },
              },
              {
                ref: "sms_1",
                type: "channel",
                channel_key: "<SMS CHANNEL KEY>",
                template: {
                  "text_body@": "sms_1/text_body.txt",
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
                  "text_body@": "push_1/text_body.txt",
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
                  "markdown_body@": "chat_1/markdown_body.md",
                },
              },
              {
                ref: "in_app_feed_1",
                type: "channel",
                channel_key: "<IN-APP-FEED CHANNEL KEY>",
                template: {
                  "markdown_body@": "in_app_feed_1/markdown_body.md",
                  action_url: "{{ vars.app_url }}",
                },
              },
              {
                // A second SMS step.
                ref: "sms_2",
                type: "channel",
                channel_key: "<SMS CHANNEL KEY>",
                template: {
                  "text_body@": "sms_2/text_body.txt",
                },
              },
            ],
          },
          "email_1/html_body.html":
            "<p>Hello, <strong>{{ recipient.name }}</strong>!</p>",
          "sms_1/text_body.txt": "Hello, {{ recipient.name }}!",
          "push_1/text_body.txt": "Hello, {{ recipient.name }}!",
          "chat_1/markdown_body.md": "Hello, **{{ recipient.name }}**!",
          "in_app_feed_1/markdown_body.md": "Hello, **{{ recipient.name }}**!",
          "sms_2/text_body.txt": "Hello, {{ recipient.name }}!",
        });
      });
    });
  });
});
