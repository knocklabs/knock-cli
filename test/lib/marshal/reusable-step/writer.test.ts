import path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";

import { factory } from "@/../test/support";
import { sandboxDir } from "@/lib/helpers/const";
import {
  pruneReusableStepsIndexDir,
  REUSABLE_STEP_JSON,
  ReusableStepData,
} from "@/lib/marshal/reusable-step";
import { WithAnnotation } from "@/lib/marshal/shared/types";

describe("lib/marshal/reusable-step/writer", () => {
  describe("pruneReusableStepsIndexDir", () => {
    const remoteReusableSteps: ReusableStepData<WithAnnotation>[] = [
      {
        ...factory.reusableStep({
          id: "reusable-step-id-1",
          created_at: "2023-09-18T18:32:18.398053Z",
          updated_at: "2023-10-02T19:24:48.714630Z",
        }),
        __annotation: {
          extractable_fields: {},
          readonly_fields: ["id", "type", "created_at", "updated_at", "sha"],
        },
      },
    ];

    const reusableStepsIndexDir = path.resolve(sandboxDir, "reusable_steps");

    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(reusableStepsIndexDir);
    });

    after(() => {
      fs.removeSync(sandboxDir);
    });

    describe("given a file in the reusable steps index dir", () => {
      it("removes the file", async () => {
        const filePath = path.resolve(reusableStepsIndexDir, "foo");
        fs.ensureFileSync(filePath);

        const indexDirCtx = { abspath: reusableStepsIndexDir, exists: true };
        await pruneReusableStepsIndexDir(indexDirCtx, remoteReusableSteps);

        expect(fs.pathExistsSync(filePath)).to.equal(false);
      });
    });

    describe("given a non reusable step directory in the reusable steps index dir", () => {
      it("removes the directory", async () => {
        const dirPath = path.resolve(reusableStepsIndexDir, "foo");
        fs.ensureDirSync(dirPath);

        const indexDirCtx = { abspath: reusableStepsIndexDir, exists: true };
        await pruneReusableStepsIndexDir(indexDirCtx, remoteReusableSteps);

        expect(fs.pathExistsSync(dirPath)).to.equal(false);
      });
    });

    describe("given a reusable step directory not found in remote reusable steps", () => {
      it("removes the reusable step directory", async () => {
        const reusableStepJsonPath = path.resolve(
          reusableStepsIndexDir,
          "old-step",
          REUSABLE_STEP_JSON,
        );
        fs.ensureFileSync(reusableStepJsonPath);

        const indexDirCtx = { abspath: reusableStepsIndexDir, exists: true };
        await pruneReusableStepsIndexDir(indexDirCtx, remoteReusableSteps);

        expect(fs.pathExistsSync(reusableStepJsonPath)).to.equal(false);
      });
    });

    describe("given a reusable step directory found in remote reusable steps", () => {
      it("retains the reusable step directory", async () => {
        const reusableStepJsonPath = path.resolve(
          reusableStepsIndexDir,
          "fetch-user-data",
          REUSABLE_STEP_JSON,
        );
        fs.ensureFileSync(reusableStepJsonPath);

        const indexDirCtx = { abspath: reusableStepsIndexDir, exists: true };
        await pruneReusableStepsIndexDir(indexDirCtx, remoteReusableSteps);

        expect(fs.pathExistsSync(reusableStepJsonPath)).to.equal(true);
      });
    });
  });
});
