import path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import {
  GUIDE_JSON,
  GuideData,
  pruneGuidesIndexDir,
} from "@/lib/marshal/guide";
import { WithAnnotation } from "@/lib/marshal/shared/types";

describe("lib/marshal/guide/writer", () => {
  describe("pruneGuidesIndexDir", () => {
    const remoteGuides: GuideData<WithAnnotation>[] = [
      {
        key: "onboarding",
        valid: true,
        active: true,
        name: "Onboarding Guide",
        description: "Guide for new users",
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
        environment: "development",
        updated_at: "2023-10-02T19:24:48.714630Z",
        created_at: "2023-09-18T18:32:18.398053Z",
        __annotation: {
          extractable_fields: {
            description: { default: true, file_ext: "md" },
          },
          readonly_fields: [
            "key",
            "valid",
            "active",
            "environment",
            "semver",
            "created_at",
            "updated_at",
          ],
        },
      },
    ];

    const guidesIndexDir = path.resolve(sandboxDir, "guides");

    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(guidesIndexDir);
    });

    after(() => {
      fs.removeSync(sandboxDir);
    });

    describe("given a file in the guides index dir", () => {
      it("removes the file", async () => {
        const filePath = path.resolve(guidesIndexDir, "foo");
        fs.ensureFileSync(filePath);

        const indexDirCtx = { abspath: guidesIndexDir, exists: true };
        await pruneGuidesIndexDir(indexDirCtx, remoteGuides);

        expect(fs.pathExistsSync(filePath)).to.equal(false);
      });
    });

    describe("given a non guide directory in the guides index dir", () => {
      it("removes the directory", async () => {
        const dirPath = path.resolve(guidesIndexDir, "foo");
        fs.ensureDirSync(dirPath);

        const indexDirCtx = { abspath: guidesIndexDir, exists: true };
        await pruneGuidesIndexDir(indexDirCtx, remoteGuides);

        expect(fs.pathExistsSync(dirPath)).to.equal(false);
      });
    });

    describe("given a guide directory not found in remote guides", () => {
      it("removes the guide directory", async () => {
        const guideJsonPath = path.resolve(
          guidesIndexDir,
          "welcome",
          GUIDE_JSON,
        );
        fs.ensureFileSync(guideJsonPath);

        const indexDirCtx = { abspath: guidesIndexDir, exists: true };
        await pruneGuidesIndexDir(indexDirCtx, remoteGuides);

        expect(fs.pathExistsSync(guideJsonPath)).to.equal(false);
      });
    });

    describe("given a guide directory found in remote guides", () => {
      it("retains the guide directory", async () => {
        const guideJsonPath = path.resolve(
          guidesIndexDir,
          "onboarding",
          GUIDE_JSON,
        );
        fs.ensureFileSync(guideJsonPath);

        const indexDirCtx = { abspath: guidesIndexDir, exists: true };
        await pruneGuidesIndexDir(indexDirCtx, remoteGuides);

        expect(fs.pathExistsSync(guideJsonPath)).to.equal(true);
      });
    });
  });
});
