import { ux } from "@oclif/core";

import { isSoftFailableBulkError } from "@/lib/helpers/error";
import {
  NonHiddenResourceType,
  RESOURCE_CLI_CAPABILITIES,
  RESOURCE_SUBDIRS,
} from "@/lib/resources";

/**
 * Runs one resource command from bulk `knock pull` / `knock push`.
 *
 * Gate and scope failures for soft-fail resources warn and continue. Nested
 * `Command.run()` sets `process.exitCode` in oclif `catch()` before rethrowing,
 * so a swallowed error has to restore the previous code or the parent command
 * exits failed after every other resource succeeds.
 *
 * @param resourceType - Resource whose command is running
 * @param run - Nested resource command
 * @returns Resolves when the command succeeds or a soft-failable error is skipped
 */
export const runBulkResourceCommand = async (
  resourceType: NonHiddenResourceType,
  run: () => Promise<unknown>,
): Promise<void> => {
  const exitCodeBefore = process.exitCode;

  try {
    await run();
  } catch (error) {
    if (
      RESOURCE_CLI_CAPABILITIES[resourceType].softFailOnBulk &&
      isSoftFailableBulkError(error)
    ) {
      process.exitCode = exitCodeBefore;
      ux.warn(
        `Skipping ${RESOURCE_SUBDIRS[resourceType]}: ${
          (error as Error).message
        }`,
      );
      return;
    }

    throw error;
  }
};
