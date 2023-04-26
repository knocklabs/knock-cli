import { CliUx, Flags } from "@oclif/core";
import { AxiosResponse } from "axios";
import localeData from "locale-codes";

import { KnockEnv } from "@/lib/helpers/const";
import * as ApiV1 from "@/lib/api-v1";
import * as CustomFlags from "@/lib/helpers/flag";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { merge } from "@/lib/helpers/object";
import {
  maybePromptPageAction,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { withSpinner } from "@/lib/helpers/request";
import * as Translation from "@/lib/marshal/translation";

export default class TranslationValidate extends BaseCommand {
  static flags = {
    environment: Flags.string({
      summary:
        "Validating a workflow is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean(),
    "translations-dir": CustomFlags.dirPath({ dependsOn: ["all"] }),
  };

  static args = [{ name: "translationRef", required: false }];

  async run(): Promise<void> {
    const target = await Translation.ensureValidCommandTarget(this.props, this.runContext);


  }

  // static validateTranslations() {
  // }

  // async run(): Promise<ApiV1.ValidateWorkflowResp | void> {
  //   // 1. Retrieve the target workflow directory context.
  //   const dirContext = await this.getWorkflowDirContext();
  //
  //   this.log(`‣ Reading \`${dirContext.key}\` at ${dirContext.abspath}`);
  //
  //   // 2. Read the workflow.json with its template files.
  //   const [workflow, errors] = await Workflow.readWorkflowDir(dirContext, {
  //     withTemplateFiles: true,
  //   });
  //   if (errors.length > 0) {
  //     this.error(
  //       `Found the following errors in \`${dirContext.key}\` ${Workflow.WORKFLOW_JSON}\n\n` +
  //         formatErrors(errors),
  //     );
  //   }
  //
  //   // 3. Validate the compiled workflow data.
  //   await withSpinner<ApiV1.ValidateWorkflowResp>(
  //     () => {
  //       const props = merge(this.props, {
  //         args: { workflowKey: dirContext.key },
  //       });
  //
  //       return this.apiV1.validateWorkflow(props, workflow as AnyObj);
  //     },
  //     { action: "‣ Validating" },
  //   );
  //
  //   this.log(`‣ Successfully validated \`${dirContext.key}\``);
  // }
}
