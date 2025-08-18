export type SupportedTypeLanguage = "typescript" | "python" | "go" | "ruby";

export const supportedExtensions = [".ts", ".py", ".go", ".rb"];

export function getLanguageFromExtension(
  extension: string,
): SupportedTypeLanguage | undefined {
  switch (extension) {
    case "ts":
    case ".ts":
      return "typescript";
    case "py":
    case ".py":
      return "python";
    case "go":
    case ".go":
      return "go";
    case "rb":
    case ".rb":
      return "ruby";
    default:
      return undefined;
  }
}

/**
 * Transforms the schema to add additionalProperties to all objects.
 *
 * TODO: handle refs, union types, and more.
 *
 * @param schema The schema to transform
 * @returns The transformed schema
 */
export function transformSchema(
  schema: Record<string, any>,
): Record<string, any> {
  if (schema.type === "object" && !schema.additionalProperties) {
    schema.additionalProperties = false;
  }

  for (const key of Object.keys(schema.properties ?? {})) {
    const property = schema.properties[key];

    if (property.type === "object") {
      const transformedProperty = transformSchema(property);
      schema.properties[key] = transformedProperty;
    }
  }

  return schema;
}
