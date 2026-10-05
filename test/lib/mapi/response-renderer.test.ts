import type { AxiosInstance } from "axios";
import { expect } from "chai";
import * as sinon from "sinon";

import {
  MAP_PAGINATION_MAX_PAGES,
  requestWithOptionalPagination,
} from "@/lib/mapi/response-renderer";

function noopLog(): void {
  /* noop */
}

describe("lib/mapi/response-renderer", () => {
  it("requestWithOptionalPagination stops after MAP_PAGINATION_MAX_PAGES stuck cursor", async () => {
    const client = {
      request: sinon.stub().callsFake(async () => ({
        status: 200,
        statusText: "OK",
        headers: {},
        data: {
          entries: [1],
          page_info: { after: "stuck-cursor" },
        },
      })),
    } as unknown as AxiosInstance;

    const opts = {
      raw: false,
      include: false,
      silent: true,
      verbose: false,
      log: noopLog,
      logToStderr: noopLog,
    };

    try {
      await requestWithOptionalPagination(
        client,
        {
          method: "get",
          url: "/v1/items",
          params: {},
          headers: {},
        },
        true,
        opts,
      );
      expect.fail("expected pagination guard error");
    } catch (error) {
      expect((error as Error).message).to.match(/--paginate: exceeded maximum/);
    }

    expect((client.request as sinon.SinonStub).callCount).to.equal(
      MAP_PAGINATION_MAX_PAGES,
    );
  });
});
