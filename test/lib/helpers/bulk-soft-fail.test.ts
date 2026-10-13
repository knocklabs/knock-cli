import { ux } from "@oclif/core";
import { expect } from "chai";
import * as sinon from "sinon";

import { runBulkResourceCommand } from "@/lib/helpers/bulk-soft-fail";
import { ApiError } from "@/lib/helpers/error";

describe("lib/helpers/bulk-soft-fail", () => {
  let exitCodeBefore: number | undefined;
  let warnStub: sinon.SinonStub;

  beforeEach(() => {
    exitCodeBefore = process.exitCode;
    process.exitCode = undefined;
    warnStub = sinon.stub(ux, "warn");
  });

  afterEach(() => {
    process.exitCode = exitCodeBefore;
    warnStub.restore();
  });

  it("clears the exit code oclif sets before a soft-skipped error", async () => {
    await runBulkResourceCommand("goal", async () => {
      process.exitCode = process.exitCode ?? 1;
      throw new ApiError(
        "Goals are not enabled for your account (status: 422)",
        422,
      );
    });

    expect(process.exitCode).to.equal(undefined);
    expect(warnStub.calledOnce).to.equal(true);
    expect(warnStub.firstCall.args[0]).to.match(/Skipping goals/);
  });

  it("keeps an exit code that was already set before the nested command", async () => {
    process.exitCode = 2;

    await runBulkResourceCommand("goal", async () => {
      process.exitCode = process.exitCode ?? 1;
      throw new ApiError(
        "Goals are not enabled for your account (status: 422)",
        422,
      );
    });

    expect(process.exitCode).to.equal(2);
  });

  it("rethrows validation failures and leaves the exit code set", async () => {
    const validationError = new ApiError(
      "event_key is unavailable (status: 422)",
      422,
    );

    try {
      await runBulkResourceCommand("goal", async () => {
        process.exitCode = 1;
        throw validationError;
      });
      expect.fail("expected validation error to propagate");
    } catch (error_) {
      expect(error_).to.equal(validationError);
      expect(process.exitCode).to.equal(1);
      expect(warnStub.called).to.equal(false);
    }
  });

  it("does not swallow errors for resources that are not soft-failable", async () => {
    const workflowError = new ApiError(
      "Workflows are not enabled for your account",
      422,
    );

    try {
      await runBulkResourceCommand("workflow", async () => {
        process.exitCode = 1;
        throw workflowError;
      });
      expect.fail("expected workflow error to propagate");
    } catch (error_) {
      expect(error_).to.equal(workflowError);
      expect(process.exitCode).to.equal(1);
    }
  });
});
