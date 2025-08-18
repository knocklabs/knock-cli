import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { getLanguageFromExtension } from "@/lib/helpers/typegen";
import { spinner } from "@/lib/helpers/ux";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowGenerateTypes extends BaseCommand<
  typeof WorkflowGenerateTypes
> {
  static description =
    "Generate types for all workflows in an environment and write them to a file.";

  static flags = {
    environment: Flags.string({
      summary: "Select the environment to generate types for.",
      default: KnockEnv.Development,
    }),
    "output-file": CustomFlags.filePath({
      summary:
        "The output file to write the generated types to. We currently support .ts, .rb, .go, .py files only. Your file extension will determine the target language for the generated types.",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    const fileExtension = flags["output-file"].abspath.split(".").pop();
    const targetLanguage = getLanguageFromExtension(fileExtension!);

    if (!targetLanguage) {
      this.error(
        new ApiError(
          `Unsupported file extension: ${fileExtension}. We currently support .ts, .rb, .go, .py files only.`,
        ),
      );
    }

    spinner.start(`‣ Loading workflows`);

    // 1. List all workflows in the target environment.
    const workflows = await this.listAllWorkflows();

    spinner.stop();

    // 2. Generate types for all workflows.
    spinner.start(`‣ Generating types`);

    const { result, workflows: workflowsWithValidTypes } =
      await Workflow.generateWorkflowTypes(workflows, targetLanguage);

    spinner.stop();

    if (!result) {
      this.log(
        `‣ No workflows with valid trigger data JSON schema found, skipping type generation`,
      );
      return;
    }

    // 3. Write the generated types to the output file.
    await fs.writeFile(flags["output-file"].abspath, result.lines.join("\n"));

    this.log(
      `‣ Successfully generated types for ${workflowsWithValidTypes.length} workflow(s) and wrote them to ${flags["output-file"].abspath}`,
    );
  }

  async listAllWorkflows(
    pageParams: Partial<PageInfo> = {},
    workflowsFetchedSoFar: Workflow.WorkflowData<WithAnnotation>[] = [],
  ): Promise<Workflow.WorkflowData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listWorkflows<WithAnnotation>(props);

    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const workflows = [...workflowsFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllWorkflows({ after: pageInfo.after }, workflows)
      : workflows;
  }
}
