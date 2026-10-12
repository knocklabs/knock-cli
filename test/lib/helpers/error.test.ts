import KnockMgmt from "@knocklabs/mgmt";
import { expect } from "chai";

import { ApiError, isSoftFailableBulkError } from "@/lib/helpers/error";

describe("lib/helpers/error", () => {
  describe("isSoftFailableBulkError", () => {
    it("soft-fails auth and permission denials", () => {
      expect(
        isSoftFailableBulkError(
          new KnockMgmt.AuthenticationError(
            401,
            { message: "Unauthorized" },
            undefined,
            new Headers(),
          ),
        ),
      ).to.equal(true);

      expect(
        isSoftFailableBulkError(
          new KnockMgmt.PermissionDeniedError(
            403,
            { message: "Forbidden" },
            undefined,
            new Headers(),
          ),
        ),
      ).to.equal(true);
    });

    it("soft-fails 422 feature-gate messages", () => {
      expect(
        isSoftFailableBulkError(
          new KnockMgmt.UnprocessableEntityError(
            422,
            { message: "Goals are not enabled for your account" },
            undefined,
            new Headers(),
          ),
        ),
      ).to.equal(true);

      expect(
        isSoftFailableBulkError(
          new ApiError("Goals feature is not enabled (status: 422)", 422),
        ),
      ).to.equal(true);
    });

    it("does not soft-fail ordinary validation 422s", () => {
      expect(
        isSoftFailableBulkError(
          new KnockMgmt.UnprocessableEntityError(
            422,
            { message: "condition.event.event_key is required" },
            undefined,
            new Headers(),
          ),
        ),
      ).to.equal(false);
    });

    it("does not soft-fail plain ExitErrors or messages without status", () => {
      expect(
        isSoftFailableBulkError(new Error("No goal directories found")),
      ).to.equal(false);
      expect(isSoftFailableBulkError(new ApiError("schema invalid"))).to.equal(
        false,
      );
    });
  });
});
