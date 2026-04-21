import { expect } from "chai";

import { generateCurl } from "@/lib/mapi/curl-generator";

describe("lib/mapi/curl-generator", () => {
  it("generates curl with bearer placeholder and query string", () => {
    const line = generateCurl({
      method: "get",
      url: "/v1/workflows",
      absoluteUrl: "https://control.knock.app/v1/workflows",
      params: { environment: "development", limit: 10 },
      headers: {},
    });
    expect(line).to.include("-X GET");
    expect(line).to.include("Bearer $KNOCK_SERVICE_TOKEN");
    expect(line).to.include("environment=development");
    expect(line).to.include("limit=10");
  });

  it("includes JSON body and Content-Type", () => {
    const line = generateCurl({
      method: "put",
      url: "/v1/workflows/x/run",
      absoluteUrl: "https://control.knock.app/v1/workflows/x/run",
      params: { environment: "development" },
      data: { recipients: ["u1"] },
      headers: {},
    });
    expect(line).to.include("-X PUT");
    expect(line).to.include("-d");
    expect(line).to.include("recipients");
  });
});
