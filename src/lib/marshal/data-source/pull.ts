import ApiV1 from "@/lib/api-v1";
import { ApiError } from "@/lib/helpers/error";
import { DirContext } from "@/lib/helpers/fs";
import { spinner } from "@/lib/helpers/ux";

import { writeDataSourceFile, writeDataSourcesIndexDir } from "./writer";

export type PullDataSourcesContext = {
  apiV1: ApiV1;
  typeDir: DirContext;
  environment?: string;
  log: (msg: string) => void;
};

export const pullDataSources = async (
  ctx: PullDataSourcesContext,
): Promise<void> => {
  spinner.start("‣ Loading data sources");

  try {
    const entries = await ctx.apiV1.listAllDataSources();

    if (entries.length === 0) {
      spinner.stop();
      ctx.log("‣ No data sources found");
      return;
    }

    if (ctx.environment) {
      for (const { key } of entries) {
        // eslint-disable-next-line no-await-in-loop
        const remote = await ctx.apiV1.getDataSource(key, ctx.environment);
        // eslint-disable-next-line no-await-in-loop
        await writeDataSourceFile(ctx.typeDir, remote, {
          environment: ctx.environment,
          withSchema: true,
        });
      }
    } else {
      const environmentSlugs = await ctx.apiV1.listAccountEnvironmentSlugs();
      const remoteDataSources = await Promise.all(
        entries.map(({ key }) =>
          ctx.apiV1.getDataSourceAllEnvs(key, environmentSlugs),
        ),
      );

      await writeDataSourcesIndexDir(ctx.typeDir, remoteDataSources, {
        withSchema: true,
      });
    }

    spinner.stop();

    const action = ctx.typeDir.exists ? "updated" : "created";
    const scope = ctx.environment
      ? `\`${ctx.environment}\` environment`
      : "all environments";

    ctx.log(
      `‣ Successfully ${action} ${entries.length} data source(s) at ${ctx.typeDir.abspath} using ${scope}`,
    );
  } catch (error) {
    spinner.stop();
    throw new ApiError((error as Error).message);
  }
};
