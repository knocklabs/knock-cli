import * as path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatErrors } from "@/lib/helpers/error";
import { readJson } from "@/lib/helpers/json";
import { AnyObj } from "@/lib/helpers/object";
import { withSpinner } from "@/lib/helpers/request";
import {
  buildTranslationFileCtx,
  isValidLocale,
  TranslationFileContext,
} from "@/lib/marshal/translation";
import { ResourceDirContext } from "@/lib/run-context";

export default class TranslationPush extends BaseCommand {
  static flags = {
    environment: Flags.string({
      summary:
        "Pushing a translation is only allowed in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean(),
    commit: Flags.boolean({
      summary: "Push and commit the translation(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = [{ name: "translationReference", required: false }];

  async run(): Promise<ApiV1.UpsertTranslationResp | void> {
    const { args, flags } = this.props;
    const { resourceDir, cwd: runCwd } = this.runContext;

    if (flags.all && args.translationReference) {
      return this.pushTranslationsForLocale(
        resourceDir,
        runCwd,
        args.translationReference,
      );
    }

    if (args.translationReference) {
      return this.pushOneTranslation(
        resourceDir,
        runCwd,
        args.translationReference,
      );
    }

    if (flags.all) {
      return this.pushAllTranslations(resourceDir, runCwd);
    }

    return this.error(`Error: no translation reference or \`all\` flag used.`);
  }

  async pushOneTranslation(
    resourceDir: ResourceDirContext | undefined,
    runCwd: string,
    translationReference: string,
  ): Promise<ApiV1.UpsertTranslationResp | void> {
    // 1. Retrieve the target translation file context.
    const { abspath, localeCode, namespace } =
      await this.getTranslationFileContext(
        resourceDir,
        runCwd,
        translationReference,
      );

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

  async readAndPushDirChildren(
    directoryPath: fs.PathLike,
    resourceDir: ResourceDirContext | undefined,
    runCwd: string,
  ): Promise<void> {
    const children = await fs.readdir(directoryPath);

    // Break if we encounter an error in one of the upserts
    for (const translation of children) {
      const ext = path.extname(translation);
      const childRef = path.basename(translation, ext);

      // eslint-disable-next-line no-await-in-loop
      const res = await this.pushOneTranslation(resourceDir, runCwd, childRef);
      if (res?.errors) {
        break;
      }
    }
  }

  async pushTranslationsForLocale(
    resourceDir: ResourceDirContext | undefined,
    runCwd: string,
    translationReference: string,
  ): Promise<ApiV1.UpsertTranslationResp | void> {
    // Error: in a non-translations resource directory
    if (resourceDir?.exists && resourceDir?.type !== "translation")
      return this.error(
        `${resourceDir.abspath} is not a translations directory.`,
      );

    // Error: in a translations directory that doesn't match the translation reference passed
    if (
      resourceDir?.exists &&
      resourceDir?.type === "translation" &&
      resourceDir?.key !== translationReference
    )
      return this.error(
        `${translationReference} doesn't match the locale of the current directory, ${resourceDir.abspath}. Try navigating to its parent directory and pushing again.`,
      );

    // We are in the directory for this locale we want to push
    if (resourceDir?.exists && resourceDir?.type === "translation") {
      return this.readAndPushDirChildren(
        resourceDir.abspath,
        resourceDir,
        runCwd,
      );
    }

    // Not in a resource directory; looking for the locale in the cwd
    const dirChildren = await fs.readdir(runCwd);
    const localeDir = dirChildren.find(
      (child) => child === translationReference,
    );

    // Error: we didn't find the intended locale directory in this parent directory
    if (!localeDir) {
      return this.error(
        `${translationReference} doesn't exist in this directory. Make sure you have a locale directory for \`${translationReference}\` or navigate to your translations directory and try pushing for this locale again.`,
      );
    }

    // If it was found, read and push its children
    const localeDirPath = path.resolve(runCwd, localeDir);
    this.readAndPushDirChildren(localeDirPath, resourceDir, runCwd);
  }

  async pushAllTranslations(
    resourceDir: ResourceDirContext | undefined,
    runCwd: string,
  ): Promise<ApiV1.UpsertTranslationResp | void> {
    // Error: not a translations directory
    if (resourceDir?.exists && resourceDir?.type !== "translation")
      return this.error(
        `${resourceDir.abspath} is not a translations directory.`,
      );

    if (resourceDir?.exists && resourceDir?.type === "translation") {
      // If we're already in a locale directory, we know how to find
      // the translations dir parent to get all of the translation files
      const translationsDir = path.dirname(resourceDir.abspath);
      const children = await fs.readdir(translationsDir);

      for (const childLocaleDir of children) {
        // eslint-disable-next-line no-await-in-loop
        const res = await this.pushTranslationsForLocale(
          undefined,
          translationsDir,
          childLocaleDir,
        );

        if (res?.errors) {
          break;
        }
      }

      return;
    }

    if (!resourceDir?.exists) {
      const children = await fs.readdir(runCwd);
      // The way we're checking that this is most likely the translations directory is by
      // checking that every directory name is a valid locale.
      const allValidLocales = children.every((child) => isValidLocale(child));

      if (!allValidLocales) {
        return this.error(
          `Cannot locate translation files within this directory or all translation directories do not have a valid locale name.`,
        );
      }

      for (const childLocaleDir of children) {
        // eslint-disable-next-line no-await-in-loop
        const res = await this.pushTranslationsForLocale(
          resourceDir,
          runCwd,
          childLocaleDir,
        );

        if (res?.errors) {
          break;
        }
      }
    }
  }

  async getTranslationFileContext(
    resourceDir: ResourceDirContext | undefined,
    runCwd: string,
    translationReference: string,
  ): Promise<TranslationFileContext> {
    // Error: missing the translation reference in the command
    if (!translationReference) {
      return this.error("Missing 1 required arg:\ntranslationReference");
    }

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

    const translationFileCtx = await buildTranslationFileCtx(
      dirPath,
      localeCode,
      namespace,
    );

    // Error if the filepath generated doesn't exist, otherwise return the translation context
    return translationFileCtx.exists
      ? translationFileCtx
      : this.error(
          `Cannot locate a translation file for \`${translationReference}\` in ${dirPath}`,
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
