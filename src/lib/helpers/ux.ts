import { ux } from "@oclif/core";
import enquirer from "enquirer";

import { isTestEnv } from "./const";
import { getCurrentGitBranch } from "./git";
import { slugify } from "./string";

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

export const promptForBranchSlug = async (): Promise<string | undefined> => {
  const gitBranch = getCurrentGitBranch();
  const initial = gitBranch ? slugify(gitBranch) : undefined;

  try {
    const response = await enquirer.prompt<{ slug: string }>({
      type: "input",
      name: "slug",
      message: "Branch slug",
      initial,
      validate: (value: string) => {
        const slugified = slugify(value);
        if (!slugified) {
          return "Invalid slug provided";
        }

        return true;
      },
    });

    return slugify(response.slug);
  } catch {
    return undefined;
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
