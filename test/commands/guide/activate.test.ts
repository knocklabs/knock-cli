import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "activateGuide", (stub) =>
      stub.resolves(factory.resp(attrs)),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

describe("commands/guide/activate", () => {
  describe("given no guide key arg", () => {
    setupWithStub({ data: { guide: factory.guide() } })
      .stdout()
      .command(["guide activate"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no environment flag", () => {
    setupWithStub({ data: { guide: factory.guide() } })
      .stdout()
      .command(["guide activate", "guide-x"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given the guide key arg and the environment flag with status true", () => {
    setupWithStub({ data: { guide: factory.guide() } })
      .stdout()
      .command([
        "guide activate",
        "guide-x",
        "--environment",
        "staging",
        "--status",
        "true",
      ])
      .it("calls apiV1 activateGuide with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.activateGuide as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                guideKey: "guide-x",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "staging",
                status: true,
              }),
          ),
        );
      });
  });

  describe("given the status flag set to false (for deactivating)", () => {
    setupWithStub({ data: { guide: factory.guide() } })
      .stdout()
      .command([
        "guide activate",
        "guide-x",
        "--environment",
        "staging",
        "--status",
        "false",
      ])
      .it("calls apiV1 activateGuide with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.activateGuide as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                guideKey: "guide-x",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "staging",
                status: false,
              }),
          ),
        );
      });
  });

  describe("given a guide key arg and from datetime", () => {
    setupWithStub({ data: { guide: factory.guide() } })
      .stdout()
      .command([
        "guide activate",
        "guide-x",
        "--environment",
        "development",
        "--from",
        "2024-01-15T10:30:00Z",
      ])
      .it("calls apiV1 activateGuide with from datetime", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.activateGuide as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                guideKey: "guide-x",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                from: "2024-01-15T10:30:00Z",
              }),
          ),
        );
      });
  });

  describe("given a guide key arg and until datetime", () => {
    setupWithStub({ data: { guide: factory.guide() } })
      .stdout()
      .command([
        "guide activate",
        "guide-x",
        "--environment",
        "development",
        "--until",
        "2024-01-15T18:30:00Z",
      ])
      .it("calls apiV1 activateGuide with until datetime", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.activateGuide as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                guideKey: "guide-x",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                until: "2024-01-15T18:30:00Z",
              }),
          ),
        );
      });
  });

  describe("given a guide key arg and both from/until datetimes", () => {
    setupWithStub({ data: { guide: factory.guide() } })
      .stdout()
      .command([
        "guide activate",
        "guide-x",
        "--environment",
        "development",
        "--from",
        "2024-01-15T10:30:00Z",
        "--until",
        "2024-01-15T18:30:00Z",
      ])
      .it(
        "calls apiV1 activateGuide with both from and until datetimes",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.activateGuide as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, {
                  guideKey: "guide-x",
                }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "development",
                  from: "2024-01-15T10:30:00Z",
                  until: "2024-01-15T18:30:00Z",
                }),
            ),
          );
        },
      );
  });

  describe("validation errors", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["guide activate", "guide-x", "--environment", "development"])
      .catch("Either --status or --from/--until must be provided")
      .it("throws error when no status or datetime flags provided");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command([
        "guide activate",
        "guide-x",
        "--environment",
        "development",
        "--status",
        "true",
        "--from",
        "2024-01-15T10:30:00Z",
      ])
      .catch((error) => {
        expect(error.message).to.match(
          /--from=2024-01-15T10:30:00Z cannot also be provided when using --status/,
        );
        expect(error.message).to.match(
          /--status=true cannot also be provided when using --from/,
        );
      })
      .it("throws error when status and from flags are used together");
  });
});
