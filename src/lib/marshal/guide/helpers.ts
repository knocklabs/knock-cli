import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";
import { startCase } from "lodash";
import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktype,
  SerializedRenderResult,
} from "quicktype-core";

import { DirContext } from "@/lib/helpers/fs";
import { SupportedTypeLanguage } from "@/lib/helpers/typegen";
import { GuideDirContext, RunContext } from "@/lib/run-context";

import { GUIDE_JSON } from "./processor.isomorphic";
import { GuideActivationLocationRule, GuideData, GuideStepData } from "./types";

export const formatStatusWithSchedule = (guide: GuideData): string => {
  const baseStatus = guide.active ? "Active" : "Inactive";

  if (guide.active_from || guide.active_until) {
    const fromText = guide.active_from
      ? `from ${guide.active_from}`
      : "immediately";
    const untilText = guide.active_until
      ? `until ${guide.active_until}`
      : "with no end time";
    return `${baseStatus} (${fromText} ${untilText})`;
  }

  return baseStatus;
};

export const formatStep = (step: GuideStepData): string => {
  return `${step.schema_key} (${step.schema_variant_key})`;
};

export const formatActivationRules = (
  rules?: GuideActivationLocationRule[],
): string => {
  if (!rules || !Array.isArray(rules)) return "-";

  return rules
    .map(({ directive, pathname }) => `${directive} ${pathname}`)
    .join(", ");
};

export const guideJsonPath = (guideDirCtx: GuideDirContext): string =>
  path.resolve(guideDirCtx.abspath, GUIDE_JSON);

/*
 * Check for guide.json file and return the file path if present.
 */
export const lsGuideJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const guideJsonPath = path.resolve(dirPath, GUIDE_JSON);

  const exists = await fs.pathExists(guideJsonPath);
  return exists ? guideJsonPath : undefined;
};

/*
 * Evaluates whether the given directory path is a guide directory, by
 * checking for the presence of guide.json file.
 */
export const isGuideDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsGuideJson(dirPath));

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "guides-dir": DirContext | undefined;
  };
  args: {
    guideKey: string | undefined;
  };
};

type GuideDirTarget = {
  type: "guideDir";
  context: GuideDirContext;
};

type GuidesIndexDirTarget = {
  type: "guidesIndexDir";
  context: DirContext;
};

