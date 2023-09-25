import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";
import * as EmailLayout from "@/lib/marshal/email-layout";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  EmailLayoutDirContext,
  ensureResourceDirForTarget,
  ResourceTarget,
} from "@/lib/run-context";

export default class EmailLayoutPull extends BaseCommand<
  typeof EmailLayoutPull
> {
  static summary =
    "Pull one or more email layouts from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    all: Flags.boolean({
      summary:
        "Whether to pull all email layouts from the specified environment.",
    }),
    "email- layout - dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all email layouts into.",
      dependsOn: ["all"],
    }),
    "hide - uncommitted - changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    emailLayoutKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;
    if (flags.all && args.emailLayoutKey) {
      return this.error(
        `emailLayoutKey arg \`${args.emailLayoutKey}\` cannot also be provided when using --all`,
      );
    }

    return this.pullOneEmailLayout();
  }

  /*
   * Pull one email layout
   */
  async pullOneEmailLayout(): Promise<void> {
    const { flags } = this.props;

    const dirContext = await this.getEmailLayoutDirContext();

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const prompt = `Create a new email layout directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<ApiV1.GetEmailLayoutResp<WithAnnotation>>(
      () => {
        const props = merge(this.props, {
          args: { emailLayoutKey: dirContext.key },
          flags: { annotate: true },
        });
        return this.apiV1.getEmailLayout(props);
      },
    );

    await EmailLayout.writeEmailLayoutFile(dirContext.abspath, resp.data);

    const action = dirContext.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath}`,
    );
  }

  async getEmailLayoutDirContext(): Promise<EmailLayoutDirContext> {
    const { emailLayoutKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;
    // Inside an existing resource dir, use it if valid for the target email layout.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "email_layout",
        key: emailLayoutKey,
      };
      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as EmailLayoutDirContext;
    }

    // Not inside any existing email layout directory, which means either create a
    // new email layout directory in the cwd, or update it if there is one already.
    if (emailLayoutKey) {
      const dirPath = path.resolve(runCwd, emailLayoutKey);
      const exists = await EmailLayout.isEmailLayoutDir(dirPath);
      return {
        type: "email_layout",
        key: emailLayoutKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any email layout directory, nor a email layout key arg was given so error.
    return this.error("Missing 1 required arg: emailLayoutKey");
  }
}
