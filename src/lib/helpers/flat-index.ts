import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { JsonSyntaxError, SourceError } from "@/lib/helpers/error";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES, readJson } from "@/lib/helpers/json";
import { AnyObj } from "@/lib/helpers/object.isomorphic";

export type FlatIndexEntry = {
  key: string;
  content: AnyObj;
  filePath: string;
};

export type FlatIndexWriteOptions<T> = {
  getKey: (item: T) => string;
  serialize: (item: T, local?: AnyObj) => Record<string, unknown>;
};

export const pruneFlatIndexDir = async (
  typeDir: DirContext,
  remoteKeys: string[],
): Promise<void> => {
  if (!typeDir.exists) {
    return;
  }

  const remoteKeysByLowercase = Object.fromEntries(
    remoteKeys.map((key) => [key.toLowerCase(), key]),
  );

  const dirents = await fs.readdir(typeDir.abspath, { withFileTypes: true });

  const promises = dirents.map(async (dirent) => {
    const direntPath = path.resolve(typeDir.abspath, dirent.name);

    if (dirent.isDirectory()) {
      await fs.remove(direntPath);
      return;
    }

    if (!dirent.isFile() || !dirent.name.endsWith(".json")) {
      return;
    }

    const key = dirent.name.replace(/\.json$/, "");
    if (remoteKeysByLowercase[key.toLowerCase()]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

export const writeFlatIndexDir = async <T>(
  typeDir: DirContext,
  items: T[],
  options: FlatIndexWriteOptions<T>,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    await fs.ensureDir(typeDir.abspath);

    if (typeDir.exists) {
      await fs.copy(typeDir.abspath, backupDirPath);
      await pruneFlatIndexDir(
        typeDir,
        items.map((item) => options.getKey(item)),
      );
    }

    await Promise.all(
      items.map(async (item) => {
        const key = options.getKey(item);
        const filePath = path.resolve(typeDir.abspath, `${key}.json`);

        let local: AnyObj | undefined;
        if (await fs.pathExists(filePath)) {
          [local] = await readJson(filePath);
        }

        const content = options.serialize(item, local);
        await fs.outputJson(filePath, content, { spaces: DOUBLE_SPACES });
      }),
    );
  } catch (error) {
    if (typeDir.exists) {
      await fs.emptyDir(typeDir.abspath);
      await fs.copy(backupDirPath, typeDir.abspath);
    } else {
      await fs.remove(typeDir.abspath);
    }

    throw error;
  } finally {
    await fs.remove(backupDirPath);
  }
};

export const writeFlatIndexFile = async (
  typeDir: DirContext,
  key: string,
  content: Record<string, unknown>,
): Promise<void> => {
  await fs.ensureDir(typeDir.abspath);
  const filePath = path.resolve(typeDir.abspath, `${key}.json`);
  await fs.outputJson(filePath, content, { spaces: DOUBLE_SPACES });
};

export const readFlatIndexFile = async (
  typeDir: DirContext,
  key: string,
): Promise<AnyObj | undefined> => {
  const filePath = path.resolve(typeDir.abspath, `${key}.json`);

  if (!(await fs.pathExists(filePath))) {
    return undefined;
  }

  const [content] = await readJson(filePath);
  return content;
};

export const readFlatIndexDir = async (
  typeDir: DirContext,
): Promise<[FlatIndexEntry[], SourceError[]]> => {
  if (!typeDir.exists) {
    return [[], []];
  }

  const dirents = await fs.readdir(typeDir.abspath, { withFileTypes: true });
  const entries: FlatIndexEntry[] = [];
  const errors: SourceError[] = [];

  await Promise.all(
    dirents.map(async (dirent) => {
      if (!dirent.isFile() || !dirent.name.endsWith(".json")) {
        return;
      }

      const filePath = path.resolve(typeDir.abspath, dirent.name);
      const key = dirent.name.replace(/\.json$/, "");
      const [content, parseErrors] = await readJson(filePath);

      if (parseErrors.length > 0) {
        errors.push(
          ...parseErrors.map(
            (error: JsonSyntaxError) =>
              new SourceError(error.message, filePath, error.name),
          ),
        );
        return;
      }

      if (!content) {
        return;
      }

      if (content.key && content.key !== key) {
        errors.push(
          new SourceError(
            `File name \`${key}.json\` does not match key \`${content.key}\``,
            filePath,
          ),
        );
        return;
      }

      entries.push({
        key,
        content: { ...content, key },
        filePath,
      });
    }),
  );

  entries.sort((a, b) => a.key.localeCompare(b.key));

  return [entries, errors];
};
