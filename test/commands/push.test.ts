import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { factory } from "@/../test/support";
import PartialValidate from "@/commands/partial/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const KNOCK_SERVICE_TOKEN = "valid-token";

const setupWithPartialsStubs = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(PartialValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertPartial", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

describe("commands/push", () => {
  // TODO Test pushes layouts, partials, translations, and workflows
  // TODO Test command only pushes resources when resource-specific subdirectories exist
  // TODO Test error thrown when resource-specific directories are empty

  describe("with development environment", () => {
    describe("and an empty partials directory", () => {
      beforeEach(() => {
        const partialsDirPath = path.resolve(sandboxDir, "partials");
        fs.ensureDirSync(partialsDirPath);
        process.chdir(sandboxDir);
      });

      setupWithPartialsStubs()
        .stdout()
        .command(["push", "--knock-dir", "."])
        .catch((error) =>
          expect(error.message).to.match(/No partial directories found in/),
        )
        .it("throws an error");
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
