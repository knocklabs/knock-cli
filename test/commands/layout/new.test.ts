import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const files = ["a/b/layout.json", "a/b/c/foo.txt"];
const currCwd = process.cwd();

const setupWithStub = (emailLayout?: any) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getEmailLayout", (stub) =>
      stub.resolves(
        emailLayout
          ? factory.resp({ status: 200, data: emailLayout })
          : factory.resp({ status: 404 }),
      ),
    );

describe("commands/layout/new", () => {
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

  describe("if invoked inside another email layout directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a", "b");
        process.chdir(newCwd);
      })
      .command([
        "layout new",
        "--name",
        "My New Email Layout",
        "--key",
        "my-new-layout",
      ])
      .catch(
        "Cannot create a new email layout inside an existing email_layout directory",
      )
      .it("throws an error");
  });

  describe("given an invalid email layout key, with uppercase chars", () => {
    setupWithStub()
      .command([
        "layout new",
        "--name",
        "My New Email Layout",
        "--key",
        "My-New-Layout",
      ])
      .catch((error) =>
        expect(error.message).to.match(/^Invalid email layout key/),
      )
      .it("throws an error");
  });

  describe("given an email layout key for an existing directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "layout new",
        "--name",
        "My New Email Layout",
        "--key",
        "b",
        "--force",
      ])
      .it("writes an email layout dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "a", "b", "layout.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a valid email layout key and name (without push)", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "layout new",
        "--key",
        "my-new-layout",
        "--name",
        "My New Email Layout",
        "--force",
      ])
      .it(
        "generates a new email layout dir with a scaffolded layout.json",
        () => {
          const layoutJsonPath = path.resolve(
            sandboxDir,
            "a",
            "my-new-layout",
            "layout.json",
          );

          expect(fs.pathExistsSync(layoutJsonPath)).to.equal(true);

          const layoutJson = fs.readJsonSync(layoutJsonPath);
          expect(layoutJson.name).to.equal("My New Email Layout");
          expect(layoutJson["html_layout@"]).to.equal("html_layout.html");
          expect(layoutJson["text_layout@"]).to.equal("text_layout.txt");
        },
      );
  });

  describe("given a valid email layout key", () => {
    setupWithStub()
      .command([
        "layout new",
        "--key",
        "email-layout-with-content",
        "--name",
        "Email Layout With Content",
        "--force",
      ])
      .it(
        "generates an email layout dir with html and text layout files",
        () => {
          const layoutJsonPath = path.resolve(
            sandboxDir,
            "email-layout-with-content",
            "layout.json",
          );
          const htmlLayoutPath = path.resolve(
            sandboxDir,
            "email-layout-with-content",
            "html_layout.html",
          );
          const textLayoutPath = path.resolve(
            sandboxDir,
            "email-layout-with-content",
            "text_layout.txt",
          );

          expect(fs.pathExistsSync(layoutJsonPath)).to.equal(true);
          expect(fs.pathExistsSync(htmlLayoutPath)).to.equal(true);
          expect(fs.pathExistsSync(textLayoutPath)).to.equal(true);

          const layoutJson = fs.readJsonSync(layoutJsonPath);
          expect(layoutJson["html_layout@"]).to.equal("html_layout.html");
          expect(layoutJson["text_layout@"]).to.equal("text_layout.txt");

          const htmlContent = fs.readFileSync(htmlLayoutPath, "utf-8");
          expect(htmlContent).to.include("<!DOCTYPE html>");
          expect(htmlContent).to.include("{{ content }}");

          const textContent = fs.readFileSync(textLayoutPath, "utf-8");
          expect(textContent).to.include("{{ content }}");
        },
      );
  });

  describe("verifying html_layout file structure", () => {
    setupWithStub()
      .command([
        "layout new",
        "--key",
        "html-layout-test",
        "--name",
        "HTML Layout Test",
        "--force",
      ])
      .it("generates html_layout with proper HTML structure", () => {
        const htmlLayoutPath = path.resolve(
          sandboxDir,
          "html-layout-test",
          "html_layout.html",
        );

        expect(fs.pathExistsSync(htmlLayoutPath)).to.equal(true);

        const htmlContent = fs.readFileSync(htmlLayoutPath, "utf-8");
        expect(htmlContent).to.include("<!DOCTYPE html>");
        expect(htmlContent).to.include("<html>");
        expect(htmlContent).to.include("<head>");
        expect(htmlContent).to.include("<body>");
        expect(htmlContent).to.include("{{ content }}");
      });
  });

  describe("verifying text_layout file structure", () => {
    setupWithStub()
      .command([
        "layout new",
        "--key",
        "text-layout-test",
        "--name",
        "Text Layout Test",
        "--force",
      ])
      .it("generates text_layout with proper content", () => {
        const textLayoutPath = path.resolve(
          sandboxDir,
          "text-layout-test",
          "text_layout.txt",
        );

        expect(fs.pathExistsSync(textLayoutPath)).to.equal(true);

        const textContent = fs.readFileSync(textLayoutPath, "utf-8");
        expect(textContent).to.include("{{ content }}");
      });
  });

  describe("verifying layout.json structure", () => {
    setupWithStub()
      .command([
        "layout new",
        "--key",
        "layout-json-test",
        "--name",
        "Layout JSON Test",
        "--force",
      ])
      .it(
        "generates layout.json with proper file references using @ marker",
        () => {
          const layoutJsonPath = path.resolve(
            sandboxDir,
            "layout-json-test",
            "layout.json",
          );

          expect(fs.pathExistsSync(layoutJsonPath)).to.equal(true);

          const layoutJson = fs.readJsonSync(layoutJsonPath);
          expect(layoutJson.name).to.equal("Layout JSON Test");
          expect(layoutJson["html_layout@"]).to.equal("html_layout.html");
          expect(layoutJson["text_layout@"]).to.equal("text_layout.txt");
          expect(layoutJson.html_layout).to.be.undefined;
          expect(layoutJson.text_layout).to.be.undefined;
        },
      );
  });

  describe("given a valid email layout key and a template flag", () => {
    setupWithStub()
      .command([
        "layout new",
        "--key",
        "template-layout",
        "--name",
        "Template Layout",
        "--template",
        // Note: this would need to be a real template from the templates repo
        // For testing, we expect this to fail gracefully if the template doesn't exist
        "email-layouts/nonexistent-template",
        "--force",
      ])
      .catch((error) =>
        expect(error.message).to.match(
          /Failed to generate email layout from template/,
        ),
      )
      .it("attempts to generate from template");
  });
});