export type GuideCommandTarget = GuideDirTarget | GuidesIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
): Promise<GuideCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "guide") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Cannot accept both guide key arg and --all flag.
  if (flags.all && args.guideKey) {
    return ux.error(
      `guideKey arg \`${args.guideKey}\` cannot also be provided when using --all`,
    );
  }

  // --all flag is given, which means no guide key arg.
  if (flags.all) {
    // If --all flag used inside a guide directory, then require a guides
    // dir path.
    if (resourceDirCtx && !flags["guides-dir"]) {
      return ux.error("Missing required flag guides-dir");
    }

    // Targeting all guide dirs in the guides index dir.
    // TODO: Default to the knock project config first if present before cwd.
    const defaultToCwd = { abspath: runCwd, exists: true };
    const indexDirCtx = flags["guides-dir"] || defaultToCwd;

    return { type: "guidesIndexDir", context: indexDirCtx };
  }

  // Guide key arg is given, which means no --all flag.
  if (args.guideKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.guideKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.guideKey}\` inside another guide directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(runCwd, args.guideKey);

    const guideDirCtx: GuideDirContext = {
      type: "guide",
      key: args.guideKey,
      abspath: targetDirPath,
      exists: await isGuideDir(targetDirPath),
    };

    return { type: "guideDir", context: guideDirCtx };
  }

  // From this point on, we have neither a guide key arg nor --all flag.
  // If running inside a guide directory, then use that guide directory.
  if (resourceDirCtx) {
    return { type: "guideDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\nguideKey");
};

/*
 * Takes an array of guides and generate types from its content json schemas.
 */
const SCHEMA_TITLE_PREFIX = "Guide";

// Content types organized by guide key and type.
type ContentTypesMapping = {
  key: Record<string, string>;
  type: Record<string, Array<string>>;
};

export async function generateTypes(
  guides: GuideData[],
  targetLanguage: SupportedTypeLanguage,
): Promise<{
  result: SerializedRenderResult | undefined;
  count: number;
  mapping: ContentTypesMapping;
}> {
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

  let processedCount = 0;
  const mapping: ContentTypesMapping = { key: {}, type: {} };

  for (const guide of guides) {
    if (!guide.type) {
      continue;
    }

    // We only support single step guides at the moment.
    const step = (guide.steps || []).find((s) => s.json_schema);

    if (!step) {
      continue;
    }

    // Format the type name that quicktype can output exactly. It's important
    // that the names we format are used/preserved by quicktype as we create the
    // final mapping referencing these type names.
    // Example: `GuideBannerFourStep1Banner001Default`
    const typeName = [
      SCHEMA_TITLE_PREFIX,
      startCaseNoSpace(guide.key),
      startCaseNoSpace(step.ref),
      startCaseNoSpace(step.schema_key),
      startCaseNoSpace(step.schema_semver),
      startCaseNoSpace(step.schema_variant_key),
    ].join("");

    schemaInput.addSource({
      name: typeName,
      schema: JSON.stringify({ ...step.json_schema, title: typeName }),
    });

    mapping.key[guide.key] = typeName;

    mapping.type[guide.type] = [...(mapping.type[guide.type] || []), typeName];

    processedCount++;
  }

  if (processedCount === 0) {
    return { result: undefined, count: 0, mapping };
  }

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const result = await quicktype({
    inputData,
    lang: targetLanguage,
    allPropertiesOptional: false,
    alphabetizeProperties: true,
    rendererOptions: {
      "just-types": true,
      "no-extra-properties": true,
      "no-optional-null": true,
    },
  });

  return { result, count: processedCount, mapping };
}

const startCaseNoSpace = (key: string) => startCase(key).replace(/\s/g, "");

/*
 * For typescript, this writes a root type that maps out all guide types by
 * guide type and key.
 *
 * For example:
 *   type GuideContentByType = {
 *     "banner-one": GuideBannerOneStep1Banner001Default;
 *     "banner-two": GuideBannerTwoStep1Banner001Default;
 *     "card-one": GuideCardOneStep1Card001Default;
 *     "card-two": GuideCardTwoStep1Card001SingleAction;
 *     "changelog-card": GuideChangelogCardStep1ChangelogCard001SingleAction;
 *     "modal-one": GuideModalOneStep1Modal001MultiAction;
 *   };
 *
 *   type GuideContentByKey = {
 *     "banner": GuideBannerOneStep1Banner001Default | GuideBannerTwoStep1Banner001Default;
 *     "card": GuideCardOneStep1Card001Default | GuideCardTwoStep1Card001SingleAction;
 *     "changelog-card": GuideChangelogCardStep1ChangelogCard001SingleAction;
 *     "modal": GuideModalOneStep1Modal001MultiAction;
 *   };
 *
 *   export type GuideContentIndex = {
 *     key: GuideContentByType;
 *     type: GuideContentByKey;
 *   };
 */
const TS_INDEX_TYPE_PREFIX = "GuideContent";

export const generateIndexTypeTS = (
  mapping: ContentTypesMapping,
): Array<string> => {
  const lines: Array<string> = [];

  // Define the type for sub index by guide key.
  const byKey = `${TS_INDEX_TYPE_PREFIX}ByKey`;
  lines.push(`\ntype ${byKey} = {`);

  for (const [key, val] of Object.entries(mapping.key)) {
    lines.push(`  "${key}": ${val};`);
  }

  lines.push("};");

  // Define the type for sub index by guide type.
  const byType = `${TS_INDEX_TYPE_PREFIX}ByType`;
  lines.push(`\ntype ${byType} = {`);

  for (const [key, val] of Object.entries(mapping.type)) {
    lines.push(`  "${key}": ${(val || []).join(" | ")};`);
  }

  lines.push(
    "};",
    `\nexport type ${TS_INDEX_TYPE_PREFIX}Index = {`,
    `  key: ${byKey};`,
    `  type: ${byType};`,
    "};",
  );

  return lines;
};
