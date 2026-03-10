import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import AudienceValidate from "@/commands/audience/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import {
  AUDIENCE_JSON,
  AudienceData,
  AudienceType,
} from "@/lib/marshal/audience";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const audienceJsonFile = "default/audience.json";

const mockAudienceData: AudienceData<WithAnnotation> = {
  key: "default",
  name: "Default",
  type: AudienceType.Static,
  description: "This is a default audience",
  environment: "development",
  updated_at: "2023-09-29T19:08:04.129228Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {},
    readonly_fields: ["environment", "key", "created_at", "updated_at", "sha"],
  },
};

const setupWithStub = (audienceData = mockAudienceData) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(AudienceValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertAudience", (stub) =>
      stub.resolves({ audience: audienceData }),
    );

const currCwd = process.cwd();

describe("commands/audience/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given an audience directory exists, for the audience key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, audienceJsonFile);
      fs.outputJsonSync(abspath, { name: "Default", type: "static" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience push", "default"])
      .it("calls apiV1 upsertAudience with expected props", () => {
        const upsertStub = KnockApiV1.prototype.upsertAudience as sinon.SinonStub;
        sinon.assert.calledWith(
          upsertStub,
          "default",
          sinon.match({
            environment: "development",
            annotate: true,
            audience: sinon.match({
              name: "Default",
              type: "static",
            }),
          }),
        );
      });

    setupWithStub()
      .stdout()
      .command([
        "audience push",
        "default",
        "--commit",
        "-m",
        "this is a commit comment!",
      ])
      .it("calls apiV1 upsertAudience with commit flags, if provided", () => {
        const upsertStub = KnockApiV1.prototype.upsertAudience as sinon.SinonStub;
        sinon.assert.calledWith(
          upsertStub,
          "default",
          sinon.match({
            environment: "development",
            commit: true,
            commit_message: "this is a commit comment!",
            annotate: true,
            audience: sinon.match({
              name: "Default",
              type: "static",
            }),
          }),
        );
      });

    describe("given a branch flag", () => {
      setupWithStub()
        .stdout()
        .command([
          "audience push",
          "default",
          "--branch",
          "my-feature-branch-123",
        ])
        .it("calls apiV1 upsertAudience with expected params", () => {
          const upsertStub = KnockApiV1.prototype.upsertAudience as sinon.SinonStub;
          sinon.assert.calledWith(
            upsertStub,
            "default",
            sinon.match({
              environment: "development",
              branch: "my-feature-branch-123",
              annotate: true,
              audience: sinon.match({
                name: "Default",
                type: "static",
              }),
            }),
          );
        });
    });

    setupWithStub()
      .stdout()
      .command(["audience push", "default"])
      .it("writes the upserted audience data into audience.json", () => {
        const abspath = path.resolve(sandboxDir, audienceJsonFile);
        const audienceJson = fs.readJsonSync(abspath);

        expect(audienceJson).to.eql({
          $schema: "https://schemas.knock.app/cli/audience.json",
          name: "Default",
          type: "static",
          description: "This is a default audience",
          __readonly: {
            key: "default",
            environment: "development",
            created_at: "2023-09-18T18:32:18.398053Z",
          },
        });
      });
  });

  describe("given an audience.json file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, audienceJsonFile);
      fs.outputFileSync(abspath, '{"name":"default",}');

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience push", "default"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a nonexistent audience directory, for the audience key", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience push", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate an audience directory/),
      )
      .it("throws an error");
  });

  describe("given no audience key arg or --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["audience push"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given both audience key arg and --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["audience push", "default", "--all"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given --all and a nonexistent audiences index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience push", "--all", "--audiences-dir", "audiences"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate audience directories in/),
      )
      .it("throws an error");
  });

  describe("given --all and an audiences index directory, without any audiences", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "audiences");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience push", "--all", "--audiences-dir", "audiences"])
      .catch((error) =>
        expect(error.message).to.match(/No audience directories found in/),
      )
      .it("throws an error");
  });

  describe("given --all and an audiences index directory with 2 audiences", () => {
    const indexDirPath = path.resolve(sandboxDir, "audiences");

    beforeEach(() => {
      const vipAudienceJson = path.resolve(
        indexDirPath,
        "vip-users",
        AUDIENCE_JSON,
      );
      fs.outputJsonSync(vipAudienceJson, { name: "VIP Users", type: "static" });

      const betaAudienceJson = path.resolve(
        indexDirPath,
        "beta-testers",
        AUDIENCE_JSON,
      );
      fs.outputJsonSync(betaAudienceJson, {
        name: "Beta Testers",
        type: "dynamic",
      });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience push", "--all", "--audiences-dir", "audiences"])
      .it("calls apiV1 upsertAudience with expected props twice", () => {
        // Validate all first
        const validateStub = AudienceValidate.validateAll as sinon.SinonStub;
        sinon.assert.calledOnce(validateStub);

        const upsertStub = KnockApiV1.prototype.upsertAudience as sinon.SinonStub;
        sinon.assert.calledTwice(upsertStub);
      });
  });
});
