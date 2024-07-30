import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import {
  PARTIAL_JSON,
  PartialData,
  PartialType,
  prunePartialsIndexDir,
} from "@/lib/marshal/partial";
import { WithAnnotation } from "@/lib/marshal/shared/types";

describe("lib/marshal/partial/writer", () => {
  describe("prunePartialsIndexDir", () => {
    const annotation = {
      extractable_fields: {},
      readonly_fields: [
        "environment",
        "key",
        "type",
        "valid",
        "created_at",
        "updated_at",
      ],
    };
    const remotePartials: PartialData<WithAnnotation>[] = [
      {
        key: "foo",
        name: "Foo",
        valid: false,
        content: "content",
        environment: "development",
        type: PartialType.Text,
        visual_block_enabled: false,
        description: "description",
        icon_name: "icon_name",
        created_at: "2022-12-31T12:00:00.000000Z",
        updated_at: "2022-12-31T12:00:00.000000Z",
        __annotation: annotation,
      },
    ];

    const partialsIndexDir = path.resolve(sandboxDir, "partials");

    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(partialsIndexDir);
    });

    after(() => {
      fs.removeSync(sandboxDir);
    });

    describe("given a file in the partials index dir", () => {
      it("removes the file", async () => {
        const filePath = path.resolve(partialsIndexDir, "foo");
        fs.ensureFileSync(filePath);

        const indexDirCtx = { abspath: partialsIndexDir, exists: true };
        await prunePartialsIndexDir(indexDirCtx, remotePartials);

        expect(fs.pathExistsSync(filePath)).to.equal(false);
      });
    });

    describe("given a non partial directory in the partials index dir", () => {
      it("removes the directory", async () => {
        const dirPath = path.resolve(partialsIndexDir, "foo");
        fs.ensureDirSync(dirPath);

        const indexDirCtx = { abspath: partialsIndexDir, exists: true };
        await prunePartialsIndexDir(indexDirCtx, remotePartials);

        expect(fs.pathExistsSync(dirPath)).to.equal(false);
      });
    });

    describe("given a partial directory not found in remote partials", () => {
      it("removes the partial directory", async () => {
        const partialJsonPath = path.resolve(
          partialsIndexDir,
          "bar",
          PARTIAL_JSON,
        );
        fs.ensureFileSync(partialJsonPath);

        const indexDirCtx = { abspath: partialsIndexDir, exists: true };
        await prunePartialsIndexDir(indexDirCtx, remotePartials);

        expect(fs.pathExistsSync(partialJsonPath)).to.equal(false);
      });
    });

    describe("given a partial directory found in remote partials", () => {
      it("retains the partial directory", async () => {
        const partialJsonPath = path.resolve(
          partialsIndexDir,
          "foo",
          PARTIAL_JSON,
        );
        fs.ensureFileSync(partialJsonPath);

        const indexDirCtx = { abspath: partialsIndexDir, exists: true };
        await prunePartialsIndexDir(indexDirCtx, remotePartials);

        expect(fs.pathExistsSync(partialJsonPath)).to.equal(true);
      });
    });
  });
});
