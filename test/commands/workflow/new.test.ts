import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/env";

const files = ["a/b/workflow.json", "a/b/c/foo.txt"];
const currCwd = process.cwd();

describe("commands/workflow/new", () => {
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

  describe("if invoked inside another workflow directory", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a", "b");
        process.chdir(newCwd);
      })
      .command(["workflow new", "my-workflow"])
      .catch("Cannot generate inside an existing workflow directory")
      .it("throws an error");
  });

  describe("given no workflow key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["workflow new"])
      .catch((error) =>
        expect(error.message).to.match(/^Missing 1 required arg:\nworkflowKey/),
      )
      .it("throws an error");
  });

  describe("given an invalid workflow key, with uppercase chars", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["workflow new", "My-New-Workflow"])
      .catch((error) => expect(error.message).to.match(/^Invalid workflow key/))
      .it("throws an error");
  });

  describe("given an invalid workflow key, with whitespaces", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["workflow new", "My New Workflow"])
      .catch((error) => expect(error.message).to.match(/^Invalid workflow key/))
      .it("throws an error");
  });

  describe("given an invalid workflow key, with special chars", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["workflow new", "my-new-workflow/foo"])
      .catch((error) => expect(error.message).to.match(/^Invalid workflow key/))
      .it("throws an error");
  });

  describe("given a workflow key for an existing directory", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command(["workflow new", "b"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot overwrite an existing path/),
      )
      .it("throws an error");
  });

  describe("given an invalid steps flag, with a nonexistent step tag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["workflow new", "my-new-workflow", "--steps", "blah"])
      .catch((error) => expect(error.message).to.match(/^Invalid steps `blah`/))
      .it("throws an error");
  });

  describe("given a valid workflow key and a steps flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "workflow new",
        "my-new-workflow",
        "--steps",
        "email,in-app,push,sms,chat,delay,fetch,batch",
      ])
      .it(
        "generates a new workflow dir with a scaffolded workflow.json",
        () => {
          const exists = fs.pathExistsSync(
            path.resolve(sandboxDir, "a", "my-new-workflow", "workflow.json"),
          );

          expect(exists).to.equal(true);
        },
      );
  });
});
