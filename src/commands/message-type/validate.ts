import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as MessageType from "@/lib/marshal/message-type";

import MessageTypePush from "./push";

export default class MessageTypeValidate extends BaseCommand<
  typeof MessageTypeValidate
> {
  static summary =
    "Validate one or more message types from a local file system.";

  static flags = {
    environment: Flags.string({
      summary:
        "Validating a message type is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean({
      summary:
        "Whether to validate all message types from the target directory.",
    }),
    "message-types-dir": CustomFlags.dirPath({
      summary:
        "The target directory path to find all message types to validate.",
      dependsOn: ["all"],
    }),
  };

  static args = {
    messageTypeKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    // 1. Read all message type directories found for the given command.
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

    // 2. Validate each message type data.
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

    // 3. Display a success message.
    const messageTypeKeys = messageTypes.map((w) => w.key);
    this.log(
      `‣ Successfully validated ${messageTypes.length} message type(s):\n` +
        indentString(messageTypeKeys.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props<typeof MessageTypeValidate | typeof MessageTypePush>,
    messageTypes: MessageType.MessageTypeDirData[],
  ): Promise<SourceError[]> {
    // TODO: Throw an error if a non validation error (e.g. authentication error)
    // instead of printing out same error messages repeatedly.

    const errorPromises = messageTypes.map(async (messageType) => {
      const resp = await api.validateMessageType(props, {
        ...messageType.content,
        key: messageType.key,
      });

      if (isSuccessResp(resp)) return;

      const error = new SourceError(
        formatErrorRespMessage(resp),
        MessageType.messageTypeJsonPath(messageType),
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
