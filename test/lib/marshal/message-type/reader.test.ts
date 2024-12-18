import * as path from "node:path";

import { get } from "lodash";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import {
  MESSAGE_TYPE_JSON,
  readAllForCommandTarget,
  readMessageTypeDir,
} from "@/lib/marshal/message-type";
import { MessageTypeDirContext } from "@/lib/run-context";

const currCwd = process.cwd();

describe("lib/marshal/message-type/reader", () => {
  describe("readAllForCommandTarget", () => {
    const messageTypesDirPath = path.join(sandboxDir, "message_types");

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample message types directory, json content not important.
      fs.outputJSONSync(
        path.join(messageTypesDirPath, "card", "message_type.json"),
        {
          name: "Card",
        },
      );
      fs.outputJSONSync(
        path.join(messageTypesDirPath, "banner", "message_type.json"),
        {
          name: "Banner",
        },
      );
      fs.outputJSONSync(
        path.join(messageTypesDirPath, "modal", "message_type.json"),
        {
          name: "Modal",
        },
      );
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("given a message type dir target", () => {
      it("returns all message type files for the target index directory", async () => {
        const messageTypesIndexDirCtx: DirContext = {
          abspath: messageTypesDirPath,
          exists: true,
        };

        const [messageTypes, errors] = await readAllForCommandTarget({
          type: "messageTypesIndexDir",
          context: messageTypesIndexDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(messageTypes.length).to.equal(3);
      });

      it("returns the target message type file for the target directory", async () => {
        const messageTypeDirCtx: MessageTypeDirContext = {
          type: "message_type",
          key: "banner",
          abspath: path.join(messageTypesDirPath, "banner"),
          exists: true,
        };

        const [messageTypes, errors] = await readAllForCommandTarget({
          type: "messageTypeDir",
          context: messageTypeDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(messageTypes.length).to.equal(1);
        expect(messageTypes[0].key).to.equal("banner");
      });
    });
  });

  describe("readMessageTypeDir", () => {
    const sampleMessageTypeJson = {
      description: "Lorem ipsum.",
      icon_name: "PictureInPicture",
      name: "Modal",
      variants: [
        {
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
          key: "default",
          name: "Default",
        },
      ],
      "preview@": "preview.html",
      __readonly: {
        key: "modal",
        valid: true,
        owner: "system",
        environment: "development",
        semver: "0.0.4",
        created_at: "2024-09-17T23:28:39.939366Z",
        updated_at: "2024-10-18T06:43:37.942727Z",
        sha: "OdCrRlz43e2y0ZAHNqyIkp/Vva/xSK1shKF4i8vXx3Y=",
      },
    };

    const messageTypeDirPath = path.join(sandboxDir, "message_types", "modal");

    const messageTypeDirCtx: MessageTypeDirContext = {
      type: "message_type",
      key: "modal",
      abspath: messageTypeDirPath,
      exists: true,
    };

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample message type directory
      fs.outputJsonSync(
        path.join(messageTypeDirPath, MESSAGE_TYPE_JSON),
        sampleMessageTypeJson,
      );

      fs.outputJsonSync(
        path.join(messageTypeDirPath, "preview.html"),
        "<div>{{ title }}</div>",
      );
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("by default without any opts", () => {
      it("reads message_type.json without the readonly field and extracted files joined", async () => {
        const [messageType] = await readMessageTypeDir(messageTypeDirCtx);

        expect(get(messageType, ["name"])).to.equal("Modal");
        expect(get(messageType, ["preview@"])).to.equal("preview.html");
        expect(get(messageType, ["preview"])).to.equal(undefined);
        expect(get(messageType, ["__readonly"])).to.equal(undefined);
      });
    });

    describe("with the withReadonlyField opt of true", () => {
      it("reads message_type.json with the readonly field", async () => {
        const [messageType] = await readMessageTypeDir(messageTypeDirCtx, {
          withReadonlyField: true,
        });

        expect(get(messageType, ["name"])).to.equal("Modal");
        expect(get(messageType, ["preview@"])).to.equal("preview.html");
        expect(get(messageType, ["preview"])).to.equal(undefined);

        expect(get(messageType, ["__readonly"])).to.eql({
          key: "modal",
          valid: true,
          owner: "system",
          environment: "development",
          semver: "0.0.4",
          created_at: "2024-09-17T23:28:39.939366Z",
          updated_at: "2024-10-18T06:43:37.942727Z",
          sha: "OdCrRlz43e2y0ZAHNqyIkp/Vva/xSK1shKF4i8vXx3Y=",
        });
      });
    });

    describe("with the withExtractedFiles opt of true", () => {
      it("reads message_type.json with the extracted fields inlined", async () => {
        const [messageType] = await readMessageTypeDir(messageTypeDirCtx, {
          withExtractedFiles: true,
        });

        expect(get(messageType, ["name"])).to.equal("Modal");
        expect(get(messageType, ["preview@"])).to.equal("preview.html");
        expect(get(messageType, ["preview"])).to.contain(
          "<div>{{ title }}</div>",
        );

        expect(get(messageType, ["__readonly"])).to.eql(undefined);
      });
    });
  });
});
