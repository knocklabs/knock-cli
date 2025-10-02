import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as MessageType from "@/lib/marshal/message-type";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  ensureResourceDirForTarget,
  MessageTypeDirContext,
  ResourceTarget,
} from "@/lib/run-context";

export default class MessageTypePull extends BaseCommand<
  typeof MessageTypePull
> {
  // Hide until guides are released in GA.
  static hidden = true;

  static summary =
    "Pull one or more in-app message types from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary:
        "Whether to pull all in-app message types from the specified environment.",
    }),
    "message-types-dir": CustomFlags.dirPath({
      summary:
        "The target directory path to pull all in-app message types into.",
      dependsOn: ["all"],
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    messageTypeKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags.all && args.messageTypeKey) {
      return this.error(
        `messageTypeKey arg \`${args.messageTypeKey}\` cannot also be provided when using --all`,
      );
    }

    return flags.all ? this.pullAllMessageTypes() : this.pullOneMessageType();
  }

  /*
   * Pull one message type
   */

  async pullOneMessageType(): Promise<void> {
    const { flags } = this.props;

    // 1. Retrieve or build a new message type directory context.
    const dirContext = await this.getMessageTypeDirContext();

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const prompt = `Create a new message type directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    // 2. Fetch the message type with annotations.
    const resp = await withSpinner<ApiV1.GetMessageTypeResp<WithAnnotation>>(
      () => {
        const props = merge(this.props, {
          args: { messageTypeKey: dirContext.key },
          flags: { annotate: true },
        });
        return this.apiV1.getMessageType(props);
      },
    );

    await MessageType.writeMessageTypeDirFromData(dirContext, resp.data);

    const action = dirContext.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`,
    );
  }

  async getMessageTypeDirContext(): Promise<MessageTypeDirContext> {
    const { messageTypeKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target message
    // type.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "message_type",
        key: messageTypeKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as MessageTypeDirContext;
    }

    // Not inside any existing message type directory, which means either create
    // a new message type directory in the cwd, or update it if there is one
    // already.
    if (messageTypeKey) {
      const dirPath = path.resolve(runCwd, messageTypeKey);
      const exists = await MessageType.isMessageTypeDir(dirPath);

      return {
        type: "message_type",
        key: messageTypeKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any message type directory, nor a message type key arg was given
    // so error.
    return this.error("Missing 1 required arg:\nmessageTypeKey");
  }

  /*
   * Pull all message types
   */

  async pullAllMessageTypes(): Promise<void> {
    const { flags } = this.props;

    const defaultToCwd = { abspath: this.runContext.cwd, exists: true };
    const targetDirCtx = flags["message-types-dir"] || defaultToCwd;

    const prompt = targetDirCtx.exists
      ? `Pull latest message types into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new message types directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start(`‣ Loading`);

    const messageTypes = await this.listAllMessageTypes();

    await MessageType.writeMessageTypesIndexDir(targetDirCtx, messageTypes);
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} the message types directory at ${targetDirCtx.abspath} using ${scope}`,
    );
  }

  async listAllMessageTypes(
    pageParams: Partial<PageInfo> = {},
    messageTypesFetchedSoFar: MessageType.MessageTypeData<WithAnnotation>[] = [],
  ): Promise<MessageType.MessageTypeData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listMessageTypes<WithAnnotation>(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const messageTypes = [...messageTypesFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllMessageTypes({ after: pageInfo.after }, messageTypes)
      : messageTypes;
  }
}
