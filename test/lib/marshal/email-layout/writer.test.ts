import path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import {
  EmailLayoutData,
  LAYOUT_JSON,
  pruneLayoutsIndexDir,
} from "@/lib/marshal/email-layout";
import { WithAnnotation } from "@/lib/marshal/shared/types";

describe("lib/marshal/layout/writer", () => {
  describe("pruneLayoutsIndexDir", () => {
    const remoteEmailLayouts: EmailLayoutData<WithAnnotation>[] = [
      {
        key: "foo",
        name: "Foo",
        html_layout: "<html><body><p> Example content </html></body><p>",
        text_layout: "Text {{content}}",
        footer_links: [],
        environment: "development",
        updated_at: "2023-10-02T19:24:48.714630Z",
        created_at: "2023-09-18T18:32:18.398053Z",
        __annotation: {
          extractable_fields: {
            html_layout: { default: true, file_ext: "html" },
            text_layout: { default: true, file_ext: "txt" },
          },
          readonly_fields: ["key", "environment", "created_at", "updated_at"],
        },
      },
    ];

    const layoutsIndexDir = path.resolve(sandboxDir, "layouts");

    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(layoutsIndexDir);
    });

    after(() => {
      fs.removeSync(sandboxDir);
    });

    describe("given a file in the layouts index dir", () => {
      it("removes the file", async () => {
        const filePath = path.resolve(layoutsIndexDir, "foo");
        fs.ensureFileSync(filePath);

        const indexDirCtx = { abspath: layoutsIndexDir, exists: true };
        await pruneLayoutsIndexDir(indexDirCtx, remoteEmailLayouts);

        expect(fs.pathExistsSync(filePath)).to.equal(false);
      });
    });

    describe("given a non layout directory in the layouts index dir", () => {
      it("removes the directory", async () => {
        const dirPath = path.resolve(layoutsIndexDir, "foo");
        fs.ensureDirSync(dirPath);

        const indexDirCtx = { abspath: layoutsIndexDir, exists: true };
        await pruneLayoutsIndexDir(indexDirCtx, remoteEmailLayouts);

        expect(fs.pathExistsSync(dirPath)).to.equal(false);
      });
    });

    describe("given a layout directory not found in remote layouts", () => {
      it("removes the layout directory", async () => {
        const layoutJsonPath = path.resolve(
          layoutsIndexDir,
          "bar",
          LAYOUT_JSON,
        );
        fs.ensureFileSync(layoutJsonPath);

        const indexDirCtx = { abspath: layoutsIndexDir, exists: true };
        await pruneLayoutsIndexDir(indexDirCtx, remoteEmailLayouts);

        expect(fs.pathExistsSync(layoutJsonPath)).to.equal(false);
      });
    });

    describe("given a layout directory found in remote layouts", () => {
      it("retains the layout directory", async () => {
        const layoutJsonPath = path.resolve(
          layoutsIndexDir,
          "foo",
          LAYOUT_JSON,
        );
        fs.ensureFileSync(layoutJsonPath);

        const indexDirCtx = { abspath: layoutsIndexDir, exists: true };
        await pruneLayoutsIndexDir(indexDirCtx, remoteEmailLayouts);

        expect(fs.pathExistsSync(layoutJsonPath)).to.equal(true);
      });
    });
  });
});
