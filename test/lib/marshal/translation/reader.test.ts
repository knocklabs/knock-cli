import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
// import { JsonDataError } from "@/lib/helpers/error";
// import { LAYOUT_JSON } from "@/lib/marshal/email-layout";
import { readAllForCommandTarget } from "@/lib/marshal/translation/reader";
import { SYSTEM_NAMESPACE } from "@/lib/marshal/translation/helpers";
import { TranslationDirContext } from "@/lib/run-context";

const currCwd = process.cwd();

describe("lib/marshal/translation/reader", () => {
  describe("readAllForCommandTarget", () => {
    const translationLocaleDirPath = path.join(
      sandboxDir,
      "translations",
      "en",
    );

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample translation locale directory.
      fs.outputJsonSync(path.join(translationLocaleDirPath, "en.json"), {
        foo: "bar",
      });
      fs.outputJsonSync(path.join(translationLocaleDirPath, "hello.en.json"), {
        foo: "bar",
      });
      fs.outputJsonSync(path.join(translationLocaleDirPath, "system.en.json"), {
        foo: "bar",
      });
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("given a translation locale dir target with a system translation file", () => {
      it("returns translation files without the system translation", async () => {
        const translationDirCtx: TranslationDirContext = {
          type: "translation",
          key: "en",
          abspath: translationLocaleDirPath,
          exists: true,
        };

        const [translations, errors] = await readAllForCommandTarget({
          type: "translationDir",
          context: translationDirCtx,
        });

        expect(errors.length).to.equal(0);

        expect(
          translations.find((t) => t.namespace === SYSTEM_NAMESPACE),
        ).to.equal(undefined);
      });
    });
  });
});
