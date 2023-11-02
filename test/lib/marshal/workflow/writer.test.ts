import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  pruneWorkflowsIndexDir,
  WORKFLOW_JSON,
  WorkflowData,
} from "@/lib/marshal/workflow";

describe("lib/marshal/workflow/writer", () => {
  describe("pruneWorkflowsIndexDir", () => {
    const annotation = {
      extractable_fields: {},
      readonly_fields: [
        "environment",
        "key",
        "active",
        "valid",
        "created_at",
        "updated_at",
      ],
    };
    const remoteWorkflows: WorkflowData<WithAnnotation>[] = [
      {
        key: "foo",
        name: "Foo",
        active: false,
        valid: false,
        steps: [],
        created_at: "2022-12-31T12:00:00.000000Z",
        updated_at: "2022-12-31T12:00:00.000000Z",
        __annotation: annotation,
      },
    ];

    const workflowsIndexDir = path.resolve(sandboxDir, "workflows");

    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(workflowsIndexDir);
    });

    after(() => {
      fs.removeSync(sandboxDir);
    });

    describe("given a file in the worfklows index dir", () => {
      it("removes the file", async () => {
        const filePath = path.resolve(workflowsIndexDir, "foo");
        fs.ensureFileSync(filePath);

        const indexDirCtx = { abspath: workflowsIndexDir, exists: true };
        await pruneWorkflowsIndexDir(indexDirCtx, remoteWorkflows);

        expect(fs.pathExistsSync(filePath)).to.equal(false);
      });
    });

    describe("given a non workflow directory in the worfklows index dir", () => {
      it("removes the directory", async () => {
        const dirPath = path.resolve(workflowsIndexDir, "foo");
        fs.ensureDirSync(dirPath);

        const indexDirCtx = { abspath: workflowsIndexDir, exists: true };
        await pruneWorkflowsIndexDir(indexDirCtx, remoteWorkflows);

        expect(fs.pathExistsSync(dirPath)).to.equal(false);
      });
    });

    describe("given a workflow directory not found in remote workflows", () => {
      it("removes the workflow directory", async () => {
        const workflowJsonPath = path.resolve(
          workflowsIndexDir,
          "bar",
          WORKFLOW_JSON,
        );
        fs.ensureFileSync(workflowJsonPath);

        const indexDirCtx = { abspath: workflowsIndexDir, exists: true };
        await pruneWorkflowsIndexDir(indexDirCtx, remoteWorkflows);

        expect(fs.pathExistsSync(workflowJsonPath)).to.equal(false);
      });
    });

    describe("given a workflow directory found in remote workflows", () => {
      it("retains the workflow directory", async () => {
        const workflowJsonPath = path.resolve(
          workflowsIndexDir,
          "foo",
          WORKFLOW_JSON,
        );
        fs.ensureFileSync(workflowJsonPath);

        const indexDirCtx = { abspath: workflowsIndexDir, exists: true };
        await pruneWorkflowsIndexDir(indexDirCtx, remoteWorkflows);

        expect(fs.pathExistsSync(workflowJsonPath)).to.equal(true);
      });
    });
  });
});
