import { Flags, ux } from "@oclif/core";

import ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { DirContext } from "@/lib/helpers/fs";
import {
  resolveConfigDir,
  resolveKnockSubdir,
} from "@/lib/helpers/project-config";
import { promptToConfirm } from "@/lib/helpers/ux";
import { pullDataSources } from "@/lib/marshal/data-source";

type ConfigTypePull = {
  flag: string;
  subdir: string;
  pull: (ctx: {
    apiV1: ApiV1;
    typeDir: DirContext;
    environment?: string;
    log: (msg: string) => void;
  }) => Promise<void>;
};

const CONFIG_TYPES: ConfigTypePull[] = [
  {
    flag: "data-sources",
    subdir: "data-sources",
    pull: pullDataSources,
  },
];

const CONFIG_TYPE_FLAGS = CONFIG_TYPES.map((type) => type.flag);

const resolveConfigTypes = (typeFlag?: string): ConfigTypePull[] => {
  if (!typeFlag) {
    return CONFIG_TYPES;
  }

  const configType = CONFIG_TYPES.find((type) => type.flag === typeFlag);

  if (!configType) {
    throw new Error(
      `Unknown config type \`${typeFlag}\`. Expected one of: ${CONFIG_TYPE_FLAGS.join(
        ", ",
      )}`,
    );
  }

  return [configType];
};

export default class ConfigPull extends BaseCommand<typeof ConfigPull> {
  static summary =
    "Pull account-level configuration from Knock into a local file system.";

  static flags = {
    "knock-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull config into.",
      required: false,
    }),
    type: Flags.string({
      summary: "Pull a single config type.",
      options: CONFIG_TYPE_FLAGS,
    }),
    environment: Flags.string({
      summary:
        "Only pull settings for the given environment (merged into existing local files).",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    const configDirCtx = await resolveConfigDir(
      flags["knock-dir"],
      this.projectConfig,
    );

    if (!configDirCtx) {
      this.error(
        "No knock directory specified. Either provide --knock-dir flag or run `knock init` to create a knock.json configuration file.",
      );
    }

    let configTypes;

    try {
      configTypes = resolveConfigTypes(flags.type);
    } catch (error) {
      return ux.error((error as Error).message);
    }

    const prompt = configDirCtx.exists
      ? `Pull latest config into ${configDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new config directory at ${configDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    for (const configType of configTypes) {
      // eslint-disable-next-line no-await-in-loop
      const typeDirCtx = await resolveKnockSubdir(
        configDirCtx,
        configType.subdir,
      );

      // eslint-disable-next-line no-await-in-loop
      await configType.pull({
        apiV1: this.apiV1,
        typeDir: typeDirCtx,
        environment: flags.environment,
        log: (msg) => this.log(msg),
      });
    }
  }
}
