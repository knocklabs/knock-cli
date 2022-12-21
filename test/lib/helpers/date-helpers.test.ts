import { expect } from "@oclif/test";

import { formatDate, formatDateTime } from "@/lib/helpers/date-helpers";

describe("date-helpers", () => {
  describe("formatDate", () => {
    describe("given a iso 8601 datetime string", () => {
      it("returns a human readable date string in MMM d, yyyy format", () => {
        const result = formatDate("2022-11-14T21:02:23.117949Z")

        expect(result).to.equal("Nov 14, 2022");
      });
    });
  });

  describe("formatDateTime", () => {
    describe("given a iso 8601 datetime string", () => {
      it("returns a human readable datetime string in MMM d, yyyy HH:mm:ss format", () => {
        const result = formatDateTime("2022-11-14T21:02:23.117949Z")

        expect(result).to.equal("Nov 14, 2022 16:02:23");
      });
    });
  });
})
