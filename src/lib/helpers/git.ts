import { execSync } from "node:child_process";

/**
 * Checks if a given file is ignored by Git by running `git check-ignore`
 * from the specified directory.
 *
 * @param currDir the directory to run `git check-ignore` from
 * @param filePath the path to the file to check
 * @returns `true` if the file is ignored by Git, `false` otherwise
 */
export const isFileIgnoredByGit = async (
  currDir: string,
  filePath: string,
): Promise<boolean> => {
  try {
    execSync(`git check-ignore "${filePath}"`, {
      cwd: currDir,
      // Suppress output since we only care about exit status
      stdio: "pipe",
    });

    // If we reach here, git check-ignore returned exit status 0 (file is ignored)
    // See https://git-scm.com/docs/git-check-ignore#_exit_status
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets the name of the current Git branch.
 *
 * @returns the current Git branch name, or `undefined` if not in a Git repository
 */
export const getCurrentGitBranch = (): string | undefined => {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();

    return branch;
  } catch {
    return undefined;
  }
};
