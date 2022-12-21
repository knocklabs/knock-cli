import { expect } from "@oclif/test";

import { formatDate } from "@/lib/helpers/date-helpers";

describe("date-helpers", () => {
  describe("formatDate", () => {
    describe("given a iso 8601 datetime string", () => {
      it("returns a human readable date string in MMM d, yyyy format", () => {
        const result = formatDate("2022-11-14T21:02:23.117949Z")

        expect(result).to.equal("Nov 14, 2022");
      });
    });
  });
})
