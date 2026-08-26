import { MaybeWithAnnotation } from "../shared/types";

export type GoalAttachment = {
  type: "goal";
  goal_key: string;
};

export type GoalTarget = {
  type: string;
  expression?: string;
  threshold?: number;
  unit?: string;
};

export type GoalWindow = {
  size: number;
  unit: string;
};

export type GoalData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  name: string;
  description?: string;
  target: GoalTarget;
  window: GoalWindow;
  tags?: string[];
  archived?: boolean;
  environment: string;
  created_at: string;
  updated_at: string;
  sha: string;
};
