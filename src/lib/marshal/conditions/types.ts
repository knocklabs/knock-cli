export type Condition = {
  variable: string;
  operator: string;
  argument: string;
};

export type NestedConditions = {
  any?: Condition[];
  all?: Condition[];
};

export type Conditions = {
  any?: Condition[] | NestedConditions[];
  all?: Condition[] | NestedConditions[];
};
