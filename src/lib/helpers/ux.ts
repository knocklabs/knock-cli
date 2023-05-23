import { ux } from "@oclif/core";
import enquirer from "enquirer";

import { isTestEnv } from "./const";

export const promptToConfirm = async (
  message: string,
): Promise<string | undefined> => {
  try {
    const { input } = await enquirer.prompt<{ input: string }>({
      type: "confirm",
      name: "input",
      message,
    });
    return input;
  } catch (error) {
    console.log(error);
  }
};

export const spinner = {
  start(action: string): void {
    if (!isTestEnv) ux.action.start(action);
  },
  stop(): void {
    ux.action.stop();
  },
};
