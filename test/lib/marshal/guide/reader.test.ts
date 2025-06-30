import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";
import { get } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import {
  GUIDE_JSON,
  readAllForCommandTarget,
  readGuideDir,
} from "@/lib/marshal/guide";
import { GuideDirContext } from "@/lib/run-context";

const currCwd = process.cwd();

describe("lib/marshal/guide/reader", () => {
  describe("readAllForCommandTarget", () => {
    const guidesDirPath = path.join(sandboxDir, "guides");

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample guides directory, json content not important.
      fs.outputJSONSync(path.join(guidesDirPath, "onboarding", "guide.json"), {
        name: "Onboarding Guide",
      });
      fs.outputJSONSync(path.join(guidesDirPath, "welcome", "guide.json"), {
        name: "Welcome Guide",
      });
      fs.outputJSONSync(path.join(guidesDirPath, "tutorial", "guide.json"), {
        name: "Tutorial Guide",
      });
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("given a guides index dir target", () => {
      it("returns all guide files for the target index directory", async () => {
        const guidesIndexDirCtx: DirContext = {
          abspath: guidesDirPath,
          exists: true,
        };

        const [guides, errors] = await readAllForCommandTarget({
          type: "guidesIndexDir",
          context: guidesIndexDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(guides.length).to.equal(3);
      });

      it("returns the target guide file for the target directory", async () => {
        const guideDirCtx: GuideDirContext = {
          type: "guide",
          key: "welcome",
          abspath: path.join(guidesDirPath, "welcome"),
          exists: true,
        };

        const [guides, errors] = await readAllForCommandTarget({
          type: "guideDir",
          context: guideDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(guides.length).to.equal(1);
        expect(guides[0].key).to.equal("welcome");
      });
    });
  });

  describe("readGuideDir", () => {
    const sampleGuideJson = {
      description: "A comprehensive onboarding guide for new users.",
      name: "Onboarding Guide",
      priority: "10",
      channel_key: "knock-guide",
      type: "tutorial",
      semver: "1.0.0",
      steps: [
        {
          ref: "step-1",
          name: "Welcome Step",
          schema_key: "welcome",
          schema_semver: "1.0.0",
          schema_variant_key: "default",
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
      __readonly: {
        key: "onboarding",
        valid: true,
        active: true,
        environment: "development",
        semver: "1.0.0",
        created_at: "2024-09-17T23:28:39.939366Z",
        updated_at: "2024-10-18T06:43:37.942727Z",
        sha: "OdCrRlz43e2y0ZAHNqyIkp/Vva/xSK1shKF4i8vXx3Y=",
      },
    };

    const guideDirPath = path.join(sandboxDir, "guides", "onboarding");

    const guideDirCtx: GuideDirContext = {
      type: "guide",
      key: "onboarding",
      abspath: guideDirPath,
      exists: true,
    };

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample guide directory
      fs.outputJsonSync(path.join(guideDirPath, GUIDE_JSON), sampleGuideJson);
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("by default without any opts", () => {
      it("reads guide.json without the readonly field and extracted files joined", async () => {
        const [guide] = await readGuideDir(guideDirCtx);

        expect(get(guide, ["name"])).to.equal("Onboarding Guide");
        expect(get(guide, ["description"])).to.equal(
          "A comprehensive onboarding guide for new users.",
        );
        expect(get(guide, ["__readonly"])).to.equal(undefined);
      });
    });

    describe("with the withExtractedFiles opt of true", () => {
      it("reads guide.json with the extracted fields inlined", async () => {
        const [guide] = await readGuideDir(guideDirCtx, {
          withExtractedFiles: true,
        });

        expect(get(guide, ["name"])).to.equal("Onboarding Guide");
        expect(get(guide, ["description"])).to.equal(
          "A comprehensive onboarding guide for new users.",
        );

        expect(get(guide, ["__readonly"])).to.equal(undefined);
      });
    });
  });
});
