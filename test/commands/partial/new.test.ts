import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const files = ["a/b/partial.json", "a/b/c/foo.txt"];
const currCwd = process.cwd();

const setupWithStub = (partial?: any) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getPartial", (stub) =>
      stub.resolves(
        partial
          ? factory.resp({ status: 200, data: partial })
          : factory.resp({ status: 404 }),
      ),
    );

describe("commands/partial/new", () => {
  before(() => {
    fs.removeSync(sandboxDir);

    for (const relpath of files) {
      const abspath = path.join(sandboxDir, relpath);
      fs.ensureFileSync(abspath);
    }
  });
  beforeEach(() => {
    process.chdir(sandboxDir);
  });
  after(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("if invoked inside another partial directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a", "b");
        process.chdir(newCwd);
      })
      .command([
        "partial new",
        "--name",
        "My New Partial",
        "--key",
        "my-new-partial",
        "--type",
        "html",
      ])
      .catch("Cannot create a new partial inside an existing partial directory")
      .it("throws an error");
  });

  describe("given an invalid partial key, with uppercase chars", () => {
    setupWithStub()
      .command([
        "partial new",
        "--name",
        "My New Partial",
        "--key",
        "My-New-Partial",
        "--type",
        "html",
      ])
      .catch((error) => expect(error.message).to.match(/^Invalid partial key/))
      .it("throws an error");
  });

  describe("given a partial key for an existing directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "partial new",
        "--name",
        "My New Partial",
        "--key",
        "b",
        "--force",
        "--type",
        "html",
      ])
      .it("writes a partial dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "a", "b", "partial.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a valid partial key and a type flag (without push)", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "partial new",
        "--key",
        "my-new-partial",
        "--name",
        "My New Partial",
        "--force",
        "--type",
        "html",
      ])
      .it("generates a new partial dir with a scaffolded partial.json", () => {
        const partialJsonPath = path.resolve(
          sandboxDir,
          "a",
          "my-new-partial",
          "partial.json",
        );

        expect(fs.pathExistsSync(partialJsonPath)).to.equal(true);

        const partialJson = fs.readJsonSync(partialJsonPath);
        expect(partialJson.name).to.equal("My New Partial");
        expect(partialJson.type).to.equal("html");
        expect(partialJson["content@"]).to.equal("content.html");
      });
  });

  describe("given a valid partial key and type html", () => {
    setupWithStub()
      .command([
        "partial new",
        "--key",
        "html-partial",
        "--name",
        "HTML Partial",
        "--type",
        "html",
        "--force",
      ])
      .it("generates a partial dir with html content file", () => {
        const partialJsonPath = path.resolve(
          sandboxDir,
          "html-partial",
          "partial.json",
        );
        const contentFilePath = path.resolve(
          sandboxDir,
          "html-partial",
          "content.html",
        );

        expect(fs.pathExistsSync(partialJsonPath)).to.equal(true);
        expect(fs.pathExistsSync(contentFilePath)).to.equal(true);

        const partialJson = fs.readJsonSync(partialJsonPath);
        expect(partialJson.type).to.equal("html");
        expect(partialJson["content@"]).to.equal("content.html");

        const content = fs.readFileSync(contentFilePath, "utf-8");
        expect(content).to.include("<div>");
      });
  });

  describe("given a valid partial key and type json", () => {
    setupWithStub()
      .command([
        "partial new",
        "--key",
        "json-partial",
        "--name",
        "JSON Partial",
        "--type",
        "json",
        "--force",
      ])
      .it("generates a partial dir with json content file", () => {
        const partialJsonPath = path.resolve(
          sandboxDir,
          "json-partial",
          "partial.json",
        );
        const contentFilePath = path.resolve(
          sandboxDir,
          "json-partial",
          "content.json",
        );

        expect(fs.pathExistsSync(partialJsonPath)).to.equal(true);
        expect(fs.pathExistsSync(contentFilePath)).to.equal(true);

        const partialJson = fs.readJsonSync(partialJsonPath);
        expect(partialJson.type).to.equal("json");
        expect(partialJson["content@"]).to.equal("content.json");
      });
  });

  describe("given a valid partial key and type markdown", () => {
    setupWithStub()
      .command([
        "partial new",
        "--key",
        "md-partial",
        "--name",
        "Markdown Partial",
        "--type",
        "markdown",
        "--force",
      ])
      .it("generates a partial dir with markdown content file", () => {
        const partialJsonPath = path.resolve(
          sandboxDir,
          "md-partial",
          "partial.json",
        );
        const contentFilePath = path.resolve(
          sandboxDir,
          "md-partial",
          "content.md",
        );

        expect(fs.pathExistsSync(partialJsonPath)).to.equal(true);
        expect(fs.pathExistsSync(contentFilePath)).to.equal(true);

        const partialJson = fs.readJsonSync(partialJsonPath);
        expect(partialJson.type).to.equal("markdown");
        expect(partialJson["content@"]).to.equal("content.md");
      });
  });

  describe("given a valid partial key and type text", () => {
    setupWithStub()
      .command([
        "partial new",
        "--key",
        "text-partial",
        "--name",
        "Text Partial",
        "--type",
        "text",
        "--force",
      ])
      .it("generates a partial dir with text content file", () => {
        const partialJsonPath = path.resolve(
          sandboxDir,
          "text-partial",
          "partial.json",
        );
        const contentFilePath = path.resolve(
          sandboxDir,
          "text-partial",
          "content.txt",
        );

        expect(fs.pathExistsSync(partialJsonPath)).to.equal(true);
        expect(fs.pathExistsSync(contentFilePath)).to.equal(true);

        const partialJson = fs.readJsonSync(partialJsonPath);
        expect(partialJson.type).to.equal("text");
        expect(partialJson["content@"]).to.equal("content.txt");
      });
  });

  describe("given a valid partial key and a template flag", () => {
    setupWithStub()
      .command([
        "partial new",
        "--key",
        "template-partial",
        "--name",
        "Template Partial",
        "--template",
        // Note: this would need to be a real template from the templates repo
        // For testing, we expect this to fail gracefully if the template doesn't exist
        "partials/nonexistent-template",
        "--force",
      ])
      .catch((error) =>
        expect(error.message).to.match(
          /Failed to generate partial from template/,
        ),
      )
      .it("attempts to generate from template");
  });
});
