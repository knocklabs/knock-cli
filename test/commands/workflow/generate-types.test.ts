import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/workflow/generate-types", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no output-file flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["workflow generate-types"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given an unsupported file extension", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .command(["workflow generate-types", "--output-file", "types.txt"])
      .catch(
        "Unsupported file extension: txt. We currently support .ts, .rb, .go, .py files only.",
      )
      .it("throws an error for unsupported file extension");
  });

  describe("given workflows without trigger data schema", () => {
    const workflowsWithoutSchema = [
      factory.workflow({
        key: "simple-workflow",
        name: "Simple Workflow",
        // No trigger_data_json_schema
      }),
    ];

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: workflowsWithoutSchema,
            },
          }),
        ),
      )
      .stdout()
      .command(["workflow generate-types", "--output-file", "types.ts"])
      .it("handles workflows without valid trigger data schema", (ctx) => {
        expect(ctx.stdout).to.contain(
          "No workflows with valid trigger data JSON schema found, skipping type generation",
        );
      });
  });

  describe("given environment flag", () => {
    const workflows = [
      factory.workflow({
        key: "prod-workflow",
        trigger_data_json_schema: {
          type: "object",
          properties: { id: { type: "string" } },
        },
      }),
    ];

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: workflows,
            },
          }),
        ),
      )
      .stub(fs, "writeFile", (stub) => stub.resolves())
      .stdout()
      .command([
        "workflow generate-types",
        "--output-file",
        "types.ts",
        "--environment",
        "production",
      ])
      .it("calls apiV1 listWorkflows with correct environment", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listWorkflows as any,
          sinon.match(({ flags }) => {
            const expectedFlags = {
              "service-token": "valid-token",
              environment: "production",
              annotate: true,
              limit: 100,
            };

            // Check all expected flags exist and match
            for (const [key, value] of Object.entries(expectedFlags)) {
              if (flags[key] !== value) {
                return false;
              }
            }

            // Check output-file has the expected structure
            if (
              !flags["output-file"] ||
              typeof flags["output-file"].abspath !== "string" ||
              typeof flags["output-file"].exists !== "boolean"
            ) {
              return false;
            }

            return true;
          }),
        );
      });
  });

  describe("given API error response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
        stub.resolves(
          factory.resp({
            status: 403,
            statusText: "Forbidden",
            data: {
              code: "access_denied",
              message: "You don't have permission to access this resource",
              status: 403,
              type: "api_error",
            },
          }),
        ),
      )
      .command(["workflow generate-types", "--output-file", "types.ts"])
      .catch("You don't have permission to access this resource")
      .it("throws an error for API errors");
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
        .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
          stub.resolves(
            factory.resp({
              data: {
                page_info: factory.pageInfo(),
                entries: [
                  factory.workflow({
                    trigger_data_json_schema: {
                      type: "object",
                      properties: { test: { type: "string" } },
                    },
                  }),
                ],
              },
            }),
          ),
        )
        .stub(fs, "writeFile", (stub) => stub.resolves())
        .stdout()
        .command([
          "workflow generate-types",
          "--output-file",
          `types.${extension}`,
        ])
        .it(
          `accepts .${extension} extension for ${expectedOutput} language`,
          (ctx) => {
            // Verify file write was called (indicating the type generator worked)
            sinon.assert.calledOnce(fs.writeFile as any);

            // Verify success message is displayed
            expect(ctx.stdout).to.contain("Successfully generated types for");
          },
        );
    });
  });

  describe("will generate types for complex schema", () => {
    const workflowWithComplexSchema = factory.workflow({
      key: "complex-workflow",
      name: "Complex Workflow",
      trigger_data_json_schema: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string", format: "email" },
              age: { type: "number", minimum: 0 },
            },
            required: ["id", "email"],
          },
          metadata: {
            type: "object",
            additionalProperties: true,
          },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["user"],
      },
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [workflowWithComplexSchema],
            },
          }),
        ),
      )
      .stub(fs, "writeFile", (stub) => stub.resolves())
      .stdout()
      .command(["workflow generate-types", "--output-file", "types.ts"])
      .it("generates types for complex schema", (ctx) => {
        // Verify the file was written
        sinon.assert.calledOnce(fs.writeFile as any);

        // Get the content that was written
        const writeFileCall = (fs.writeFile as any).getCall(0);
        const writtenContent = writeFileCall.args[1];

        // Verify it contains expected TypeScript interface content
        expect(writtenContent).to.be.a("string");
        expect(writtenContent).to.contain("ComplexWorkflowData");

        // Verify success message
        expect(ctx.stdout).to.contain(
          "Successfully generated types for 1 workflow(s)",
        );
      });
  });
});
