import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import {
  readTemplateFile,
  validateTemplateFilePathFormat,
} from "@/lib/marshal/workflow/reader";
import { WorkflowDirContext } from "@/lib/run-context";

describe("lib/marshal/workflow/reader", () => {
  describe("validateTemplateFilePathFormat", () => {
    const workflowDirCtx = {
      type: "workflow",
      key: "workflow-x",
      abspath: "/workflows/workflow-x",
      exists: true,
    } as WorkflowDirContext;

    describe("given an absolute path", () => {
      it("returns false as it is invalid", () => {
        const abspath = "/foo/bar";

        const result = validateTemplateFilePathFormat(abspath, workflowDirCtx);
        expect(result).to.equal(false);
      });
    });

    describe("given an relative path that resolves outside the workflow dir", () => {
      it("returns false as it is invalid", () => {
        const relpath = "../foo";

        const result = validateTemplateFilePathFormat(relpath, workflowDirCtx);
        expect(result).to.equal(false);
      });
    });

    describe("given an relative path that resolves inside the workflow dir", () => {
      it("returns true as it is valid", () => {
        const relpath1 = "email_1/default.subject.txt";
        const result1 = validateTemplateFilePathFormat(
          relpath1,
          workflowDirCtx,
        );
        expect(result1).to.equal(true);

        const relpath2 = "./email_1/default.subject.txt";
        const result2 = validateTemplateFilePathFormat(
          relpath2,
          workflowDirCtx,
        );
        expect(result2).to.equal(true);

        // Don't ever expect anyone to write the template file path like this
        // but technically correct.
        const relpath3 =
          "../workflow-y/../workflow-x/email_1/default.subject.txt";
        const result3 = validateTemplateFilePathFormat(
          relpath3,
          workflowDirCtx,
        );
        expect(result3).to.equal(true);
      });
    });
  });

  describe("readTemplateFile", () => {
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
      it("returns the read template content without errors", async () => {
        const fileContent = `
{% assign my_variable = 10 %}
<p>
  Hello {{ recipient.name }}
</p>
`.trimStart();

        const filePath = path.resolve(workflowDirCtx.abspath, "sample.html");
        fs.outputFileSync(filePath, fileContent);

        const [readContent, errors] = await readTemplateFile(
          "sample.html",
          workflowDirCtx,
        );

        expect(readContent).to.be.a("string");
        expect(errors).to.eql([]);
      });
    });

    describe("given a valid liquid markdown template", () => {
      it("returns the read template content without errors", async () => {
        const fileContent = `
{% assign my_variable = 10 %}
**Hello {{ recipient.name }}**
`.trimStart();

        const filePath = path.resolve(workflowDirCtx.abspath, "sample.md");
        fs.outputFileSync(filePath, fileContent);

        const [readContent, errors] = await readTemplateFile(
          "sample.md",
          workflowDirCtx,
        );

        expect(readContent).to.be.a("string");
        expect(errors).to.eql([]);
      });
    });

    describe("given a valid liquid json template", () => {
      it("returns the read template content without errors", async () => {
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

        const [readContent, errors] = await readTemplateFile(
          "sample.json",
          workflowDirCtx,
        );

        expect(readContent).to.be.a("string");
        expect(errors).to.eql([]);
      });
    });

    describe("given an invalid liquid json template", () => {
      it("returns the read template content without errors", async () => {
        const fileContent = `
{% assign my_variable = 10 %}
{
  "text": "{{ my_variable "
}
`.trimStart();

        const filePath = path.resolve(workflowDirCtx.abspath, "sample.json");
        fs.outputFileSync(filePath, fileContent);

        const [readContent, errors] = await readTemplateFile(
          "sample.json",
          workflowDirCtx,
        );

        expect(readContent).to.equal(undefined);
        expect(errors).to.have.lengthOf(1);
      });
    });
  });
});
