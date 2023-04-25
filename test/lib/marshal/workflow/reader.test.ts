import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";
import { get } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { JsonDataError } from "@/lib/helpers/error";
import {
  checkIfValidExtractedFilePathFormat,
  readExtractedFileSync,
  readWorkflowDir,
  VISUAL_BLOCKS_JSON,
  WORKFLOW_JSON,
} from "@/lib/marshal/workflow";
import { WorkflowDirContext } from "@/lib/run-context";

const currCwd = process.cwd();

describe("lib/marshal/workflow/reader", () => {
  describe("checkIfValidExtractedFilePathFormat", () => {
    const workflowDirCtx = {
      type: "workflow",
      key: "workflow-x",
      abspath: "/workflows/workflow-x",
      exists: true,
    } as WorkflowDirContext;

    describe("given an absolute path", () => {
      it("returns false as it is invalid", () => {
        const abspath = "/foo/bar";

        const result = checkIfValidExtractedFilePathFormat(
          abspath,
          workflowDirCtx.abspath,
        );
        expect(result).to.equal(false);
      });
    });

    describe("given an relative path that resolves outside the workflow dir", () => {
      it("returns false as it is invalid", () => {
        const relpath = "../foo";

        const result = checkIfValidExtractedFilePathFormat(
          relpath,
          workflowDirCtx.abspath,
        );
        expect(result).to.equal(false);
      });
    });

    describe("given an relative path that resolves inside the workflow dir", () => {
      it("returns true as it is valid", () => {
        const relpath1 = "email_1/default.subject.txt";
        const result1 = checkIfValidExtractedFilePathFormat(
          relpath1,
          workflowDirCtx.abspath,
        );
        expect(result1).to.equal(true);

        const relpath2 = "./email_1/default.subject.txt";
        const result2 = checkIfValidExtractedFilePathFormat(
          relpath2,
          workflowDirCtx.abspath,
        );
        expect(result2).to.equal(true);

        // Don't ever expect anyone to write the template file path like this
        // but technically correct.
        const relpath3 =
          "../workflow-y/../workflow-x/email_1/default.subject.txt";
        const result3 = checkIfValidExtractedFilePathFormat(
          relpath3,
          workflowDirCtx.abspath,
        );
        expect(result3).to.equal(true);
      });
    });
  });

  describe("readExtractedFileSync", () => {
    const workflowDirCtx: WorkflowDirContext = {
      type: "workflow",
      key: "foo",
      abspath: path.resolve(sandboxDir, "foo"),
      exists: true,
    };

    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDir(workflowDirCtx.abspath);
    });
    after(() => fs.removeSync(sandboxDir));

    describe("given a valid liquid html template", () => {
      it("returns the read template content without errors", () => {
        const fileContent = `
{% assign my_variable = 10 %}
<p>
  Hello {{ recipient.name }}
</p>
`.trimStart();

        const filePath = path.resolve(workflowDirCtx.abspath, "sample.html");
        fs.outputFileSync(filePath, fileContent);

        const [readContent, error] = readExtractedFileSync(
          "sample.html",
          workflowDirCtx,
        );

        expect(readContent).to.be.a("string");
        expect(error).to.equal(undefined);
      });
    });

    describe("given a valid liquid markdown template", () => {
      it("returns the read template content without error", async () => {
        const fileContent = `
{% assign my_variable = 10 %}
**Hello {{ recipient.name }}**
`.trimStart();

        const filePath = path.resolve(workflowDirCtx.abspath, "sample.md");
        fs.outputFileSync(filePath, fileContent);

        const [readContent, error] = readExtractedFileSync(
          "sample.md",
          workflowDirCtx,
        );

        expect(readContent).to.be.a("string");
        expect(error).to.equal(undefined);
      });
    });

    describe("given a valid liquid json template", () => {
      it("returns the read template content without error", async () => {
        const fileContent = `
{% assign my_variable = 10 %}
{
  "text":
    {% if my_variable > 5 %}
      "foo"
    {% else %}
      "bar"
    {% endif %}
}
`.trimStart();

        const filePath = path.resolve(workflowDirCtx.abspath, "sample.json");
        fs.outputFileSync(filePath, fileContent);

        const [readContent, error] = readExtractedFileSync(
          "sample.json",
          workflowDirCtx,
        );

        expect(readContent).to.be.a("string");
        expect(error).to.equal(undefined);
      });
    });

    describe("given an invalid liquid json template", () => {
      it("returns the read template content without error", async () => {
        const fileContent = `
{% assign my_variable = 10 %}
{
  "text": "{{ my_variable "
}
`.trimStart();

        const filePath = path.resolve(workflowDirCtx.abspath, "sample.json");
        fs.outputFileSync(filePath, fileContent);

        const [readContent, error] = readExtractedFileSync(
          "sample.json",
          workflowDirCtx,
        );

        expect(readContent).to.equal(undefined);
        expect(error).to.be.an.instanceof(JsonDataError);
      });
    });
  });

  describe("readWorkflowDir", () => {
    const sampleWorkflowJson = {
      name: "My cool workflow",
      steps: [
        {
          channel_key: "email-postmark",
          ref: "email_1",
          template: {
            settings: {
              layout_key: "default",
            },
            subject: "You've got mail!",
            "text_body@": "email_1/text_body.txt",
            "visual_blocks@": "email_1/visual_blocks.json",
          },
          type: "channel",
        },
      ],
      __readonly: {
        environment: "development",
        key: "my-cool-workflow",
        active: false,
        valid: true,
        created_at: "2023-02-16T02:49:12.163499Z",
        updated_at: "2023-04-25T14:28:43.486084Z",
      },
    };

    const sampleVisualBlockJson = [
      {
        type: "markdown",
        variant: "default",
        version: 1,
        "content@": "visual_blocks/1.content.md",
      },
    ];

    const workflowDirPath = path.join(
      sandboxDir,
      "workflows",
      "my-cool-workflow",
    );

    const workflowDirCtx: WorkflowDirContext = {
      type: "workflow",
      key: "my-cool-workflow",
      abspath: workflowDirPath,
      exists: true,
    };

    before(() => {
      fs.removeSync(sandboxDir);

      // Set up a sample workflow directory with two levels of content extraction.
      fs.outputJsonSync(
        path.join(workflowDirPath, WORKFLOW_JSON),
        sampleWorkflowJson,
      );
      fs.outputJsonSync(
        path.join(workflowDirPath, "email_1", VISUAL_BLOCKS_JSON),
        sampleVisualBlockJson,
      );
      fs.outputFileSync(
        path.join(workflowDirPath, "email_1", "text_body.txt"),
        "foo",
      );
      fs.outputFileSync(
        path.join(workflowDirPath, "email_1", "visual_blocks", "1.content.md"),
        "bar",
      );
    });

    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("by default without any opts", () => {
      it("reads workflow.json without the readonly field and extracted files joined", async () => {
        const [workflow] = await readWorkflowDir(workflowDirCtx);

        expect(get(workflow, ["name"])).to.equal("My cool workflow");
        expect(get(workflow, ["steps", 0, "ref"])).to.equal("email_1");

        expect(get(workflow, ["__readonly"])).to.equal(undefined);
        expect(get(workflow, ["steps", 0, "template", "text_body"])).to.equal(
          undefined,
        );
      });
    });

    describe("with the withReadonlyField opt of true", () => {
      it("reads workflow.json with the readonly field", async () => {
        const [workflow] = await readWorkflowDir(workflowDirCtx, {
          withReadonlyField: true,
        });

        expect(get(workflow, ["name"])).to.equal("My cool workflow");
        expect(get(workflow, ["steps", 0, "ref"])).to.equal("email_1");

        expect(get(workflow, ["__readonly"])).to.eql({
          environment: "development",
          key: "my-cool-workflow",
          active: false,
          valid: true,
          created_at: "2023-02-16T02:49:12.163499Z",
          updated_at: "2023-04-25T14:28:43.486084Z",
        });
      });
    });

    describe("with the withExtractedFiles opt of true", () => {
      it("reads workflow.json with the readonly field", async () => {
        const [workflow] = await readWorkflowDir(workflowDirCtx, {
          withExtractedFiles: true,
        });

        expect(get(workflow, ["name"])).to.equal("My cool workflow");
        expect(get(workflow, ["steps", 0, "ref"])).to.equal("email_1");

        // Email text body content should be inlined into workflow data
        expect(get(workflow, ["steps", 0, "template", "text_body"])).to.equal(
          "foo",
        );
        expect(get(workflow, ["steps", 0, "template", "text_body@"])).to.equal(
          "email_1/text_body.txt",
        );

        // Email visual blocks should be inlined into workflow data
        expect(get(workflow, ["steps", 0, "template", "visual_blocks"]))
          .to.be.an("array")
          .that.has.length(1);
        expect(
          get(workflow, ["steps", 0, "template", "visual_blocks@"]),
        ).to.equal("email_1/visual_blocks.json");

        // Block content fields in visual blocks should also be inlined, with
        // its extracted path rebased to be relative to workflow.json
        expect(
          get(workflow, [
            "steps",
            0,
            "template",
            "visual_blocks",
            0,
            "content",
          ]),
        ).to.equal("bar");
        expect(
          get(workflow, [
            "steps",
            0,
            "template",
            "visual_blocks",
            0,
            "content@",
          ]),
        ).to.equal("email_1/visual_blocks/1.content.md");
      });
    });
  });
});
