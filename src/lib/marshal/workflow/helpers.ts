import { take } from "lodash";

import { WorkflowPayload } from "./types";

type FormatCategoriesOpts = {
  truncateAfter?: number;
  emptyDisplay?: string;
}

export const formatCategories = (workflow: WorkflowPayload, opts: FormatCategoriesOpts = {}): string => {
  const { categories } = workflow;
  const { truncateAfter: limit, emptyDisplay = "" } = opts;

  if (!categories) return emptyDisplay;

  const count = categories.length;
  if (!limit || limit >= count) return categories.join(", ");

  return take(categories, limit).join(", ") + ` (+ ${count - limit} more)`;
}
