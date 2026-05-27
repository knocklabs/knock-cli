import {
  readFlatIndexFile,
  writeFlatIndexDir,
  writeFlatIndexFile,
} from "@/lib/helpers/flat-index";
import { DirContext } from "@/lib/helpers/fs";
import { AnyObj } from "@/lib/helpers/object.isomorphic";

import {
  buildDataSourceFileContent,
  DATA_SOURCE_SCHEMA,
  mergeEnvironmentSettings,
} from "./processor.isomorphic";
import { DataSourceData } from "./types";

type WriteOpts = {
  environment?: string;
  withSchema?: boolean;
};

export const writeDataSourcesIndexDir = async (
  typeDir: DirContext,
  remoteDataSources: DataSourceData[],
  options?: WriteOpts,
): Promise<void> => {
  const { withSchema = false } = options || {};

  return writeFlatIndexDir(typeDir, remoteDataSources, {
    getKey: (dataSource) => dataSource.key,
    serialize: (dataSource, local) =>
      buildDataSourceFileContent(
        dataSource,
        local,
        withSchema ? DATA_SOURCE_SCHEMA : undefined,
      ),
  });
};

export const writeDataSourceFile = async (
  typeDir: DirContext,
  remoteDataSource: DataSourceData,
  options?: WriteOpts,
): Promise<void> => {
  const { environment, withSchema = false } = options || {};

  if (environment) {
    const local = await readFlatIndexFile(typeDir, remoteDataSource.key);
    const remoteSlice =
      remoteDataSource.environment_settings[environment] ?? null;

    const content = local
      ? mergeEnvironmentSettings(local, environment, remoteSlice)
      : buildDataSourceFileContent(
          remoteDataSource,
          undefined,
          withSchema ? DATA_SOURCE_SCHEMA : undefined,
        );

    await writeFlatIndexFile(typeDir, remoteDataSource.key, content as AnyObj);
    return;
  }

  const content = buildDataSourceFileContent(
    remoteDataSource,
    undefined,
    withSchema ? DATA_SOURCE_SCHEMA : undefined,
  );

  await writeFlatIndexFile(typeDir, remoteDataSource.key, content);
};
