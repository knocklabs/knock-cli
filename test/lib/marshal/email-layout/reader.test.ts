import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";
import { get } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { JsonDataError } from "@/lib/helpers/error";
import { LAYOUT_JSON, readEmailLayoutDir } from "@/lib/marshal/email-layout";
import {
  checkIfValidExtractedFilePathFormat,
  readExtractedFileSync,
} from "@/lib/marshal/shared/helpers";
import { EmailLayoutDirContext } from "@/lib/run-context";

const currCwd = process.cwd();

describe("lib/marshal/layout/reader", () => {
  describe("checkIfValidExtractedFilePathFormat", () => {
    const emailLayoutDirCtx = {
      type: "email_layout",
      key: "transactional",
      abspath: "/layouts/transactional",
      exists: true,
    } as EmailLayoutDirContext;

    describe("given an absolute path", () => {
      it("returns true as it's valid", () => {
        const abspath = "html_layout.html";

        const result = checkIfValidExtractedFilePathFormat(
          abspath,
          emailLayoutDirCtx.abspath,
        );

        expect(result).to.equal(true);
      });
    });

    describe("given an relative path that resolves outside the layouts dir", () => {
      it("returns false as it is invalid", () => {
        const relpath = "../foo";

        const result = checkIfValidExtractedFilePathFormat(
          relpath,
          emailLayoutDirCtx.abspath,
        );

        expect(result).to.equal(false);
      });
    });

    describe("given an relative path that resolves inside the layout dir", () => {
      it("returns true as it is valid", () => {
        const relpath1 = "text-layouts/text_layout.txt";
        const result1 = checkIfValidExtractedFilePathFormat(
          relpath1,
          emailLayoutDirCtx.abspath,
        );
        expect(result1).to.equal(true);

        const relpath2 = "./text-layouts/text_layout.txt";
        const result2 = checkIfValidExtractedFilePathFormat(
          relpath2,
          emailLayoutDirCtx.abspath,
        );
        expect(result2).to.equal(true);
      });
    });
  });

  describe("readExtractedFileSync", () => {
    const emailLayoutDirCtx: EmailLayoutDirContext = {
      type: "email_layout",
      key: "transactional",
      abspath: path.resolve(sandboxDir, "transactional"),
      exists: true,
    };

    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDir(emailLayoutDirCtx.abspath);
    });
    after(() => fs.removeSync(sandboxDir));

    describe("given a valid liquid text layout", () => {
      it("returns the read text layout content without errors", async () => {
        const fileContent = `
          {{ vars.app_name }} ({{ vars.app_url }})
          <p>
          Hello {{ recipient.name }}
          </p>
       `.trimStart();

        const filePath = path.resolve(emailLayoutDirCtx.abspath, "sample.txt");
        fs.outputFileSync(filePath, fileContent);

        const [readContent, error] = readExtractedFileSync(
          "sample.txt",
          emailLayoutDirCtx,
        );

        expect(readContent).to.be.a("string");
        expect(error).to.equal(undefined);
      });
    });

    describe("given an invalid liquid text layout", () => {
      it("returns the read text layout content with errors", async () => {
        const fileContent = `
          {{ vars.app_name }} ({{ vars.app_url }})
          <p>
          Hello {{ recipient.name
          </p>
       `.trimStart();

        const filePath = path.resolve(emailLayoutDirCtx.abspath, "sample.txt");
        fs.outputFileSync(filePath, fileContent);

        const [readContent, error] = readExtractedFileSync(
          "sample.txt",
          emailLayoutDirCtx,
        );

        expect(readContent).to.equal(undefined);
        expect(error).to.be.an.instanceof(JsonDataError);
      });
    });
  });

  describe("readEmailLayoutDir", () => {
    const sampleEmailLayoutJson = {
      name: "Transactional",
      "html_layout@": "html_layout.html",
      "text_layout@": "text-layout-examples/text_layout.txt",
      __readonly: {
        key: "transactional",
        environment: "development",
        created_at: "2023-09-18T18:32:18.398053Z",
        updated_at: "2023-10-02T19:24:48.714630Z",
      },
    };

    const emailLayoutDirPath = path.join(
      sandboxDir,
      "layouts",
      "transactional",
    );

    const emailLayoutDirCtx: EmailLayoutDirContext = {
      type: "email_layout",
      key: "transactional",
      abspath: emailLayoutDirPath,
      exists: true,
    };

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample layout directory
      fs.outputJsonSync(
        path.join(emailLayoutDirPath, LAYOUT_JSON),
        sampleEmailLayoutJson,
      );

      fs.outputJsonSync(
        path.join(emailLayoutDirPath, "html_layout.html"),
        "<html><body><p> example </p></body></html>",
      );

      fs.outputJsonSync(
        path.join(
          emailLayoutDirPath,
          "text-layout-examples",
          "text_layout.txt",
        ),
        "foo {{content}}",
      );
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("by default without any opts", () => {
      it("reads layout.json without the readonly field and extracted files joined", async () => {
        const [layout] = await readEmailLayoutDir(emailLayoutDirCtx);

        expect(get(layout, ["name"])).to.equal("Transactional");
        expect(get(layout, ["html_layout@"])).to.equal("html_layout.html");
        expect(get(layout, ["text_layout@"])).to.equal(
          "text-layout-examples/text_layout.txt",
        );
        expect(get(layout, ["__readonly"])).to.equal(undefined);
      });
    });

    describe("with the withExtractedFiles opt of true", () => {
      it("reads layout.json with the extracted fields inlined", async () => {
        const [layout] = await readEmailLayoutDir(emailLayoutDirCtx, {
          withExtractedFiles: true,
        });

        expect(get(layout, ["name"])).to.equal("Transactional");

        // HTML layout content should be inlined into layout data
        expect(get(layout, ["html_layout"])).to.contain(
          "<html><body><p> example </p></body></html>",
        );

        // Text layout content should be inlined into layout data
        expect(get(layout, ["text_layout"])).to.contains("foo {{content}}");
      });
    });
  });
});
