import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import { AnyObj } from "@/lib/helpers/object.isomorphic";
import {
  ProjectConfig,
  resolveResourceDir,
} from "@/lib/helpers/project-config";
import { ReusableRequestDirContext, RunContext } from "@/lib/run-context";

import { REUSABLE_REQUEST_JSON } from "./processor.isomorphic";
import { ReusableRequestInput } from "./types";

const REUSABLE_REQUEST_KEY_RE = /^[\d_a-z-]+$/;
const REUSABLE_REQUEST_KEY_MIN = 3;
const REUSABLE_REQUEST_KEY_MAX = 255;

export const reusableRequestJsonPath = (
  reusableRequestDirCtx: ReusableRequestDirContext,
): string => path.resolve(reusableRequestDirCtx.abspath, REUSABLE_REQUEST_JSON);

/*
 * Check for reusable_request.json and return the file path if present.
 */
export const lsReusableRequestJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const jsonPath = path.resolve(dirPath, REUSABLE_REQUEST_JSON);

  const exists = await fs.pathExists(jsonPath);
  return exists ? jsonPath : undefined;
};

/*
 * Evaluates whether the given directory path is a reusable request
 * directory, by checking for the presence of reusable_request.json.
 */
export const isReusableRequestDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsReusableRequestJson(dirPath));

/*
 * Validates a reusable request key. Keys must be 3 to 255 characters and
 * match ^[a-z0-9_-]+$.
 */
export const validateReusableRequestKey = (
  input: string,
): string | undefined => {
  if (
    input.length < REUSABLE_REQUEST_KEY_MIN ||
    input.length > REUSABLE_REQUEST_KEY_MAX ||
    !REUSABLE_REQUEST_KEY_RE.test(input)
  ) {
    return "must be 3 to 255 characters and include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

const REQUEST_BODY_FIELDS = [
  "type",
  "settings",
  "name",
  "description",
  "conditions",
] as const;

/*
 * Builds the upsert/validate body from local JSON. Drops key and server
 * fields that are not part of ReusableRequestRequest.
 */
export const toReusableRequestInput = (
  content: AnyObj,
): ReusableRequestInput => {
  const input: AnyObj = {};

  for (const field of REQUEST_BODY_FIELDS) {
    if (content[field] !== undefined) {
      input[field] = content[field];
    }
  }

  return input as ReusableRequestInput;
};

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "reusable-requests-dir": DirContext | undefined;
  };
  args: {
    reusableRequestKey: string | undefined;
  };
};
type ReusableRequestDirTarget = {
  type: "reusableRequestDir";
  context: ReusableRequestDirContext;
};
type ReusableRequestsIndexDirTarget = {
  type: "reusableRequestsIndexDir";
  context: DirContext;
};
export type ReusableRequestCommandTarget =
  | ReusableRequestDirTarget
  | ReusableRequestsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
  projectConfig?: ProjectConfig,
): Promise<ReusableRequestCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "reusable_request") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Cannot accept both reusable request key arg and --all flag.
  if (flags.all && args.reusableRequestKey) {
    return ux.error(
      `reusableRequestKey arg \`${args.reusableRequestKey}\` cannot also be provided when using --all`,
    );
  }

  const reusableRequestsIndexDirCtx = await resolveResourceDir(
    projectConfig,
    "reusable_request",
    runCwd,
  );

  if (flags.all) {
    if (resourceDirCtx && !flags["reusable-requests-dir"]) {
      return ux.error("Missing required flag reusable-requests-dir");
    }

    return {
      type: "reusableRequestsIndexDir",
      context: flags["reusable-requests-dir"] || reusableRequestsIndexDirCtx,
    };
  }

  if (args.reusableRequestKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.reusableRequestKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.reusableRequestKey}\` inside another reusable request directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(
          reusableRequestsIndexDirCtx.abspath,
          args.reusableRequestKey,
        );

    const reusableRequestDirCtx: ReusableRequestDirContext = {
      type: "reusable_request",
      key: args.reusableRequestKey,
      abspath: targetDirPath,
      exists: await isReusableRequestDir(targetDirPath),
    };

    return { type: "reusableRequestDir", context: reusableRequestDirCtx };
  }

  if (resourceDirCtx?.type === "reusable_request") {
    return { type: "reusableRequestDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\nreusableRequestKey");
};
