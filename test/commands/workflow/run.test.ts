import { test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "runWorkflow", (stub) =>
      stub.resolves(factory.resp(attrs)),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

describe("commands/workflow/run", () => {
  describe("given no workflow key arg", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command(["workflow run"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no recipients flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command(["workflow run", "workflow-x"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given the workflow key arg, the environment flag and the recipient flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "workflow-x",
        "--environment",
        "staging",
        "--recipient",
        "user1",
      ])
      .it(
        "calls apiV1 runWorkflow with expected props (recipient as a string)",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.runWorkflow as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, {
                  workflowKey: "workflow-x",
                }) &&
                isEqual(flags, {
                  "service-token": "valid-token",

                  environment: "staging",
                  recipients: ["user1"],
                }),
            ),
          );
        },
      );
  });

  describe("given the workflow key arg, the environment flag and the recipient flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "workflow-x",
        "--environment",
        "staging",
        "--recipient",
        "alice,barry",
      ])
      .it(
        "calls apiV1 runWorkflow with expected props (recipient as a list of string)",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.runWorkflow as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, {
                  workflowKey: "workflow-x",
                }) &&
                isEqual(flags, {
                  "service-token": "valid-token",

                  environment: "staging",
                  recipients: ["alice", "barry"],
                }),
            ),
          );
        },
      );
  });

  describe("given the workflow key arg, the environment flag and the recipient flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "workflow-x",
        "--environment",
        "staging",
        "--recipient",
        '{"id": "user1"}',
      ])
      .it(
        "calls apiV1 runWorkflow with expected props (recipient as a JSON",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.runWorkflow as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, {
                  workflowKey: "workflow-x",
                }) &&
                isEqual(flags, {
                  "service-token": "valid-token",

                  environment: "staging",
                  recipients: [{ id: "user1" }],
                }),
            ),
          );
        },
      );
  });

  describe("given the workflow key arg, the environment flag and the recipient flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "workflow-x",
        "--environment",
        "staging",
        "--recipient",
        '[{"id": "alice"}, {"id": "object-1", "collection": "project-1"}]',
      ])
      .it(
        "calls apiV1 runWorkflow with expected props (recipient as a list of JSON)",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.runWorkflow as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, {
                  workflowKey: "workflow-x",
                }) &&
                isEqual(flags, {
                  "service-token": "valid-token",

                  environment: "staging",
                  recipients: [
                    {
                      id: "alice",
                    },
                    {
                      id: "object-1",
                      collection: "project-1",
                    },
                  ],
                }),
            ),
          );
        },
      );
  });

  describe("given the workflow key arg, the environment flag and the recipients flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "workflow-x",
        "--environment",
        "staging",
        "--recipient",
        '["alice",{"id": "object-1", "collection": "projects"}, {"id": "bruce"}]',
      ])
      .it(
        "calls apiV1 runWorkflow with expected props, (recipient as a list containing JSON + ID's)",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.runWorkflow as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, {
                  workflowKey: "workflow-x",
                }) &&
                isEqual(flags, {
                  "service-token": "valid-token",

                  environment: "staging",
                  recipients: [
                    "alice",
                    { id: "object-1", collection: "projects" },
                    { id: "bruce" },
                  ],
                }),
            ),
          );
        },
      );
  });

  describe("given the workflow key arg, the environment flag and the recipients flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "workflow-x",
        "--environment",
        "staging",
        "--recipient",
        "alice",
        "--actor",
        "bruce",
      ])
      .it(
        "calls apiV1 runWorkflow with expected props, (actor as a string)",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.runWorkflow as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, {
                  workflowKey: "workflow-x",
                }) &&
                isEqual(flags, {
                  "service-token": "valid-token",

                  environment: "staging",
                  recipients: ["alice"],
                  actor: "bruce",
                }),
            ),
          );
        },
      );
  });

  describe("given the workflow key arg, the environment flag and the recipients flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow run",
        "workflow-x",
        "--environment",
        "staging",
        "--recipient",
        "alice",
        "--actor",
        '{"id": "object-1", "collection": "projects"}',
      ])
      .it(
        "calls apiV1 runWorkflow with expected props, (actor as a JSON)",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.runWorkflow as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, {
                  workflowKey: "workflow-x",
                }) &&
                isEqual(flags, {
                  "service-token": "valid-token",

                  environment: "staging",
                  recipients: ["alice"],
                  actor: { id: "object-1", collection: "projects" },
                }),
            ),
          );
        },
      );
  });
});
