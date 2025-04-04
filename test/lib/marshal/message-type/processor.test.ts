import { expect } from "chai";

import {
  buildMessageTypeDirBundle,
  MessageTypeData,
} from "@/lib/marshal/message-type";
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
    ],
  },
};

describe("lib/marshal/message-typel/processor", () => {
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
            updated_at: "2023-10-02T19:24:48.714630Z",
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
              updated_at: "2023-10-02T19:24:48.714630Z",
            },
          },
        });
      });
    });
  });
});
