import { expect } from "@oclif/test";

import { dirname, join, relative } from "@/lib/helpers/path.isomorphic";

describe("lib/helpers/path", () => {
  describe("join", () => {
    it("joins segments with forward slashes", () => {
      expect(join("email_1", "template", "visual_blocks.json")).to.equal(
        "email_1/template/visual_blocks.json",
      );
    });

    it("resolves . and .. segments", () => {
      expect(join("email_1", "./template", "../content.md")).to.equal(
        "email_1/content.md",
      );
      expect(join("email_1", "../../shared.md")).to.equal("../shared.md");
    });

    it("keeps a leading slash and stops .. at the root", () => {
      expect(join("/workflows", "..", "..", "a.md")).to.equal("/a.md");
    });

    it("treats backslashes as separators", () => {
      expect(join("email_1\\template", "content.md")).to.equal(
        "email_1/template/content.md",
      );
    });

    it("returns . when there is nothing to join", () => {
      expect(join()).to.equal(".");
      expect(join("", "")).to.equal(".");
    });
  });

  describe("dirname", () => {
    it("returns the parent directory", () => {
      expect(dirname("email_1/visual_blocks/1.content.md")).to.equal(
        "email_1/visual_blocks",
      );
      expect(dirname("email_1\\content.md")).to.equal("email_1");
      expect(dirname("email_1/template/")).to.equal("email_1");
    });

    it("returns . for a file at the top level and / for one at the root", () => {
      expect(dirname("workflow.json")).to.equal(".");
      expect(dirname("/workflow.json")).to.equal("/");
    });
  });

  describe("relative", () => {
    it("returns the path from one directory to a file under it", () => {
      expect(
        relative("email_1", "email_1/visual_blocks/1.content.md"),
      ).to.equal("visual_blocks/1.content.md");
      expect(relative(".", "email_1/content.md")).to.equal(
        "email_1/content.md",
      );
    });

    it("climbs out of directories the two paths do not share", () => {
      expect(relative("email_1/visual_blocks", "email_1/content.md")).to.equal(
        "../content.md",
      );
      expect(relative("email_1\\visual_blocks", "email_2/content.md")).to.equal(
        "../../email_2/content.md",
      );
    });

    it("returns an empty string for the same path", () => {
      expect(relative("email_1/", "./email_1")).to.equal("");
    });
  });
});
