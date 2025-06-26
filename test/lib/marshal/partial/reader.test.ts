import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";
import { get } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import {
  readAllForCommandTarget,
  readPartialDir,
} from "@/lib/marshal/partial/reader";
import { PartialDirContext } from "@/lib/run-context";

const currCwd = process.cwd();

describe("lib/marshal/partial/reader", () => {
  describe("readAllForCommandTarget", () => {
    const partialsDirPath = path.join(sandboxDir, "partials");

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample partials directory.
      fs.outputJSONSync(path.join(partialsDirPath, "cta", "partial.json"), {
        foo: "bar",
      });
      fs.outputJSONSync(path.join(partialsDirPath, "notif", "partial.json"), {
        foo: "bar",
      });
      fs.outputJSONSync(path.join(partialsDirPath, "txt", "partial.json"), {
        foo: "bar",
      });
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("given a partial dir target", () => {
      it("returns partial files for index", async () => {
        const partialDirCtx: DirContext = {
          abspath: partialsDirPath,
          exists: true,
        };

        const [partials, errors] = await readAllForCommandTarget({
          type: "partialsIndexDir",
          context: partialDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(partials.length).to.equal(3);
      });

      it("returns partial file", async () => {
        const partialDirCtx: PartialDirContext = {
          type: "partial",
          key: "cta",
          abspath: path.join(partialsDirPath, "cta"),
          exists: true,
        };

        const [partials, errors] = await readAllForCommandTarget({
          type: "partialDir",
          context: partialDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(partials.length).to.equal(1);
        expect(partials[0].key).to.equal("cta");
      });
    });
  });

  describe("readPartialDir", () => {
    const samplePartialJson = {
      icon_name: "BellIcon",
      name: "CTA Button",
      visual_block_enabled: false,
      "content@": "content.html",
      __readonly: {
        environment: "development",
        key: "cta-button",
        type: "html",
        valid: true,
        created_at: "2024-09-17T23:28:39.939366Z",
        updated_at: "2024-10-18T06:43:37.942727Z",
      },
    };

    const partialDirPath = path.join(sandboxDir, "partials", "cta-button");

    const partialDirCtx: PartialDirContext = {
      type: "partial",
      key: "cta-button",
      abspath: partialDirPath,
      exists: true,
    };

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample partial directory
      fs.outputJsonSync(
        path.join(partialDirPath, "partial.json"),
        samplePartialJson,
      );

      fs.outputFileSync(
        path.join(partialDirPath, "content.html"),
        "<button>{{ content }}</button>",
      );
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("by default without any opts", () => {
      it("reads partial.json without the readonly field and extracted files joined", async () => {
        const [partial] = await readPartialDir(partialDirCtx);

        expect(get(partial, ["icon_name"])).to.equal("BellIcon");
        expect(get(partial, ["name"])).to.equal("CTA Button");
        expect(get(partial, ["visual_block_enabled"])).to.equal(false);
        expect(get(partial, ["content@"])).to.equal("content.html");
        expect(get(partial, ["content"])).to.equal(undefined);
        expect(get(partial, ["__readonly"])).to.equal(undefined);
      });
    });

    describe("with the withExtractedFiles opt of true", () => {
      it("reads partial.json with the extracted fields inlined", async () => {
        const [partial] = await readPartialDir(partialDirCtx, {
          withExtractedFiles: true,
        });

        expect(get(partial, ["icon_name"])).to.equal("BellIcon");
        expect(get(partial, ["name"])).to.equal("CTA Button");
        expect(get(partial, ["visual_block_enabled"])).to.equal(false);
        expect(get(partial, ["content@"])).to.equal("content.html");
        expect(get(partial, ["content"])).to.contain(
          "<button>{{ content }}</button>",
        );

        expect(get(partial, ["__readonly"])).to.equal(undefined);
      });
    });
  });
});
