import * as path from "node:path";

import enquirer from "enquirer";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import {
  PROJECT_CONFIG_FILE_NAME,
  ResourceDirectoriesByType,
} from "@/lib/helpers/project-config";

export default class Init extends BaseCommand<typeof Init> {
  protected requiresAuth = false;

  static summary =
    "Initialize a new Knock project with a knock.json configuration file.";

  static description =
    "Creates a knock.json configuration file in the current directory " +
    "to store project-level settings like the knock resources directory.";

  public async run(): Promise<void> {
    const configPath = path.resolve(process.cwd(), PROJECT_CONFIG_FILE_NAME);

    // 1. Check if knock.json already exists
    const configExists = await fs.pathExists(configPath);
    if (configExists) {
      this.error(
        `A ${PROJECT_CONFIG_FILE_NAME} file already exists in this directory. Aborting.`,
      );
    }

    // 2. Prompt user for the knock directory location
    const { knockDir } = await enquirer.prompt<{ knockDir: string }>({
      type: "input",
      name: "knockDir",
      message: "Where do you want to store your Knock resources?",
      initial: ".knock",
    });

    // 3. Create the knock directory and resource subdirectories
    const knockDirPath = path.resolve(process.cwd(), knockDir);
    await fs.ensureDir(knockDirPath);

    // Create resource subdirectories with .gitignore files
    for (const resourceDir of Object.values(ResourceDirectoriesByType)) {
      const resourceDirPath = path.resolve(knockDirPath, resourceDir);

      // eslint-disable-next-line no-await-in-loop
      await fs.ensureDir(resourceDirPath);

      // Create a .gitignore file in each resource directory
      const gitignorePath = path.resolve(resourceDirPath, ".gitignore");

      // eslint-disable-next-line no-await-in-loop
      await fs.writeFile(gitignorePath, "");
    }

    // 4. Write the knock.json configuration file
    await fs.outputJson(
      configPath,
      {
        $schema: "https://schemas.knock.app/cli/knock.json",
        knockDir,
      },
      { spaces: 2 },
    );

    this.log(`‣ Successfully initialized Knock project at ${process.cwd()}`);
    this.log(`‣ Resources directory: ${knockDir}`);
  }
}
