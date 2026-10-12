import { GoalDirContext } from "@/lib/run-context";

import { GOAL_JSON, GoalDirBundle } from "./processor.isomorphic";
import { writeGoalDirFromBundle } from "./writer";

type NewGoalAttrs = {
  name: string;
  description?: string;
};

/*
 * Scaffolds a new goal directory bundle with a source-event condition.
 */
const scaffoldGoalDirBundle = (attrs: NewGoalAttrs): GoalDirBundle => {
  const goalJson: Record<string, unknown> = {
    name: attrs.name,
    condition: {
      event: {
        event_type: "integration_source",
        event_key: "",
        integration_source_key: "",
        recipient_path: "body.userId",
      },
    },
  };

  if (attrs.description) {
    goalJson.description = attrs.description;
  }

  return {
    [GOAL_JSON]: goalJson,
  };
};

/*
 * Generates a new goal directory with a scaffolded goal.json file.
 */
export const generateGoalDir = async (
  goalDirCtx: GoalDirContext,
  attrs: NewGoalAttrs,
): Promise<void> => {
  const bundle = scaffoldGoalDirBundle(attrs);

  return writeGoalDirFromBundle(goalDirCtx, bundle);
};

export { scaffoldGoalDirBundle };
