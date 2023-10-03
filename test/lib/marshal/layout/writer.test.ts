import path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";
import { get } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import {
  buildEmailLayoutDirBundle,
  EmailLayoutData,
  LAYOUT_JSON,
  pruneLayoutsIndexDir,
  toEmailLayoutJson,
} from "@/lib/marshal/email-layout";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const annotation = {
  extractable_fields: {
    html_layout: { default: true, file_ext: "html" },
    text_layout: { default: true, file_ext: "txt" },
  },
  readonly_fields: ["key", "environment", "created_at", "updated_at"],
};

const remoteEmailLayout: EmailLayoutData<WithAnnotation> = {
  key: "default",
  name: "Default",
  html_layout: "<html><body><p> Example content </html></body><p>",
  text_layout: "Text {{content}}",
  footer_links: [{ text: "Link 1", url: "https://example.com" }],
  environment: "development",
  updated_at: "2023-10-02T19:24:48.714630Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  __annotation: annotation,
};

describe("lib/marshal/layout/writer", () => {
  describe("toEmailLayoutJson", () => {
    it("moves over layout's readonly fields under __readonly field", () => {
      const layoutJson = toEmailLayoutJson(remoteEmailLayout);

      expect(layoutJson.key).to.equal(undefined);
      expect(layoutJson.environment).to.equal(undefined);
      expect(layoutJson.created_at).to.equal(undefined);
      expect(layoutJson.updated_at).to.equal(undefined);

      expect(layoutJson.__readonly).to.eql({
        key: "default",
        environment: "development",
        created_at: "2023-09-18T18:32:18.398053Z",
        updated_at: "2023-10-02T19:24:48.714630Z",
      });
    });

    it("removes all __annotation fields", () => {
      const layoutJson = toEmailLayoutJson(remoteEmailLayout);

      expect(get(layoutJson, "__annotation")).to.equal(undefined);
    });
  });

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
        __annotation: annotation,
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

  describe("buildEmailLayoutDirBundle", () => {
    describe("given a fetched layout that has not been pulled before", () => {
      const result = buildEmailLayoutDirBundle(remoteEmailLayout);

      expect(result).to.eql({
        "html_layout.html": "<html><body><p> Example content </html></body><p>",
        "text_layout.txt": "Text {{content}}",
        "layout.json": {
          name: "Default",
          footer_links: [{ text: "Link 1", url: "https://example.com" }],
          "html_layout@": "html_layout.html",
          "text_layout@": "text_layout.txt",
          __readonly: {
            key: "default",
            environment: "development",
            created_at: "2023-09-18T18:32:18.398053Z",
            updated_at: "2023-10-02T19:24:48.714630Z",
          },
        },
      });
    });

    describe("given a fetched layout with a local version available", () => {
      it("returns a dir bundle based on a local version and default extract settings", () => {
        const localEmailLayout = {
          name: "default",
          "html_layout@": "foo/bar/layout.html",
          "text_layout@": "text_layout.txt",
        };

        const result = buildEmailLayoutDirBundle(
          remoteEmailLayout,
          localEmailLayout,
        );

        expect(result).to.eql({
          "foo/bar/layout.html":
            "<html><body><p> Example content </html></body><p>",
          "text_layout.txt": "Text {{content}}",
          "layout.json": {
            name: "Default",
            footer_links: [{ text: "Link 1", url: "https://example.com" }],
            "html_layout@": "foo/bar/layout.html",
            "text_layout@": "text_layout.txt",
            __readonly: {
              key: "default",
              environment: "development",
              created_at: "2023-09-18T18:32:18.398053Z",
              updated_at: "2023-10-02T19:24:48.714630Z",
            },
          },
        });
      });
    });
  });
});
