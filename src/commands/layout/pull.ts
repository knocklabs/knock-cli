import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
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
  static aliases = ["email-layout:pull", "email_layout:pull"];

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
    "layouts-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all email layouts into.",
      dependsOn: ["all"],
      aliases: ["email-layouts-dir"],
    }),
    "hide-uncommitted-changes": Flags.boolean({
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

    return flags.all ? this.pullAllEmailLayouts() : this.pullOneEmailLayout();
  }

  // Pull one email layout
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

    await EmailLayout.writeEmailLayoutDirFromData(dirContext, resp.data);

    const action = dirContext.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath}`,
    );
  }

  // Pull all email layouts
  async pullAllEmailLayouts(): Promise<void> {
    const { flags } = this.props;

    const defaultToCwd = { abspath: this.runContext.cwd, exists: true };
    const targetDirCtx = flags["layouts-dir"] || defaultToCwd;

    const prompt = targetDirCtx.exists
      ? `Pull latest layouts into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new layouts directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start(`‣ Loading`);

    const emailLayouts = await this.listAllEmailLayouts();

    await EmailLayout.writeEmailLayoutIndexDir(targetDirCtx, emailLayouts);
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${action} the layouts directory at ${targetDirCtx.abspath}`,
    );
  }

  async listAllEmailLayouts(
    pageParams: Partial<PageInfo> = {},
    emailLayoutsFetchedSoFar: EmailLayout.EmailLayoutData<WithAnnotation>[] = [],
  ): Promise<EmailLayout.EmailLayoutData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listEmailLayouts<WithAnnotation>(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const emailLayouts = [...emailLayoutsFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllEmailLayouts({ after: pageInfo.after }, emailLayouts)
      : emailLayouts;
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
    return this.error("Missing 1 required arg:\nemailLayoutKey");
  }
}
