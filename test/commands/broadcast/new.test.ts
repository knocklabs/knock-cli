import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { BROADCAST_JSON } from "@/lib/marshal/broadcast";

const currCwd = process.cwd();

describe("commands/broadcast/new", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given name and key flags with --force", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command([
        "broadcast new",
        "--name",
        "My New Broadcast",
        "--key",
        "my-new-broadcast",
        "--force",
      ])
      .it("creates a broadcast directory with broadcast.json", () => {
        const broadcastPath = path.resolve(
          sandboxDir,
          "my-new-broadcast",
          BROADCAST_JSON,
        );
        expect(fs.pathExistsSync(broadcastPath)).to.equal(true);

        const content = fs.readJsonSync(broadcastPath);
        expect(content.key).to.equal("my-new-broadcast");
        expect(content.name).to.equal("");
        expect(content.status).to.equal("draft");
        expect(content.steps).to.eql([]);
      });
  });

  describe("given an invalid broadcast key, with uppercase chars", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([
        "broadcast new",
        "--name",
        "My New Broadcast",
        "--key",
        "My-New-Broadcast",
        "--force",
      ])
      .catch((error) =>
        expect(error.message).to.match(/^Invalid broadcast key/),
      )
      .it("throws an error");
  });

  describe("if invoked inside another broadcast directory", () => {
    beforeEach(() => {
      const broadcastDir = path.resolve(sandboxDir, "existing-broadcast");
      fs.ensureDirSync(broadcastDir);
      fs.outputJsonSync(path.resolve(broadcastDir, BROADCAST_JSON), {
        key: "existing-broadcast",
        name: "Existing",
        steps: [],
      });
      process.chdir(broadcastDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([
        "broadcast new",
        "--name",
        "My New Broadcast",
        "--key",
        "my-new-broadcast",
        "--force",
      ])
      .catch(
        "Cannot create a new broadcast inside an existing broadcast directory",
      )
      .it("throws an error");
  });

  describe("given a broadcast key for an existing directory with --force", () => {
    beforeEach(() => {
      const broadcastDir = path.resolve(sandboxDir, "my-broadcast");
      fs.ensureDirSync(broadcastDir);
      fs.outputJsonSync(path.resolve(broadcastDir, BROADCAST_JSON), {
        key: "my-broadcast",
        name: "Existing Broadcast",
        steps: [],
      });
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command([
        "broadcast new",
        "--name",
        "Overwrite",
        "--key",
        "my-broadcast",
        "--force",
      ])
      .it("overwrites the existing broadcast directory", () => {
        const content = fs.readJsonSync(
          path.resolve(sandboxDir, "my-broadcast", BROADCAST_JSON),
        );
        expect(content.key).to.equal("my-broadcast");
      });
  });
});
