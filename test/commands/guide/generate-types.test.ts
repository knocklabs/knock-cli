import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/guide/generate-types", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no output-file flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["guide generate-types"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given an unsupported file extension", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .command(["guide generate-types", "--output-file", "types.txt"])
      .catch(
        "Unsupported file extension: .txt. We currently support .ts, .py, .go, .rb files only.",
      )
      .it("throws an error for unsupported file extension");
  });

  describe("given guides without content schema", () => {
    const guidesWithoutSchema = [
      factory.guide({
        key: "simple-guide",
        name: "Simple Guide",
        type: undefined,
        steps: [],
      }),
    ];

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listGuides", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: guidesWithoutSchema,
            },
          }),
        ),
      )
      .stdout()
      .command(["guide generate-types", "--output-file", "types.ts"])
      .it("handles guides without valid content schema", (ctx) => {
        expect(ctx.stdout).to.contain(
          "No guides with content JSON schema found, skipping type generation",
        );
      });
  });

  describe("given environment flag", () => {
    const guides = [
      factory.guide({
        key: "prod-guide",
        type: "banner",
        steps: [
          {
            ref: "step_1",
            name: "Production Step",
            schema_key: "banner",
            schema_semver: "0.0.1",
            schema_variant_key: "default",
            json_schema: {
              type: "object",
              properties: { title: { type: "string" } },
            },
            values: { title: "foo" },
          },
        ],
      }),
    ];

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listGuides", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: guides,
            },
          }),
        ),
      )
      .stub(fs, "outputFile", (stub) => stub.resolves())
      .stub(fs, "appendFile", (stub) => stub.resolves())
      .stdout()
      .command([
        "guide generate-types",
        "--output-file",
        "types.ts",
        "--environment",
        "production",
      ])
      .it("calls apiV1 listGuides with correct environment", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listGuides as any,
          sinon.match(({ flags }) => {
            const expectedFlags = {
              "service-token": "valid-token",
              environment: "production",
              limit: 100,
            };

            // Check all expected flags exist and match
            for (const [key, value] of Object.entries(expectedFlags)) {
              if (flags[key] !== value) {
                return false;
              }
            }

            return true;
          }),
        );
      });
  });

  describe("given a branch flag", () => {
    const guides = [
      factory.guide({
        key: "branch-guide",
        type: "banner",
        steps: [
          {
            ref: "step_1",
            name: "Branch Step",
            schema_key: "banner",
            schema_semver: "0.0.1",
            schema_variant_key: "default",
            json_schema: {
              type: "object",
              properties: { title: { type: "string" } },
            },
            values: { title: "foo" },
          },
        ],
      }),
    ];

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listGuides", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: guides,
            },
          }),
        ),
      )
      .stub(fs, "outputFile", (stub) => stub.resolves())
      .stub(fs, "appendFile", (stub) => stub.resolves())
      .stdout()
      .command([
        "guide generate-types",
        "--output-file",
        "types.ts",
        "--branch",
        "my-feature-branch-123",
      ])
      .it("calls apiV1 listGuides with expected params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listGuides as any,
          sinon.match(({ flags }) => {
            const expectedFlags = {
              "service-token": "valid-token",
              environment: "development",
              branch: "my-feature-branch-123",
              limit: 100,
              "include-json-schema": true,
            };

            // Check all expected flags exist and match
            for (const [key, value] of Object.entries(expectedFlags)) {
              if (flags[key] !== value) {
                return false;
              }
            }

            return true;
          }),
        );
      });
  });

  describe("will generate types for each supported language", () => {
    const testCases = [
      { extension: "ts", expectedOutput: "typescript" },
      { extension: "py", expectedOutput: "python" },
      { extension: "go", expectedOutput: "go" },
      { extension: "rb", expectedOutput: "ruby" },
    ];

    // eslint-disable-next-line unicorn/no-array-for-each
    testCases.forEach(({ extension, expectedOutput }) => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "whoami", (stub) =>
          stub.resolves(factory.resp({ data: whoami })),
        )
        .stub(KnockApiV1.prototype, "listGuides", (stub) =>
          stub.resolves(
            factory.resp({
              data: {
                page_info: factory.pageInfo(),
                entries: [
                  factory.guide({
                    type: "banner",
                    steps: [
                      {
                        ref: "step_1",
                        name: "Test Step",
                        schema_key: "banner",
                        schema_semver: "0.0.1",
                        schema_variant_key: "default",
                        json_schema: {
                          type: "object",
                          properties: { body: { type: "string" } },
                        },
                        values: { body: "foo" },
                      },
                    ],
                  }),
                ],
              },
            }),
          ),
        )
        .stub(fs, "outputFile", (stub) => stub.resolves())
        .stub(fs, "appendFile", (stub) => stub.resolves())
        .stdout()
        .command([
          "guide generate-types",
          "--output-file",
          `types.${extension}`,
        ])
        .it(
          `accepts .${extension} extension for ${expectedOutput} language`,
          (ctx) => {
            // Verify file write was called (indicating the type generator worked)
            sinon.assert.calledOnce(fs.outputFile as any);

            // Verify success message is displayed
            expect(ctx.stdout).to.contain("Successfully generated types for");
          },
        );
    });
  });

  describe("will generate types for complex schema", () => {
    const guideWithComplexSchema = factory.guide({
      key: "complex-guide",
      name: "Complex Guide",
      type: "banner",
      steps: [
        {
          ref: "step_1",
          name: "Complex Step",
          schema_key: "banner",
          schema_semver: "0.0.1",
          schema_variant_key: "default",
          json_schema: {
            additionalProperties: false,
            properties: {
              body: {
                title: "Body",
                type: "string",
              },
              dismissible: {
                default: true,
                title: "Dismissible?",
                type: "boolean",
              },
              title: {
                title: "Title",
                type: "string",
              },
            },
            required: ["title", "body"],
            title: "banner",
            type: "object",
          },
          values: {
            title: "Hello",
            body: "Hello world!",
            dismissible: true,
          },
        },
      ],
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listGuides", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [guideWithComplexSchema],
            },
          }),
        ),
      )
      .stub(fs, "outputFile", (stub) => stub.resolves())
      .stub(fs, "appendFile", (stub) => stub.resolves())
      .stdout()
      .command(["guide generate-types", "--output-file", "types.ts"])
      .it("generates types for complex schema", (ctx) => {
        // Verify the file was written
        sinon.assert.calledOnce(fs.outputFile as any);

        // Get the content that was written
        const outputFileCall = (fs.outputFile as any).getCall(0);
        const writtenContent = outputFileCall.args[1];

        // Verify it contains expected TypeScript interface content
        expect(writtenContent).to.be.a("string");
        expect(writtenContent).to.contain(
          "GuideComplexGuideStep1Banner001Default",
        );

        // Verify success message
        expect(ctx.stdout).to.contain(
          "Successfully generated types for 1 message type(s)",
        );
      });
  });

  describe("will handle TypeScript mappings correctly", () => {
    const guides = [
      factory.guide({
        key: "onboarding-guide",
        type: "banner",
        steps: [
          {
            ref: "step_1",
            name: "Onboarding Step",
            schema_key: "banner",
            schema_semver: "0.0.1",
            schema_variant_key: "default",
            json_schema: {
              type: "object",
              properties: { title: { type: "string" } },
            },
            values: { title: "hello" },
          },
        ],
      }),
      factory.guide({
        key: "feature-guide",
        type: "banner",
        steps: [
          {
            ref: "step_1",
            name: "Feature Step",
            schema_key: "banner",
            schema_semver: "0.0.1",
            schema_variant_key: "primary",
            json_schema: {
              type: "object",
              properties: { content: { type: "string" } },
            },
            values: { content: "hello again" },
          },
        ],
      }),
    ];

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listGuides", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: guides,
            },
          }),
        ),
      )
      .stub(fs, "outputFile", (stub) => stub.resolves())
      .stub(fs, "appendFile", (stub) => stub.resolves())
      .stdout()
      .command(["guide generate-types", "--output-file", "types.ts"])
      .it("generates correct TypeScript mappings", () => {
        // Verify appendFile was called with correct mappings
        sinon.assert.calledOnce(fs.appendFile as any);
        const appendFileCall = (fs.appendFile as any).getCall(0);
        const appendedContent = appendFileCall.args[1];

        // Check mapping by key
        expect(appendedContent).to.contain(
          '"onboarding-guide": GuideOnboardingGuideStep1Banner001Default',
        );
        expect(appendedContent).to.contain(
          '"feature-guide": GuideFeatureGuideStep1Banner001Primary',
        );

        // Check mapping by type
        expect(appendedContent).to.contain(
          '"banner": GuideOnboardingGuideStep1Banner001Default | GuideFeatureGuideStep1Banner001Primary',
        );

        // Check the root mapping
        expect(appendedContent).to.contain("export type GuideContentIndex");
      });
  });

  describe("will handle guides with no type", () => {
    const guides = [
      factory.guide({
        key: "guide-without-type",
        type: undefined,
        steps: [],
      }),
    ];

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listGuides", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: guides,
            },
          }),
        ),
      )
      .stdout()
      .command(["guide generate-types", "--output-file", "types.ts"])
      .it("skips guides without type", (ctx) => {
        expect(ctx.stdout).to.contain(
          "No guides with content JSON schema found, skipping type generation",
        );
      });
  });
});
