import * as path from "node:path";

import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatErrors } from "@/lib/helpers/error";
import { readJson } from "@/lib/helpers/json";
import { AnyObj } from "@/lib/helpers/object";
import { withSpinner } from "@/lib/helpers/request";
import {
  buildTranslationFileCtx,
  TranslationFileContext,
} from "@/lib/marshal/translation";

export default class TranslationPush extends BaseCommand {
  static flags = {
    environment: Flags.string({
      summary:
        "Pushing a translation is only allowed in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    commit: Flags.boolean({
      summary: "Push and commit the translation(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = [{ name: "translationReference", required: true }];

  async run(): Promise<ApiV1.UpsertTranslationResp | void> {
    const { translationReference } = this.props.args;

    // 1. Retrieve the target translation file context.
    const { abspath, localeCode, namespace } =
      await this.getTranslationFileContext();

    this.log(`‣ Reading \`${translationReference}\` at ${abspath}`);

    // 2. Read the contents of the translation file
    const [translationContent, errors] = await readJson(abspath);

    if (errors.length > 0) {
      this.error(
        `Found the following errors in \`${translationReference}\`\n\n` +
          formatErrors(errors),
      );
    }

    // 3. Push up the translation contents
    await withSpinner<ApiV1.UpsertTranslationResp>(() => {
      const translation = {
        content: JSON.stringify(translationContent),
        locale_code: localeCode,
        namespace,
      };

      return this.apiV1.upsertTranslation(this.props, translation as AnyObj);
    });

    this.log(
      `‣ Successfully pushed \`${translationReference}\`, and updated ${abspath}`,
    );
  }

  async getTranslationFileContext(): Promise<TranslationFileContext> {
    const { translationReference } = this.props.args;

    // Error: missing the translation reference in the command
    if (!translationReference) {
      return this.error("Missing 1 required arg:\ntranslationReference");
    }

    const { resourceDir, cwd: runCwd } = this.runContext;

    // Error: trying to run the command not in a translation directory
    if (resourceDir && resourceDir.type !== "translation") {
      return this.error(
        `Cannot run ${BaseCommand.id} inside a ${resourceDir.type} directory`,
      );
    }

    const translationIdentifiers =
      getTranslationReferences(translationReference);

    // Error: malformed translation reference in the command
    if (!translationIdentifiers) {
      return this.error(
        `Invalid arg ${translationReference}, use valid <locale> or <namespace>.<locale> for namespaced translations.`,
      );
    }

    // Use the directory path and identifiers to build a translation file context
    const { localeCode, namespace } = translationIdentifiers;

    if (resourceDir && resourceDir.key !== localeCode) {
      return this.error(
        `Cannot run ${BaseCommand.id} inside a ${resourceDir.key} directory`,
      );
    }

    const dirPath = resourceDir
      ? resourceDir.abspath
      : path.resolve(runCwd, localeCode);

    const translationFileCtx = buildTranslationFileCtx(
      dirPath,
      localeCode,
      namespace,
    );

    // Error if the filepath generated doesn't exist, otherwise return the translation context
    return (await translationFileCtx).exists
      ? translationFileCtx
      : this.error(
          `Cannot locate a translation file for \`${translationReference}\``,
        );
  }
}

/*
 * Translation references will include the namespace first if one
 * exists, followed by a "." and then the locale code. If no
 * namespace exists, it will just be the locale code.
 * Ex: `en` vs `admin.en`
 */
const getTranslationReferences = (reference: string) => {
  const identifiers = reference.split(".");

  if (identifiers.length === 1 || identifiers.length === 2) {
    return identifiers.length === 1
      ? { localeCode: identifiers[0] }
      : { localeCode: identifiers[1], namespace: identifiers[0] };
  }
};
