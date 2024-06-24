import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { MaybeWithAnnotation } from "../shared/types";

export enum PartialType {
  Html = "HTML",
  Json = "JSON",
  Markdown = "MARKDOWN",
  Text = "TEXT",
}

// Partial payload data from the API.
export type PartialData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  type: PartialType;
  name: string;
  description?: string;
  content: string;
  environment: string;
  updated_at: string;
  created_at: string;
};

export type PartialInput = AnyObj & {
  key: string;
};
