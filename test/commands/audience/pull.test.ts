import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import {
  AUDIENCE_JSON,
  AudienceData,
  AudienceType,
} from "@/lib/marshal/audience";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const mockAudienceData: AudienceData<WithAnnotation> = {
  key: "vip-users",
  name: "VIP Users",
  type: AudienceType.Dynamic,
  description: "Premium subscription users",
  segments: [
    {
      conditions: [
        {
          property: "recipient.plan",
          operator: "equal_to",
          argument: "premium",
        },
      ],
    },
  ],
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
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.resolves({ input: true }),
    )
    .stub(KnockApiV1.prototype, "getAudience", (stub) =>
      stub.resolves(audienceData),
    );

const currCwd = process.cwd();

describe("commands/audience/pull (a single audience)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given an audience key arg", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience pull", "vip-users", "--force"])
      .it("calls apiV1 getAudience with expected props", () => {
        const getStub = KnockApiV1.prototype.getAudience as sinon.SinonStub;
        sinon.assert.calledWith(
          getStub,
          "vip-users",
          sinon.match({
            environment: "development",
            annotate: true,
          }),
        );
      });

    setupWithStub()
      .stdout()
      .command(["audience pull", "vip-users", "--force"])
      .it("creates the audience directory with audience.json", () => {
        const audienceJsonPath = path.resolve(
          sandboxDir,
          "vip-users",
          AUDIENCE_JSON,
        );
        expect(fs.existsSync(audienceJsonPath)).to.be.true;

        const audienceJson = fs.readJsonSync(audienceJsonPath);
        expect(audienceJson.name).to.equal("VIP Users");
        expect(audienceJson.type).to.equal("dynamic");
      });

    describe("given a branch flag", () => {
      setupWithStub()
        .stdout()
        .command([
          "audience pull",
          "vip-users",
          "--force",
          "--branch",
          "my-feature-branch-123",
        ])
        .it("calls apiV1 getAudience with expected params", () => {
          const getStub = KnockApiV1.prototype.getAudience as sinon.SinonStub;
          sinon.assert.calledWith(
            getStub,
            "vip-users",
            sinon.match({
              environment: "development",
              branch: "my-feature-branch-123",
              annotate: true,
            }),
          );
        });
    });
  });

  describe("given no audience key arg and not in an audience directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience pull", "--force"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given both audience key arg and --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["audience pull", "vip-users", "--all"])
      .exit(2)
      .it("exits with status 2");
  });
});

describe("commands/audience/pull (all audiences)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given --all flag with audiences-dir", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: true }),
      )
      .stub(KnockApiV1.prototype, "listAllAudiences", (stub) =>
        stub.resolves([mockAudienceData]),
      )
      .stdout()
      .command([
        "audience pull",
        "--all",
        "--audiences-dir",
        "audiences",
        "--force",
      ])
      .it("calls apiV1 listAudiences and creates audience directories", () => {
        const listStub = KnockApiV1.prototype.listAllAudiences as sinon.SinonStub;
        sinon.assert.calledOnce(listStub);

        const audienceJsonPath = path.resolve(
          sandboxDir,
          "audiences",
          "vip-users",
          AUDIENCE_JSON,
        );
        expect(fs.existsSync(audienceJsonPath)).to.be.true;
      });
  });
});
