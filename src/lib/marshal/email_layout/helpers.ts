import { take } from "lodash";

import { EmailLayoutData } from "./types";

type FormatFooterLinks = {
  truncateAfter?: number;
};

export const formatFooterLinks = (
  emailLayout: EmailLayoutData,
  opts: FormatFooterLinks = {},
): string => {
  const { footer_links } = emailLayout;
  const { truncateAfter: limit } = opts;

  if (!footer_links) return "";

  const count = footer_links.length;

  if (!limit || limit >= count)
    return footer_links.map((link) => link.text).join(", ");

  return (
    take(footer_links, limit)
      .map((link) => link.text)
      .join(", ") + ` (+ ${count - limit} more)`
  );
};

export const getFooterLinksList = (
  emailLayout: EmailLayoutData,
):
  | {
      key: string;
      value: string;
    }[]
  | [] => {
  const { footer_links } = emailLayout;
  if (!footer_links) return [];

  return footer_links.map((link) => {
    return { key: link.text, value: link.url };
  });
};
