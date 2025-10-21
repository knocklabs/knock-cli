import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatError, formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import * as Workflow from "@/lib/marshal/workflow";

import WorkflowValidate from "./validate";

export default class WorkflowPush extends BaseCommand<typeof WorkflowPush> {
  static summary =
    "Push one or more workflows from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary:
        "The environment to push the workflow to. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to push all workflows from the target directory.",
    }),
    "workflows-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all workflows to push.",
      dependsOn: ["all"],
    }),
    commit: Flags.boolean({
      summary: "Push and commit the workflow(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = {
    workflowKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // 1. First read all workflow directories found for the given command.
    const target = await Workflow.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );
    const [workflows, readErrors] = await Workflow.readAllForCommandTarget(
      target,
      { withExtractedFiles: true },
    );

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (workflows.length === 0) {
      this.error(`No workflow directories found in ${target.context.abspath}`);
    }

    // 2. Then validate them all ahead of pushing them.
    spinner.start(`‣ Validating`);

    const apiErrors = await WorkflowValidate.validateAll(
      this.apiV1,
      this.props,
      workflows,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    // 3. Finally push up each workflow, abort on the first error.
    spinner.start(`‣ Pushing`);

    for (const workflow of workflows) {
      const props = merge(this.props, { flags: { annotate: true } });

      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertWorkflow<WithAnnotation>(props, {
        ...workflow.content,
        key: workflow.key,
      });

      if (isSuccessResp(resp)) {
        // Update the workflow directory with the successfully pushed workflow
        // payload from the server.
        // eslint-disable-next-line no-await-in-loop
        await Workflow.writeWorkflowDirFromData(workflow, resp.data.workflow!, {
          withSchema: true,
        });
        continue;
      }

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Workflow.workflowJsonPath(workflow),
        "ApiError",
      );
      this.error(formatError(error));
    }

    spinner.stop();

    // 4. Display a success message.
    const workflowKeys = workflows.map((w) => w.key);
    const actioned = flags.commit ? "pushed and committed" : "pushed";

    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${actioned} ${workflows.length} workflow(s) to ${scope}:\n` +
        indentString(workflowKeys.join("\n"), 4),
    );
  }
}
