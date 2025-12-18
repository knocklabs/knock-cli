import * as os from "node:os";
import path from "node:path";

import { default as degit } from "degit";
import * as fs from "fs-extra";

const DEFAULT_ORG = "knocklabs";
const DEFAULT_REPO = "templates";

const TEMP_DIR_PREFIX = "knock-cli-templates";

/*
Accepts a template string, like `knocklabs/templates/workflows/my-workflow` and resolves
it back to a Github repo URL, like `https://github.com/knocklabs/templates/workflows/my-workflow`.
*/
export function resolveTemplate(templateString: string): {
  org: string;
  repo: string;
  subdir: string;
} {
  const parts = templateString.split("/");

  let org;
  let repo;
  let subdir;

  if (parts.length === 2) {
    // workflows/some-workflow
    org = DEFAULT_ORG;
    repo = DEFAULT_REPO;
    subdir = parts.join("/");
  }

  if (parts.length === 4) {
    // knocklabs/templates/workflows/some-workflow
    org = parts[0];
    repo = parts[1];
    subdir = parts.slice(2).join("/");
  }

  if (!org || !repo || !subdir) {
    throw new Error(
      `Invalid template string: ${templateString}. Expected format: org/repo/subdir`,
    );
  }

  return { org, repo, subdir };
}

function buildSource(
  org: string,
  repo: string,
  subdir?: string,
  branch = "main",
) {
  const base = `${org}/${repo}`;

  if (subdir) {
    return `${base}/${subdir}#${branch}`;
  }

  return `${base}#${branch}`;
}

export async function downloadTemplate(
  templateString: string,
): Promise<string> {
  const { org, repo, subdir } = resolveTemplate(templateString);

  const source = buildSource(org, repo, subdir);

  // Create temp directory for template
  const tempDir = path.join(
    os.tmpdir(),
    TEMP_DIR_PREFIX,
    `${org}-${repo}-${subdir.replace(/\//g, "-")}-${Date.now()}`,
  );

  await fs.ensureDir(tempDir);

  try {
    const emitter = degit(source, {
      cache: false,
      force: true,
      verbose: false,
    });

    await emitter.clone(tempDir);

    return tempDir;
  } catch (error) {
    await fs.remove(tempDir);
    throw new Error(
      `Failed to download template: ${
        error instanceof Error ? error.message : "Unknown error"
      }\n\nSource: ${source}`,
    );
  }
}

export async function cleanupTempDir(
  tempDir: string | undefined,
): Promise<void> {
  if (tempDir && tempDir.includes(TEMP_DIR_PREFIX)) {
    await fs.remove(tempDir);
  }
}
