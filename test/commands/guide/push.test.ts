import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import GuideValidate from "@/commands/guide/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { GUIDE_JSON, GuideData } from "@/lib/marshal/guide";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const guideJsonFile = "welcome-guide/guide.json";

const mockGuideData: GuideData<WithAnnotation> = {
  key: "welcome-guide",
  valid: true,
  active: true,
  name: "Welcome Guide",
  description: "A guide to help new users get started",
  channel_key: "in-app-guide",
  type: "banner",
  semver: "0.0.1",
  steps: [
    {
      ref: "step_1",
      name: "Welcome Step",
      schema_key: "banner",
      schema_semver: "0.0.1",
      schema_variant_key: "default",
      values: {},
    },
  ],
  updated_at: "2022-12-31T12:00:00.000000Z",
  created_at: "2022-12-31T12:00:00.000000Z",
  environment: "development",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {},
    readonly_fields: [
      "key",
      "valid",
      "active",
      "environment",
      "created_at",
      "updated_at",
      "sha",
    ],
  },
};

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(GuideValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertGuide", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/guide/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a guide directory exists, for the guide key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, guideJsonFile);
      fs.outputJsonSync(abspath, {
        name: "Welcome Guide",
        description: "A guide to help new users get started",
        channel_key: "in-app-guide",
        type: "banner",
        steps: [
          {
            ref: "step_1",
            name: "Welcome Step",
            schema_key: "banner",
            schema_variant_key: "default",
            fields: [],
          },
        ],
      });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { guide: mockGuideData } })
      .stdout()
      .command(["guide push", "welcome-guide"])
      .it("calls apiV1 upsertGuide with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertGuide as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { guideKey: "welcome-guide" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
              }),
          ),
          sinon.match((guide) =>
            isEqual(guide, {
              key: "welcome-guide",
              name: "Welcome Guide",
              description: "A guide to help new users get started",
              channel_key: "in-app-guide",
              type: "banner",
              steps: [
                {
                  ref: "step_1",
                  name: "Welcome Step",
                  schema_key: "banner",
                  schema_variant_key: "default",
                  fields: [],
                },
              ],
            }),
          ),
        );
      });

    setupWithStub({ data: { guide: mockGuideData } })
      .stdout()
      .command([
        "guide push",
        "welcome-guide",
        "--commit",
        "-m",
        "this is a commit comment!",
      ])
      .it("calls apiV1 upsertGuide with commit flags, if provided", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertGuide as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { guideKey: "welcome-guide" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                commit: true,
                "commit-message": "this is a commit comment!",
                annotate: true,
              }),
          ),
          sinon.match((guide) =>
            isEqual(guide, {
              key: "welcome-guide",
              name: "Welcome Guide",
              description: "A guide to help new users get started",
              channel_key: "in-app-guide",
              type: "banner",
              steps: [
                {
                  ref: "step_1",
                  name: "Welcome Step",
                  schema_key: "banner",
                  schema_variant_key: "default",
                  fields: [],
                },
              ],
            }),
          ),
        );
      });

    describe("given a branch flag", () => {
      setupWithStub({ data: { guide: mockGuideData } })
        .stdout()
        .command([
          "guide push",
          "welcome-guide",
          "--branch",
          "my-feature-branch-123",
        ])
        .it("calls apiV1 upsertGuide with expected params", () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.upsertGuide as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, { guideKey: "welcome-guide" }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "development",
                  branch: "my-feature-branch-123",
                  annotate: true,
                }),
            ),
            sinon.match((guide) =>
              isEqual(guide, {
                key: "welcome-guide",
                name: "Welcome Guide",
                description: "A guide to help new users get started",
                channel_key: "in-app-guide",
                type: "banner",
                steps: [
                  {
                    ref: "step_1",
                    name: "Welcome Step",
                    schema_key: "banner",
                    schema_variant_key: "default",
                    fields: [],
                  },
                ],
              }),
            ),
          );
        });
    });

    describe("given an environment flag", () => {
      setupWithStub({ data: { guide: mockGuideData } })
        .stdout()
        .command(["guide push", "welcome-guide", "--environment", "staging"])
        .it("calls apiV1 upsertGuide with the specified environment", () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.upsertGuide as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, { guideKey: "welcome-guide" }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "staging",
                  annotate: true,
                }),
            ),
            sinon.match((guide) =>
              isEqual(guide, {
                key: "welcome-guide",
                name: "Welcome Guide",
                description: "A guide to help new users get started",
                channel_key: "in-app-guide",
                type: "banner",
                steps: [
                  {
                    ref: "step_1",
                    name: "Welcome Step",
                    schema_key: "banner",
                    schema_variant_key: "default",
                    fields: [],
                  },
                ],
              }),
            ),
          );
        });
    });
  });

  describe("given a guide.json file with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, guideJsonFile);
      fs.outputFileSync(abspath, '{"name":"Welcome",}');

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { guide: mockGuideData } })
      .stdout()
      .command(["guide push", "welcome-guide"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a guide.json file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, guideJsonFile);
      fs.outputJsonSync(abspath, { name: 1242 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["guide push", "welcome-guide"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent guide directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { guide: mockGuideData } })
      .stdout()
      .command(["guide push", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate a guide directory/),
      )
      .it("throws an error");
  });

  describe("given no guide key arg or --all flag", () => {
    setupWithStub({ data: { guide: mockGuideData } })
      .stdout()
      .command(["guide push"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given both guide key arg and --all flag", () => {
    setupWithStub({ data: { guide: mockGuideData } })
      .stdout()
      .command(["guide push", "welcome-guide", "--all"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given --all and multiple guides", () => {
    const indexDirPath = path.resolve(sandboxDir, "guides");

    beforeEach(() => {
      const welcomeGuideJson = path.resolve(
        indexDirPath,
        "welcome-guide",
        GUIDE_JSON,
      );
      fs.outputJsonSync(welcomeGuideJson, {
        name: "Welcome Guide",
        description: "A guide to help new users get started",
        channel_key: "in-app-guide",
        type: "banner",
        steps: [
          {
            ref: "step_1",
            name: "Welcome Step",
            schema_key: "banner",
            schema_variant_key: "default",
            fields: [],
          },
        ],
      });

      const onboardingGuideJson = path.resolve(
        indexDirPath,
        "onboarding-guide",
        GUIDE_JSON,
      );
      fs.outputJsonSync(onboardingGuideJson, {
        name: "Onboarding Guide",
        description: "A comprehensive onboarding guide",
        channel_key: "in-app-guide",
        type: "tutorial",
        steps: [
          {
            ref: "step_1",
            name: "Introduction",
            schema_key: "tutorial",
            schema_variant_key: "default",
            fields: [],
          },
        ],
      });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { guide: mockGuideData } })
      .stdout()
      .command(["guide push", "--all", "--guides-dir", "guides"])
      .it("calls apiV1 upsertGuide with expected props twice", () => {
        // Validate all first
        const stub1 = GuideValidate.validateAll as any;
        sinon.assert.calledOnce(stub1);

        const stub2 = KnockApiV1.prototype.upsertGuide as any;
        sinon.assert.calledTwice(stub2);

        const expectedFlags = {
          annotate: true,
          "service-token": "valid-token",
          environment: "development",
          all: true,
          "guides-dir": {
            abspath: indexDirPath,
            exists: true,
          },
        };

        sinon.assert.calledWith(
          stub2.firstCall,
          sinon.match(({ flags }) => isEqual(flags, expectedFlags)),
          sinon.match((guide) =>
            isEqual(guide, {
              key: "onboarding-guide",
              name: "Onboarding Guide",
              description: "A comprehensive onboarding guide",
              channel_key: "in-app-guide",
              type: "tutorial",
              steps: [
                {
                  ref: "step_1",
                  name: "Introduction",
                  schema_key: "tutorial",
                  schema_variant_key: "default",
                  fields: [],
                },
              ],
            }),
          ),
        );

        sinon.assert.calledWith(
          stub2.secondCall,
          sinon.match(({ flags }) => isEqual(flags, expectedFlags)),
          sinon.match((guide) =>
            isEqual(guide, {
              key: "welcome-guide",
              name: "Welcome Guide",
              description: "A guide to help new users get started",
              channel_key: "in-app-guide",
              type: "banner",
              steps: [
                {
                  ref: "step_1",
                  name: "Welcome Step",
                  schema_key: "banner",
                  schema_variant_key: "default",
                  fields: [],
                },
              ],
            }),
          ),
        );
      });
  });
});
