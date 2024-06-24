import { PartialType } from "./types";

// Maps the partial type to the correct file extension. Defaults to 'txt'
export const partialTypeToFileExt = (type: PartialType): string => {
  switch (type) {
    case PartialType.Html:
      return "html";
    case PartialType.Json:
      return "json";
    case PartialType.Markdown:
      return "md";
    case PartialType.Text:
    default:
      return "txt";
  }
};
