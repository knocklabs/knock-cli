import { TranslationFormat } from "./processor.isomorphic";

// Translation payload data from the API.
export type TranslationData = {
  locale_code: string;
  namespace?: string;
  content: string;
  created_at: string;
  updated_at: string;
  format?: TranslationFormat;
};

// Translation input data we can send to the API.
export type TranslationInput = Pick<
  TranslationData,
  "locale_code" | "namespace" | "content" | "format"
>;
