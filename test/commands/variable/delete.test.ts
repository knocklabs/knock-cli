import { expect, test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/variable/delete", () => {
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "deleteVariable", (stub) =>
      stub.resolves(factory.resp({ status: 204, data: undefined })),
    )
    .stdout()
    .command(["variable delete", "app_name", "--force"])
    .it("deletes the variable", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.deleteVariable as sinon.SinonStub,
        "app_name",
      );
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "deleteVariable", (stub) =>
      stub.resolves(factory.resp({ status: 204 })),
    )
    .stdout()
    .command([
      "variable delete",
      "app_name",
      "--environment",
      "production",
      "--force",
      "--json",
    ])
    .it("clears one override", (ctx) => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.deleteVariable as sinon.SinonStub,
        "app_name",
        "production",
      );
      expect(JSON.parse(ctx.stdout)).to.eql({
        key: "app_name",
        environment: "production",
        override_cleared: true,
      });
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .command([
      "variable delete",
      "app_name",
      "--branch",
      "feature-branch",
      "--force",
    ])
    .catch(/Variables are not branch-scoped/)
    .it("rejects --branch");
});
