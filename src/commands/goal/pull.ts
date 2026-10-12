import * as path from "node:path";

import KnockMgmt from "@knocklabs/mgmt";
import { Args, Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { formatMgmtError } from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Goal from "@/lib/marshal/goal";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
    ensureResourceDirForTarget,
    GoalDirContext,
    ResourceTarget,
} from "@/lib/run-context";

const toGoalApiError = (error: unknown): ApiError => {
  if (error instanceof KnockMgmt.APIError) {
    const code =
      error.error &&
      typeof error.error === "object" &&
      "code" in error.error &&
      typeof (error.error as { code?: unknown }).code === "string"
        ? (error.error as { code: string }).code
        : undefined;

    return new ApiError(formatMgmtError(error), error.status, code);
  }

  return new ApiError((error as Error).message);
};

export default class GoalPull extends BaseCommand<typeof GoalPull> {
  static summary =
    "Pull one or more goals from an environment into a local file system.";

  static flags = {
    environment: CustomFlags.environment,
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

    spinner.start("‣ Loading");

    try {
      const goal = await this.apiV1.mgmtClient.goals.retrieve(dirContext.key, {
        environment: flags.environment,
        annotate: true,
      });

      await Goal.writeGoalDirFromData(
        dirContext,
        goal as Goal.GoalData<WithAnnotation>,
        { withSchema: true },
      );

      spinner.stop();

      const action = dirContext.exists ? "updated" : "created";
      const scope = formatCommandScope(flags);
      this.log(
        `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`,
      );
    } catch (error) {
      spinner.stop();
      ux.error(toGoalApiError(error));
    }
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

    try {
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
    } catch (error) {
      spinner.stop();
      ux.error(toGoalApiError(error));
    }
  }

  async listAllGoals(): Promise<Goal.GoalData<WithAnnotation>[]> {
    const { flags } = this.props;
    const goals: Goal.GoalData<WithAnnotation>[] = [];

    for await (const goal of this.apiV1.mgmtClient.goals.list({
      environment: flags.environment,
      annotate: true,
    })) {
      goals.push(goal as Goal.GoalData<WithAnnotation>);
    }

    return goals;
  }
}
