import { Hyperlink, MaybeWithAnnotation } from "../shared/types";

// Email layout payload data from the API.
export type EmailLayoutData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  name: string;
  html_layout: string;
  text_layout: string;
  footer_links?: [Hyperlink];
  updated_at: string;
  created_at: string;
};
