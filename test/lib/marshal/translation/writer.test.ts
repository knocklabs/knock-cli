import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { sandboxDir } from "@/lib/helpers/const";
import { writeTranslationFiles } from "@/lib/marshal/translation/writer";

describe("lib/marshal/translation/writer", () => {
  const targetDir = path.join(sandboxDir, "translations");
  const localFile = path.join(targetDir, "en", "en.json");
  const localContent = '{"hello":"local work"}';

  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.outputFileSync(localFile, localContent);
    fs.outputFileSync(path.join(targetDir, "fr", "fr.json"), localContent);
  });

  afterEach(() => {
    sinon.restore();
    fs.removeSync(sandboxDir);
  });

  for (const partialBackup of [false, true]) {
    it(`preserves local translations and the error when backup fails ${
      partialBackup ? "after copying a file" : "before copying"
    }`, async () => {
      const error = Object.assign(new Error("Backup I/O failure"), {
        code: "EIO",
      });
      const copy = fs.copy;
      sinon.stub(fs, "copy").callsFake(async (source, destination) => {
        if (source === targetDir) {
          if (partialBackup) {
            await fs.outputFile(
              path.join(destination, "en", "en.json"),
              localContent,
            );
          }

          throw error;
        }

        return copy(source, destination);
      });

      let caught: unknown;
      try {
        await writeTranslationFiles({ abspath: targetDir, exists: true }, []);
      } catch (error) {
        caught = error;
      }

      expect(fs.readFileSync(localFile, "utf8")).to.equal(localContent);
      expect(
        fs.readFileSync(path.join(targetDir, "fr", "fr.json"), "utf8"),
      ).to.equal(localContent);
      expect(caught).to.equal(error);
      expect(fs.readdirSync(sandboxDir)).to.deep.equal(["translations"]);
    });
  }

  it("restores a completed backup when clearing the target fails", async () => {
    const error = new Error("Cannot clear target");
    const emptyDir = sinon.stub(fs, "emptyDir");
    emptyDir.onFirstCall().callsFake(async () => {
      await fs.remove(localFile);
      throw error;
    });
    emptyDir.callThrough();

    let caught: unknown;
    try {
      await writeTranslationFiles({ abspath: targetDir, exists: true }, []);
    } catch (error) {
      caught = error;
    }

    expect(caught).to.equal(error);
    expect(fs.readFileSync(localFile, "utf8")).to.equal(localContent);
    expect(fs.readdirSync(sandboxDir)).to.deep.equal(["translations"]);
  });
});
