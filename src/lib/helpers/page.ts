import { Flags } from "@oclif/core";
import enquirer from "enquirer";
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

export const pageFlags = {
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
  return pick(flags, Object.keys(pageFlags));
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
    pageInfo.before && `${PageAction.Previous}: previous page`,
    pageInfo.after && `${PageAction.Next}: next page`,
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
 * Presents a page action prompt if available, and returns a valid page action
 * from the input.
 */
export const maybePromptPageAction = async (
  pageInfo: PageInfo,
): Promise<PageAction | undefined> => {
  const message = formatPageActionPrompt(pageInfo);
  if (!message) return;

  try {
    const answer = await enquirer.prompt<{ input: string }>({
      type: "input",
      name: "input",
      message,
    });

    return validatePageActionInput(answer.input, pageInfo);
  } catch (error) {
    console.log(error);
    return undefined;
  }
};

/*
 * Returns a page params object based on the page action and page info.
 */
export const paramsForPageAction = (
  pageAction: PageAction,
  pageInfo: PageInfo,
): PageParams | undefined => {
  switch (pageAction) {
    case PageAction.Previous:
      return { before: pageInfo.before! };

    case PageAction.Next:
      return { after: pageInfo.after! };

    default:
  }
};

// Exported for tests.
export { formatPageActionPrompt, validatePageActionInput };
