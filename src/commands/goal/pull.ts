import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Goal from "@/lib/marshal/goal";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  ensureResourceDirForTarget,
  GoalDirContext,
  ResourceTarget,
} from "@/lib/run-context";

export default class GoalPull extends BaseCommand<typeof GoalPull> {
  static summary =
    "Pull one or more goals from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    all: Flags.boolean({
      summary: "Whether to pull all goals from the specified environment.",
    }),
    "goals-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all goals into.",
      dependsOn: ["all"],
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    goalKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags.all && args.goalKey) {
      return this.error(
        `goalKey arg \`${args.goalKey}\` cannot also be provided when using --all`,
      );
    }

    return flags.all ? this.pullAllGoals() : this.pullOneGoal();
  }

  async pullOneGoal(): Promise<void> {
    const { flags } = this.props;

    const dirContext = await this.getGoalDirContext();

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const prompt = `Create a new goal directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<ApiV1.GetGoalResp<WithAnnotation>>(() => {
      const props = merge(this.props, {
        args: { goalKey: dirContext.key },
        flags: { annotate: true },
      });

      return this.apiV1.getGoal(props);
    });

    await Goal.writeGoalDirFromData(dirContext, resp.data, {
      withSchema: true,
    });

    const action = dirContext.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`,
    );
  }

  async getGoalDirContext(): Promise<GoalDirContext> {
    const { goalKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;

    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "goal",
        key: goalKey,
      };

      return ensureResourceDirForTarget(resourceDir, target) as GoalDirContext;
    }

    const dirCtx = await resolveResourceDir(this.projectConfig, "goal", runCwd);

    if (goalKey) {
      const dirPath = path.resolve(dirCtx.abspath, goalKey);
      const exists = await Goal.isGoalDir(dirPath);

      return {
        type: "goal",
        key: goalKey,
        abspath: dirPath,
        exists,
      };
    }

    return this.error("Missing 1 required arg:\ngoalKey");
  }

  async pullAllGoals(): Promise<void> {
    const { flags } = this.props;

    const goalsIndexDirCtx = await resolveResourceDir(
      this.projectConfig,
      "goal",
      this.runContext.cwd,
    );

    const targetDirCtx = flags["goals-dir"] || goalsIndexDirCtx;

    const prompt = targetDirCtx.exists
      ? `Pull latest goals into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new goals directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start(`‣ Loading`);

    const goals = await this.listAllGoals();
    await Goal.writeGoalsIndexDir(targetDirCtx, goals, {
      withSchema: true,
    });
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} the goals directory at ${targetDirCtx.abspath} using ${scope}`,
    );
  }

  async listAllGoals(
    pageParams: Partial<PageInfo> = {},
    goalsFetchedSoFar: Goal.GoalData<WithAnnotation>[] = [],
  ): Promise<Goal.GoalData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listGoals<WithAnnotation>(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const goals = [...goalsFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllGoals({ after: pageInfo.after }, goals)
      : goals;
  }
}
