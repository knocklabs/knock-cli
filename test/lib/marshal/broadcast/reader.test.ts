import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";
import { get } from "lodash";

import { xpath } from "@/../test/support";
import { sandboxDir } from "@/lib/helpers/const";
import { BROADCAST_JSON, readBroadcastDir } from "@/lib/marshal/broadcast";
import { VISUAL_BLOCKS_JSON } from "@/lib/marshal/workflow";
import { BroadcastDirContext } from "@/lib/run-context";

const currCwd = process.cwd();

describe("lib/marshal/broadcast/reader", () => {
  describe("readBroadcastDir", () => {
    const broadcastDirPath = path.join(
      sandboxDir,
      "broadcasts",
      "welcome-broadcast",
    );

    const broadcastDirCtx: BroadcastDirContext = {
      type: "broadcast",
      key: "welcome-broadcast",
      abspath: broadcastDirPath,
      exists: true,
    };

    const broadcastJson = {
      key: "welcome-broadcast",
      name: "Welcome",
      steps: [
        {
          channel_key: "email-postmark",
          ref: "email_1",
          template: {
            subject: "You've got mail!",
            "text_body@": xpath("email_1/text_body.txt"),
            "visual_blocks@": xpath("email_1/visual_blocks.json"),
          },
          type: "channel",
        },
      ],
    };

    const visualBlocksJson = [
      {
        type: "markdown",
        variant: "default",
        version: 1,
        "content@": xpath("visual_blocks/1.content.md"),
      },
    ];

    before(() => {
      fs.removeSync(sandboxDir);
      fs.outputJsonSync(
        path.join(broadcastDirPath, BROADCAST_JSON),
        broadcastJson,
      );
      fs.outputJsonSync(
        path.join(broadcastDirPath, "email_1", VISUAL_BLOCKS_JSON),
        visualBlocksJson,
      );
      fs.outputFileSync(
        path.join(broadcastDirPath, "email_1", "text_body.txt"),
        "foo",
      );
      fs.outputFileSync(
        path.join(broadcastDirPath, "email_1", "visual_blocks", "1.content.md"),
        "bar",
      );
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    it("inlines nested extracted template files and rebases their paths", async () => {
      const [broadcast] = await readBroadcastDir(broadcastDirCtx, {
        withExtractedFiles: true,
      });

      expect(get(broadcast, ["steps", 0, "template", "text_body"])).to.equal(
        "foo",
      );
      expect(get(broadcast, ["steps", 0, "template", "text_body@"])).to.equal(
        xpath("email_1/text_body.txt"),
      );
      expect(get(broadcast, ["steps", 0, "template", "visual_blocks"]))
        .to.be.an("array")
        .that.has.length(1);
      expect(
        get(broadcast, ["steps", 0, "template", "visual_blocks", 0, "content"]),
      ).to.equal("bar");
      expect(
        get(broadcast, [
          "steps",
          0,
          "template",
          "visual_blocks",
          0,
          "content@",
        ]),
      ).to.equal(xpath("email_1/visual_blocks/1.content.md"));
    });
  });
});
