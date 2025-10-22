import { expect } from "chai";

import {
  buildMessageTypeDirBundle,
  MessageTypeData,
} from "@/lib/marshal/message-type";
import { prepareResourceJson } from "@/lib/marshal/shared/helpers.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const remoteMessageType: MessageTypeData<WithAnnotation> = {
  key: "banner",
  valid: true,
  owner: "user",
  name: "Banner",
  variants: [
    {
      key: "default",
      name: "Default",
      fields: [
        {
          type: "text",
          key: "title",
          label: "Title",
          settings: {
            required: true,
            default: "",
          },
        },
      ],
    },
  ],
  preview: "<div>{{ title }}</div>",
  semver: "0.0.1",
  description: "My little banner",
  environment: "development",
  updated_at: "2023-10-02T19:24:48.714630Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {
      preview: { default: true, file_ext: "html" },
    },
    readonly_fields: [
      "key",
      "valid",
      "owner",
      "environment",
      "semver",
      "created_at",
      "updated_at",
      "sha",
    ],
  },
};

describe("lib/marshal/message-type/processor", () => {
  describe("prepareResourceJson", () => {
    it("moves over message type's readonly fields under __readonly field", () => {
      const messageTypeJson = prepareResourceJson(remoteMessageType);

      expect(messageTypeJson.key).to.equal(undefined);
      expect(messageTypeJson.valid).to.equal(undefined);
      expect(messageTypeJson.owner).to.equal(undefined);
      expect(messageTypeJson.environment).to.equal(undefined);
      expect(messageTypeJson.semver).to.equal(undefined);
      expect(messageTypeJson.created_at).to.equal(undefined);
      expect(messageTypeJson.updated_at).to.equal(undefined);
      expect(messageTypeJson.sha).to.equal(undefined);

      expect(messageTypeJson.__readonly).to.eql({
        key: "banner",
        valid: true,
        owner: "user",
        environment: "development",
        semver: "0.0.1",
        created_at: "2023-09-18T18:32:18.398053Z",
      });
    });

    it("removes the __annotation field", () => {
      const messageTypeJson = prepareResourceJson(remoteMessageType);
      expect(messageTypeJson.__annotation).to.equal(undefined);
    });
  });

  describe("buildMessageTypeDirBundle", () => {
    describe("given a fetched message type that has not been pulled before", () => {
      const result = buildMessageTypeDirBundle(remoteMessageType);

      expect(result).to.eql({
        "preview.html": "<div>{{ title }}</div>",
        "message_type.json": {
          name: "Banner",
          variants: [
            {
              key: "default",
              name: "Default",
              fields: [
                {
                  type: "text",
                  key: "title",
                  label: "Title",
                  settings: {
                    required: true,
                    default: "",
                  },
                },
              ],
            },
          ],
          description: "My little banner",
          "preview@": "preview.html",
          __readonly: {
            key: "banner",
            valid: true,
            owner: "user",
            environment: "development",
            semver: "0.0.1",
            created_at: "2023-09-18T18:32:18.398053Z",
          },
        },
      });
    });

    describe("given a fetched message type with a local version available", () => {
      it("returns a dir bundle based on a local version and default extract settings", () => {
        const localMessageType = {
          ...remoteMessageType,
          "preview@": "foo/bar/baz.html",
        };

        const result = buildMessageTypeDirBundle(
          remoteMessageType,
          localMessageType,
        );

        expect(result).to.eql({
          "foo/bar/baz.html": "<div>{{ title }}</div>",
          "message_type.json": {
            name: "Banner",
            variants: [
              {
                key: "default",
                name: "Default",
                fields: [
                  {
                    type: "text",
                    key: "title",
                    label: "Title",
                    settings: {
                      required: true,
                      default: "",
                    },
                  },
                ],
              },
            ],
            description: "My little banner",
            "preview@": "foo/bar/baz.html",
            __readonly: {
              key: "banner",
              valid: true,
              owner: "user",
              environment: "development",
              semver: "0.0.1",
              created_at: "2023-09-18T18:32:18.398053Z",
            },
          },
        });
      });
    });

    describe("when called with a $schema", () => {
      it("returns a dir bundle with the $schema in the message_type.json", () => {
        const result = buildMessageTypeDirBundle(
          remoteMessageType,
          {},
          "https://schemas.knock.app/cli/message-type.json",
        );

        expect(result["message_type.json"]).to.contain({
          $schema: "https://schemas.knock.app/cli/message-type.json",
        });
      });
    });
  });
});
