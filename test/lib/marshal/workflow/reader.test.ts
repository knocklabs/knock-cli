import { expect } from "@oclif/test";

import { validateTemplateFilePathFormat } from "@/lib/marshal/workflow/reader";
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
});
