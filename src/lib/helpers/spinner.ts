import { CliUx } from "@oclif/core";

import { isTestEnv } from "./env";

export const start = (action: string): void => {
  if (!isTestEnv) CliUx.ux.action.start(action);
};

export const stop = (): void => CliUx.ux.action.stop();
