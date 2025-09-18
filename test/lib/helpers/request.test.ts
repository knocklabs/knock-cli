import KnockMgmt from "@knocklabs/mgmt";
import { expect } from "chai";

import { formatMgmtError } from "@/lib/helpers/request";

describe("lib/helpers/request", () => {
  describe("formatMgmtError", () => {
    it("formats a 500 error", () => {
      const error = new KnockMgmt.APIError(500, {}, undefined, new Headers());
      const message = formatMgmtError(error);
      expect(message).to.equal("An internal server error occurred");
    });

    it("formats a 400 error", () => {
      const error = new KnockMgmt.APIError(
        400,
        {
          code: "bearer_token_invalid",
          message: "The bearer token supplied is invalid",
          status: 400,
          type: "authentication_error",
        },
        undefined,
        new Headers(),
      );

      const message = formatMgmtError(error);

      expect(message).to.equal(
        "The bearer token supplied is invalid (status: 400)",
      );
    });

    it("formats a 422 error with input errors", () => {
      const error = new KnockMgmt.APIError(
        422,
        {
          code: "invalid_params",
          errors: [
            {
              field: "slug",
              message: "An environment with this slug already exists",
              type: null,
            },
          ],
          message: "One or more parameters supplied were invalid",
          status: 422,
          type: "invalid_request_error",
        },
        undefined,
        new Headers(),
      );

      const message = formatMgmtError(error);

      expect(message).to.equal(
        `One or more parameters supplied were invalid (status: 422)\n\n` +
          `  JsonDataError: data at "slug" An environment with this slug already exists`,
      );
    });
  });
});
