import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { readAllForCommandTarget } from "@/lib/marshal/partial/reader";
import { PartialDirContext } from "@/lib/run-context";

const currCwd = process.cwd();

describe("lib/marshal/partial/reader", () => {
  describe("readAllForCommandTarget", () => {
    const partialsDirPath = path.join(sandboxDir, "partials");

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample partials directory.
      fs.outputJSONSync(path.join(partialsDirPath, "cta", "partial.json"), {
        foo: "bar",
      });
      fs.outputJSONSync(path.join(partialsDirPath, "notif", "partial.json"), {
        foo: "bar",
      });
      fs.outputJSONSync(path.join(partialsDirPath, "txt", "partial.json"), {
        foo: "bar",
      });
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("given a partial dir target", () => {
      it("returns partial files for index", async () => {
        const partialDirCtx: DirContext = {
          abspath: partialsDirPath,
          exists: true,
        };

        const [partials, errors] = await readAllForCommandTarget({
          type: "partialsIndexDir",
          context: partialDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(partials.length).to.equal(3);
      });

      it("returns partial file", async () => {
        const partialDirCtx: PartialDirContext = {
          type: "partial",
          key: "cta",
          abspath: path.join(partialsDirPath, "cta"),
          exists: true,
        };

        const [partials, errors] = await readAllForCommandTarget({
          type: "partialDir",
          context: partialDirCtx,
        });

        expect(errors.length).to.equal(0);
        expect(partials.length).to.equal(1);
        expect(partials[0].key).to.equal("cta");
      });
    });
  });
});
