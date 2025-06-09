import { test } from "@oclif/test";

const KNOCK_SERVICE_TOKEN = "valid-token";

describe("commands/push", () => {
  // TODO Test pushes layouts, partials, translations, and workflows
  // TODO Test command only pushes resources when resource-specific subdirectories exist
  // TODO Test error thrown when resource-specific directories are empty

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
