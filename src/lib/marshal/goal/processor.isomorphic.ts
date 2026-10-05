import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { prepareResourceJson } from "../shared/helpers.isomorphic";
import { GoalData } from "./types";

export const GOAL_JSON = "goal.json";

export type GoalDirBundle = {
  [relpath: string]: string | Record<string, unknown>;
};

export const buildGoalDirBundle = (
  remoteGoal: GoalData<WithAnnotation>,
  _localGoal?: AnyObj,
  $schema?: string,
): GoalDirBundle => {
  return {
    [GOAL_JSON]: prepareResourceJson(remoteGoal, $schema),
  };
};
