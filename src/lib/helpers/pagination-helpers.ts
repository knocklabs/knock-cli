import { Flags, Interfaces } from "@oclif/core";
import { pick } from "lodash";

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

export const toPaginationParams = (
  flags: Pick<Interfaces.ParserOutput, "flags">,
) => {
  return pick(flags, Object.keys(paginationFlags));
};

export enum PageAction {
  Previous = "p",
  Next = "n",
}

export const formatPageActionPrompt = (pageInfo: PageInfo) => {
  const options = [
    pageInfo.before && `${PageAction.Previous}: previous`,
    pageInfo.after && `${PageAction.Next}: next`,
  ].filter((x) => x);

  return options.length
    ? `[${options.join(", ")}]`
    : undefined;
};

export const validatePageActionInput = (input: string, pageInfo: PageInfo) => {
  const val = input.toLowerCase().trim();

  if (pageInfo.after && val === PageAction.Next) {
    return PageAction.Next;
  }

  if (pageInfo.before && val === PageAction.Previous) {
    return PageAction.Previous;
  }
};
