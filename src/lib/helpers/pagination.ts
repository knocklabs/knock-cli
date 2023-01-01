import { CliUx, Flags } from "@oclif/core";
import { pick } from "lodash";

import { AnyObj } from "@/lib/helpers/object";

export type PageInfo = {
  after: string | null;
  before: string | null;
  page_size: number;
};

export type Paginated<T = any> = {
  entries: T[];
  page_info: PageInfo;
};

export const paginationFlags = {
  after: Flags.string(),
  before: Flags.string(),
  limit: Flags.integer({ max: 100 }),
};

type PageParams = {
  after?: string;
  before?: string;
  limit?: number;
};

export const toPageParams = (flags: AnyObj): PageParams => {
  return pick(flags, Object.keys(paginationFlags));
};

export enum PageAction {
  Previous = "p",
  Next = "n",
}

/*
 * Format a prompt text to show available page actions.
 * e.g. [p: preview, n: next]
 */
const formatPageActionPrompt = (pageInfo: PageInfo): string | undefined => {
  const options = [
    pageInfo.before && `${PageAction.Previous}: previous`,
    pageInfo.after && `${PageAction.Next}: next`,
  ].filter((x) => x);

  return options.length > 0 ? `[${options.join(", ")}]` : undefined;
};

/*
 * Validate a prompt input for a page action based on available options and
 * return if valid.
 */
const validatePageActionInput = (
  input: string,
  pageInfo: PageInfo,
): PageAction | undefined => {
  const val = input.toLowerCase().trim();

  if (pageInfo.after && val === PageAction.Next) {
    return PageAction.Next;
  }

  if (pageInfo.before && val === PageAction.Previous) {
    return PageAction.Previous;
  }
};

/*
 * Present a page action prompt if available, validate the prompt input,
 * and return the corresponding page params based on the valid page action.
 */
export const handlePageActionPrompt = async (
  pageInfo: PageInfo,
): Promise<PageParams | undefined> => {
  // If there is a next or prev page, display a prompt to take a user input.
  const prompt = formatPageActionPrompt(pageInfo);
  if (!prompt) return;

  const input = await CliUx.ux.prompt(`? ${prompt}`, { required: false });
  const validAction = validatePageActionInput(input, pageInfo);

  switch (validAction) {
    case PageAction.Previous:
      return { before: pageInfo.before! };

    case PageAction.Next:
      return { after: pageInfo.after! };

    default:
  }
};

// Exported for tests.
export { formatPageActionPrompt, validatePageActionInput };
