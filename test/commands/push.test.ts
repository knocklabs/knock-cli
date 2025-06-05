import { test } from "@oclif/test";

describe("commands/push", () => {
  describe("without service token", () => {
    test
      .command(["push", "--knock-dir", "."])
      .exit(2)
      .it("exits with status 2");
  });

  describe("without directory", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["push"])
      .exit(2)
      .it("exits with status 2");
  });
});
