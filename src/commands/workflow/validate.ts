import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowValidate extends BaseCommand {
  static flags = {
    environment: Flags.string({
      summary:
        "Validating a workflow is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean(),
    "workflows-dir": CustomFlags.dirPath({ dependsOn: ["all"] }),
  };

  static args = [{ name: "workflowKey", required: false }];

  async run(): Promise<void> {
    // 1. Read all workflow directories found for the given command.
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

    // 2. Validate each workflow data.
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

    // 3. Display a success message.
    const workflowKeys = workflows.map((w) => w.key);
    this.log(
      `‣ Successfully validated ${workflows.length} workflow(s):\n` +
        indentString(workflowKeys.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props,
    workflows: Workflow.WorkflowDirData[],
  ): Promise<SourceError[]> {
    // TODO: Throw an error if a non validation error (e.g. authentication error)
    // instead of printing out same error messages repeatedly.

    const errorPromises = workflows.map(async (workflow) => {
      const resp = await api.validateWorkflow(props, {
        ...workflow.content,
        key: workflow.key,
      });

      if (isSuccessResp(resp)) return;

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Workflow.workflowJsonPath(workflow),
        "ApiError",
      );
      return error;
    });

    const errors = (await Promise.all(errorPromises)).filter(
      (e): e is Exclude<typeof e, undefined> => Boolean(e),
    );

    return errors;
  }
}
