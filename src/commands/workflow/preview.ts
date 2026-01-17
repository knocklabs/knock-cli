import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { pathExists } from "@/lib/helpers/fs";
import { readJson } from "@/lib/helpers/json";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import * as Workflow from "@/lib/marshal/workflow";
import { createPreviewServer } from "@/lib/preview-server";
import { WorkflowDirContext } from "@/lib/run-context";

export default class WorkflowPreview extends BaseCommand<
  typeof WorkflowPreview
> {
  static summary = "Start a local preview server for workflow templates.";

  static description = `
Starts a local development server that allows you to preview and edit workflow 
templates in your browser. The server watches for file changes and automatically 
reloads the preview.

Currently supports email channel templates with HTML/text toggle and responsive 
preview modes.
`;

  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %> my-workflow",
      description: "Start preview server for a workflow",
    },
    {
      command:
        "<%= config.bin %> <%= command.id %> my-workflow --data-file ./sample-data.json",
      description: "Start with sample trigger data from a file",
    },
    {
      command: "<%= config.bin %> <%= command.id %> my-workflow --port 4000",
      description: "Start on a custom port",
    },
  ];

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use for template preview.",
    }),
    branch: CustomFlags.branch,
    "data-file": Flags.string({
      summary: "Path to a JSON file containing sample trigger data.",
    }),
    port: Flags.integer({
      default: 3004,
      summary: "Port to run the preview server on.",
    }),
  };

  static args = {
    workflowKey: Args.string({
      required: true,
      description: "The workflow key to preview.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    // Resolve the workflow directory
    const workflowDirCtx = await this.resolveWorkflowDir(args.workflowKey);

    if (!workflowDirCtx.exists) {
      this.error(
        `Cannot locate workflow directory at \`${workflowDirCtx.abspath}\``,
      );
    }

    // Read the workflow to validate it exists
    const [workflow, readErrors] = await Workflow.readWorkflowDir(
      workflowDirCtx,
      { withExtractedFiles: true },
    );

    if (readErrors.length > 0 || !workflow) {
      this.error(`Failed to read workflow: ${readErrors[0]?.message}`);
    }

    // Load sample data from file if provided
    let sampleData: Record<string, unknown> | undefined;
    if (flags["data-file"]) {
      const dataFilePath = path.resolve(process.cwd(), flags["data-file"]);
      if (!(await pathExists(dataFilePath))) {
        this.error(`Data file not found: ${dataFilePath}`);
      }

      const [data, dataErrors] = await readJson(dataFilePath);
      if (dataErrors.length > 0 || !data) {
        this.error(`Failed to read data file: ${dataErrors[0]?.message}`);
      }

      sampleData = data as Record<string, unknown>;
    }

    // Resolve layouts and partials directories
    const layoutsDir = await resolveResourceDir(
      this.projectConfig,
      "email_layout",
      this.runContext.cwd,
    );
    const partialsDir = await resolveResourceDir(
      this.projectConfig,
      "partial",
      this.runContext.cwd,
    );

    this.log(`‣ Starting preview server for workflow \`${args.workflowKey}\``);
    this.log(`  Workflow directory: ${workflowDirCtx.abspath}`);
    this.log(`  Port: ${flags.port}`);
    this.log("");

    // Start the preview server
    const server = await createPreviewServer({
      workflowDirCtx,
      layoutsDir,
      partialsDir,
      sampleData,
      port: flags.port,
      apiClient: this.apiV1,
      environment: flags.environment,
      branch: flags.branch,
    });

    this.log(`‣ Preview server running at http://localhost:${flags.port}`);
    this.log("  Press Ctrl+C to stop");
    this.log("");

    // Keep the process running until interrupted
    await new Promise<void>((resolve) => {
      const cleanup = () => {
        this.log("\n‣ Shutting down preview server...");
        server.close(() => {
          this.log("  Server stopped.");
          resolve();
        });
      };

      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    });
  }

  private async resolveWorkflowDir(
    workflowKey: string,
  ): Promise<WorkflowDirContext> {
    const { resourceDir: resourceDirCtx, cwd: runCwd } = this.runContext;

    // If we're inside a workflow directory, use it
    if (resourceDirCtx?.type === "workflow") {
      if (resourceDirCtx.key !== workflowKey) {
        this.error(
          `Cannot preview \`${workflowKey}\` inside another workflow directory:\n${resourceDirCtx.key}`,
        );
      }

      return resourceDirCtx;
    }

    // Otherwise, resolve the workflows index directory
    const workflowsIndexDir = await resolveResourceDir(
      this.projectConfig,
      "workflow",
      runCwd,
    );

    const targetDirPath = path.resolve(workflowsIndexDir.abspath, workflowKey);

    return {
      type: "workflow",
      key: workflowKey,
      abspath: targetDirPath,
      exists: await Workflow.isWorkflowDir(targetDirPath),
    };
  }
}
