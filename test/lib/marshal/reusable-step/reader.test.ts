import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";
import { get } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import {
  readAllForCommandTarget,
  readReusableStepDir,
  REUSABLE_STEP_JSON,
} from "@/lib/marshal/reusable-step";
import { ReusableStepDirContext } from "@/lib/run-context";

const currCwd = process.cwd();

describe("lib/marshal/reusable-step/reader", () => {
  describe("readAllForCommandTarget", () => {
    const reusableStepsDirPath = path.join(sandboxDir, "reusable_steps");

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample reusable steps directory, json content not important.
      fs.outputJSONSync(
        path.join(
          reusableStepsDirPath,
          "fetch-user-data",
          "reusable-step.json",
        ),
        {
          key: "fetch-user-data",
          step: {
            type: "http_fetch",
            url: "https://api.example.com/users/{{ recipient.id }}",
            method: "GET",
          },
        },
      );
      fs.outputJSONSync(
        path.join(
          reusableStepsDirPath,
          "send-notification",
          "reusable-step.json",
        ),
        {
          key: "send-notification",
          step: {
            type: "http_fetch",
            url: "https://api.example.com/notify",
            method: "POST",
          },
        },
      );
      fs.outputJSONSync(
        path.join(reusableStepsDirPath, "validate-data", "reusable-step.json"),
        {
          key: "validate-data",
          step: {
            type: "http_fetch",
            url: "https://api.example.com/validate",
            method: "POST",
          },
        },
      );
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("given a reusable steps index dir target", () => {
      it("returns all reusable step files for the target index directory", async () => {
        const reusableStepsIndexDirCtx: DirContext = {
          abspath: reusableStepsDirPath,
          exists: true,
        };

        const [reusableSteps, errors] = await readAllForCommandTarget({
          type: "reusableStepsIndexDir",
          context: reusableStepsIndexDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(reusableSteps.length).to.equal(3);
      });
    });

    describe("given a reusable step dir target", () => {
      it("returns the target reusable step file for the target directory", async () => {
        const reusableStepDirCtx: ReusableStepDirContext = {
          type: "reusable_step",
          key: "fetch-user-data",
          abspath: path.join(reusableStepsDirPath, "fetch-user-data"),
          exists: true,
        };

        const [reusableSteps, errors] = await readAllForCommandTarget({
          type: "reusableStepDir",
          context: reusableStepDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(reusableSteps.length).to.equal(1);
        expect(reusableSteps[0].key).to.equal("fetch-user-data");
      });
    });
  });

  describe("readReusableStepDir", () => {
    const sampleReusableStepJson = {
      key: "fetch-user-data",
      step: {
        type: "http_fetch",
        url: "https://api.example.com/users/{{ recipient.id }}",
        method: "GET",
        headers: {
          Authorization: "Bearer {{ data.api_token }}",
          "Content-Type": "application/json",
        },
        timeout: 30_000,
        retry_policy: {
          max_attempts: 3,
          backoff_type: "exponential",
          initial_delay: 1000,
        },
      },
      __readonly: {
        id: "reusable-step-id",
        type: "http_fetch",
        created_at: "2023-09-18T18:32:18.398053Z",
        updated_at: "2023-10-02T19:24:48.714630Z",
        sha: "<SOME_SHA>",
      },
    };

    const reusableStepDirPath = path.join(
      sandboxDir,
      "reusable_steps",
      "fetch-user-data",
    );

    const reusableStepDirCtx: ReusableStepDirContext = {
      type: "reusable_step",
      key: "fetch-user-data",
      abspath: reusableStepDirPath,
      exists: true,
    };

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample reusable step directory
      fs.outputJsonSync(
        path.join(reusableStepDirPath, REUSABLE_STEP_JSON),
        sampleReusableStepJson,
      );
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("by default without any opts", () => {
      it("reads reusable-step.json without the readonly field", async () => {
        const [reusableStep] = await readReusableStepDir(reusableStepDirCtx);

        expect(get(reusableStep, ["key"])).to.equal("fetch-user-data");
        expect(get(reusableStep, ["step", "type"])).to.equal("http_fetch");
        expect(get(reusableStep, ["step", "url"])).to.equal(
          "https://api.example.com/users/{{ recipient.id }}",
        );
        expect(get(reusableStep, ["step", "method"])).to.equal("GET");
        expect(get(reusableStep, ["__readonly"])).to.equal(undefined);
      });
    });

    describe("with the withExtractedFiles opt of true", () => {
      it("reads reusable-step.json (no extracted files for reusable steps currently)", async () => {
        const [reusableStep] = await readReusableStepDir(reusableStepDirCtx, {
          withExtractedFiles: true,
        });

        expect(get(reusableStep, ["key"])).to.equal("fetch-user-data");
        expect(get(reusableStep, ["step", "type"])).to.equal("http_fetch");
        expect(get(reusableStep, ["step", "url"])).to.equal(
          "https://api.example.com/users/{{ recipient.id }}",
        );
        expect(get(reusableStep, ["step", "method"])).to.equal("GET");
        expect(get(reusableStep, ["__readonly"])).to.equal(undefined);
      });
    });
  });
});
