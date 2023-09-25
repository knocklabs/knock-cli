import { take } from "lodash";

import { EmailLayoutData } from "./types";

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
