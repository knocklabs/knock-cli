import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/env";
import { readJson } from "@/lib/helpers/json";

describe("lib/helpers/json", () => {
  describe("readJson", () => {
    before(() => fs.removeSync(sandboxDir));
    afterEach(() => fs.removeSync(sandboxDir));

    describe("given a file path with valid json content", () => {
      it("returns a parsed json object with no errors", async () => {
        const validJsonStr = `{"hello": "world!"}`;
        const filePath = path.resolve(sandboxDir, "foo.json");

        await fs.outputFile(filePath, validJsonStr);

        const [payload, errors] = await readJson(filePath);

        expect(payload).to.eql({ hello: "world!" });
        expect(errors).to.eql([]);
      });
    });

    describe("given a file path with invalid json content", () => {
      it("returns a parsed json object with no errors", async () => {
        const invalidJson = `{hello: "world!",}`;
        const filePath = path.resolve(sandboxDir, "bar.json");

        await fs.outputFile(filePath, invalidJson);

        const [payload, errors] = await readJson(filePath);

        expect(payload).to.equal(undefined);
        expect(errors).to.have.lengthOf(1);
      });
    });
  });
});
