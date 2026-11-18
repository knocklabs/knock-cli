import { PassThrough } from "node:stream";

import { expect, test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const feedback = {
  id: "2f9a3b8e-6d1c-4c55-9b6e-0a7f3f2d1c84",
  created_at: "2026-11-17T00:00:00Z",
};

const created = () => factory.resp({ status: 201, data: { feedback } }) as any;

const sentBody = () =>
  (KnockApiV1.prototype.createFeedback as sinon.SinonStub).firstCall.args[0];

const setStdin = (stream: PassThrough) =>
  Object.defineProperty(process, "stdin", {
    configurable: true,
    value: stream,
  });

describe("commands/feedback", () => {
  const originalStdin = process.stdin;

  afterEach(() => {
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: originalStdin,
    });
  });

  describe("given a note", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "createFeedback", (stub) =>
        stub.resolves(created()),
      )
      .stdout()
      .command(["feedback", "The error didn't explain the fix"])
      .it("sends the note with the CLI version", (ctx) => {
        const body = sentBody();
        expect(body.message).to.equal("The error didn't explain the fix");
        expect(body.context).to.have.keys("cli_version");
        expect(body.context.cli_version).to.be.a("string");
        expect(ctx.stdout).to.contain("Feedback sent");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "createFeedback", (stub) =>
        stub.resolves(created()),
      )
      .stdout()
      .command(["feedback", "Unclear", "--json"])
      .it("prints the feedback as json", (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql(feedback);
      });
  });

  describe("given --field options", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "createFeedback", (stub) =>
        stub.resolves(created()),
      )
      .stdout()
      .command([
        "feedback",
        "Unclear error",
        "--field",
        "type=bug",
        "--field",
        "actual=a=b",
        "--field",
        "type=friction",
        "--field",
        "cli_version=custom",
        "--field",
        "impact=",
      ])
      .it("sends the fields as context, last value winning", () => {
        expect(sentBody().context).to.eql({
          cli_version: "custom",
          type: "friction",
          actual: "a=b",
          impact: "",
        });
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "createFeedback", (stub) =>
        stub.resolves(created()),
      )
      .stdout()
      .command([
        "feedback",
        "--field",
        "note=From a field",
        "--field",
        "type=bug",
      ])
      .it("accepts the note as a field", () => {
        const body = sentBody();
        expect(body.message).to.equal("From a field");
        expect(body.context).to.not.have.key("note");
        expect(body.context.type).to.equal("bug");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["feedback", "A note", "--field", "note=Another"])
      .catch(/not both/)
      .it("rejects a note in both places");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["feedback", "A note", "--field", "type"])
      .catch(/Invalid --field "type"/)
      .it("rejects a field without =");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["feedback", "A note", "--field", "=bug"])
      .catch(/Invalid --field "=bug"/)
      .it("rejects a field without a key");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["feedback", "--field", "type=bug"])
      .catch(/The note is empty/)
      .it("requires a note alongside fields");
  });

  describe("given - as the note", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        const stream = new PassThrough();
        setStdin(stream);
        stream.end("Line one\nLine two\n");
      })
      .stub(KnockApiV1.prototype, "createFeedback", (stub) =>
        stub.resolves(created()),
      )
      .stdout()
      .command(["feedback", "-", "--field", "product=workflows"])
      .it("reads the whole note from stdin", () => {
        const body = sentBody();
        expect(body.message).to.equal("Line one\nLine two");
        expect(body.context.product).to.equal("workflows");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        const stream = new PassThrough();
        (stream as any).isTTY = true;
        setStdin(stream);
      })
      .command(["feedback", "-"])
      .catch(/No note on stdin/)
      .it("refuses to wait on a terminal");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        const stream = new PassThrough();
        setStdin(stream);
        stream.end("  \n");
      })
      .command(["feedback", "-"])
      .catch(/The note is empty/)
      .it("rejects a blank note");
  });

  describe("given no note or fields", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "createFeedback", (stub) =>
        stub.resolves(created()),
      )
      .stdout()
      .command(["feedback"])
      .it("shows help without sending feedback", (ctx) => {
        expect(ctx.stdout).to.contain("Send bugs, friction, and feature");
        expect(ctx.stdout).to.contain("--field");
        sinon.assert.notCalled(
          KnockApiV1.prototype.createFeedback as sinon.SinonStub,
        );
      });
  });

  describe("given an error response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "createFeedback", (stub) =>
        stub.resolves(
          factory.resp({
            status: 429,
            data: { code: "rate_limited", message: "Too many requests" },
          }) as any,
        ),
      )
      .stdout()
      .command(["feedback", "Too many"])
      .catch(/Too many requests/)
      .it("surfaces the error");
  });

  describe("given no service token", () => {
    test.command(["feedback", "A note"]).exit(2).it("exits with status 2");
  });
});
