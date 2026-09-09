import { GoalData } from "./types";

export const buildNewGoal = (key: string): GoalData => {
  return {
    key,
    name: key,
    description: "",
    target: {
      type: "count",
      threshold: 100,
    },
    window: {
      size: 7,
      unit: "days",
    },
    tags: [],
    environment: "development",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sha: "",
  };
};
