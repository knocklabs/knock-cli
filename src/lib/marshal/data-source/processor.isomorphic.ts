import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { DataSourceData } from "./types";

export const DATA_SOURCE_SCHEMA =
  "https://schemas.knock.app/cli/data-source.json";

export const mergeEnvironmentSettings = (
  local: AnyObj,
  environment: string,
  remoteSlice: unknown,
): AnyObj => {
  const environmentSettings = {
    ...(local.environment_settings as Record<string, unknown>),
    [environment]: remoteSlice,
  };

  return {
    ...local,
    environment_settings: environmentSettings,
  };
};

export const buildDataSourceFileContent = (
  remoteDataSource: DataSourceData,
  localDataSource?: AnyObj,
  $schema?: string,
): AnyObj => {
  const content: AnyObj = { ...remoteDataSource };

  if ($schema) {
    content.$schema = $schema;
  } else if (localDataSource?.$schema) {
    content.$schema = localDataSource.$schema;
  }

  return content;
};
