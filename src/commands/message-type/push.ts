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
import * as MessageType from "@/lib/marshal/message-type";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import MessageTypeValidate from "./validate";

export default class MessageTypePush extends BaseCommand<
  typeof MessageTypePush
> {
  // Hide until guides are released in GA.
  static hidden = true;

  static summary =
    "Push one or more message types from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary:
        "Pushing a message type is only allowed in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to push all message types from the target directory.",
    }),
    "message-types-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all message types to push.",
      dependsOn: ["all"],
    }),
    commit: Flags.boolean({
      summary: "Push and commit the message type(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = {
    messageTypeKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // 1. First read all message type directories found for the given command.
    const target = await MessageType.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );
    const [messageTypes, readErrors] =
      await MessageType.readAllForCommandTarget(target, {
        withExtractedFiles: true,
      });

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (messageTypes.length === 0) {
      this.error(
        `No message type directories found in ${target.context.abspath}`,
      );
    }

    // 2. Then validate them all ahead of pushing them.
    spinner.start(`‣ Validating`);

    const apiErrors = await MessageTypeValidate.validateAll(
      this.apiV1,
      this.props,
      messageTypes,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    // 3. Finally push up each message type, abort on the first error.
    spinner.start(`‣ Pushing`);

    for (const messageType of messageTypes) {
      const props = merge(this.props, { flags: { annotate: true } });

      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertMessageType<WithAnnotation>(props, {
        ...messageType.content,
        key: messageType.key,
      });

      if (isSuccessResp(resp)) {
        // Update the message type directory with the successfully pushed message
        // type payload from the server.
        // eslint-disable-next-line no-await-in-loop
        await MessageType.writeMessageTypeDirFromData(
          messageType,
          resp.data.message_type!,
        );
        continue;
      }

      const error = new SourceError(
        formatErrorRespMessage(resp),
        MessageType.messageTypeJsonPath(messageType),
        "ApiError",
      );
      this.error(formatError(error));
    }

    spinner.stop();

    // 4. Display a success message.
    const messageTypeKeys = messageTypes.map((w) => w.key);
    const actioned = flags.commit ? "pushed and committed" : "pushed";

    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${actioned} ${messageTypes.length} message type(s) to ${scope}:\n` +
        indentString(messageTypeKeys.join("\n"), 4),
    );
  }
}
