import path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import {
  MESSAGE_TYPE_JSON,
  MessageTypeData,
  pruneMessageTypesIndexDir,
} from "@/lib/marshal/message-type";
import { WithAnnotation } from "@/lib/marshal/shared/types";

describe("lib/marshal/message-type/writer", () => {
  describe("pruneMessageTypesIndexDir", () => {
    const remoteMessageTypes: MessageTypeData<WithAnnotation>[] = [
      {
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
      },
    ];

    const messageTypesIndexDir = path.resolve(sandboxDir, "message_types");

    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(messageTypesIndexDir);
    });

    after(() => {
      fs.removeSync(sandboxDir);
    });

    describe("given a file in the message types index dir", () => {
      it("removes the file", async () => {
        const filePath = path.resolve(messageTypesIndexDir, "foo");
        fs.ensureFileSync(filePath);

        const indexDirCtx = { abspath: messageTypesIndexDir, exists: true };
        await pruneMessageTypesIndexDir(indexDirCtx, remoteMessageTypes);

        expect(fs.pathExistsSync(filePath)).to.equal(false);
      });
    });

    describe("given a non message type directory in the message types index dir", () => {
      it("removes the directory", async () => {
        const dirPath = path.resolve(messageTypesIndexDir, "foo");
        fs.ensureDirSync(dirPath);

        const indexDirCtx = { abspath: messageTypesIndexDir, exists: true };
        await pruneMessageTypesIndexDir(indexDirCtx, remoteMessageTypes);

        expect(fs.pathExistsSync(dirPath)).to.equal(false);
      });
    });

    describe("given a message type directory not found in remote message types", () => {
      it("removes the message type directory", async () => {
        const messageTypeJsonPath = path.resolve(
          messageTypesIndexDir,
          "bar",
          MESSAGE_TYPE_JSON,
        );
        fs.ensureFileSync(messageTypeJsonPath);

        const indexDirCtx = { abspath: messageTypesIndexDir, exists: true };
        await pruneMessageTypesIndexDir(indexDirCtx, remoteMessageTypes);

        expect(fs.pathExistsSync(messageTypeJsonPath)).to.equal(false);
      });
    });

    describe("given a message type directory found in remote message types", () => {
      it("retains the message type directory", async () => {
        const messageTypeJsonPath = path.resolve(
          messageTypesIndexDir,
          "banner",
          MESSAGE_TYPE_JSON,
        );
        fs.ensureFileSync(messageTypeJsonPath);

        const indexDirCtx = { abspath: messageTypesIndexDir, exists: true };
        await pruneMessageTypesIndexDir(indexDirCtx, remoteMessageTypes);

        expect(fs.pathExistsSync(messageTypeJsonPath)).to.equal(true);
      });
    });
  });
});
