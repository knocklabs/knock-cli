import { expect, test } from "@oclif/test";

describe("ping", () => {
  test
    .stdout()
    .command(["ping"])
    .it("runs hello", (ctx) => {
      expect(ctx.stdout).to.contain("hello world");
    });

  test
    .stdout()
    .command(["ping", "--name", "jeff"])
    .it("runs hello --name jeff", (ctx) => {
      expect(ctx.stdout).to.contain("hello jeff");
    });
});
