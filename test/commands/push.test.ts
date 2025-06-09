import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";

const KNOCK_SERVICE_TOKEN = "valid-token";

describe("commands/push", () => {
  // TODO Test pushes layouts, partials, translations, and workflows
  // TODO Test command only pushes resources when resource-specific subdirectories exist

  describe("with service token", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      process.env = {
        ...originalEnv,
        KNOCK_SERVICE_TOKEN: "valid-token",
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    describe("with development environment", () => {
      describe("and an empty layouts directory", () => {
        let layoutsDirPath: string;

        beforeEach(() => {
          layoutsDirPath = path.resolve(sandboxDir, "layouts");
          fs.ensureDirSync(layoutsDirPath);
          process.chdir(sandboxDir);
        });

        afterEach(() => {
          fs.removeSync(layoutsDirPath);
        });

        test
          .stdout()
          .command(["push", "--knock-dir", "."])
          .catch((error) =>
            expect(error.message).to.match(/No layout directories found in/),
          )
          .it("throws an error");
      });

      describe("and an empty partials directory", () => {
        let partialsDirPath: string;

        beforeEach(() => {
          partialsDirPath = path.resolve(sandboxDir, "partials");
          fs.ensureDirSync(partialsDirPath);
          process.chdir(sandboxDir);
        });

        afterEach(() => {
          fs.removeSync(partialsDirPath);
        });

        test
          .stdout()
          .command(["push", "--knock-dir", "."])
          .catch((error) =>
            expect(error.message).to.match(/No partial directories found in/),
          )
          .it("throws an error");
      });

      describe("and an empty translations directory", () => {
        let translationsDirPath: string;

        beforeEach(() => {
          translationsDirPath = path.resolve(sandboxDir, "translations");
          fs.ensureDirSync(translationsDirPath);
          process.chdir(sandboxDir);
        });

        afterEach(() => {
          fs.removeSync(translationsDirPath);
        });

        test
          .stdout()
          .command(["push", "--knock-dir", "."])
          .catch((error) =>
            expect(error.message).to.match(/No translation files found in/),
          )
          .it("throws an error");
      });

      describe("and an empty workflows directory", () => {
        let workflowsDirPath: string;

        beforeEach(() => {
          workflowsDirPath = path.resolve(sandboxDir, "workflows");
          fs.ensureDirSync(workflowsDirPath);
          process.chdir(sandboxDir);
        });

        afterEach(() => {
          fs.removeSync(workflowsDirPath);
        });

        test
          .stdout()
          .command(["push", "--knock-dir", "."])
          .catch((error) =>
            expect(error.message).to.match(/No workflow directories found in/),
          )
          .it("throws an error");
      });
    });
  });

  describe("with environment other than development", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN })
      .command(["push", "--knock-dir", ".", "--environment", "production"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("without directory", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN })
      .command(["push"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("without service token", () => {
    test
      .command(["push", "--knock-dir", "."])
      .exit(2)
      .it("exits with status 2");
  });
});
