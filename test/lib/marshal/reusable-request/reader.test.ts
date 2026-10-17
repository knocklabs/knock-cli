import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { REUSABLE_REQUEST_JSON } from "@/lib/marshal/reusable-request";
import { readReusableRequestDir } from "@/lib/marshal/reusable-request/reader";
import { ReusableRequestDirContext } from "@/lib/run-context";

describe("lib/marshal/reusable-request/reader", () => {
  const dirPath = path.join(sandboxDir, "fetch-user");

  after(() => {
    fs.removeSync(sandboxDir);
  });

  it("keeps type when the API annotation stored it under __readonly", async () => {
    fs.outputJsonSync(path.join(dirPath, REUSABLE_REQUEST_JSON), {
      name: "Fetch user",
      settings: { method: "get", url: "https://example.com" },
      __readonly: { key: "fetch-user", type: "http_fetch" },
    });

    const dirCtx: ReusableRequestDirContext = {
      type: "reusable_request",
      key: "fetch-user",
      abspath: dirPath,
      exists: true,
    };

    const [reusableRequest, errors] = await readReusableRequestDir(dirCtx);

    expect(errors).to.deep.equal([]);
    expect(reusableRequest.type).to.equal("http_fetch");
    expect(reusableRequest.__readonly).to.equal(undefined);
    expect(reusableRequest.key).to.equal(undefined);
  });
});
