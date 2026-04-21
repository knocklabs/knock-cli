/**
 * Minimal OpenAPI 3.x shapes used by the mapi command.
 * Kept loose where the resolver only needs structural access.
 */

export type HttpMethod = "get" | "put" | "post" | "delete" | "patch";

export type OpenApiSchemaObject = {
  type?: string;
  description?: string;
  properties?: Record<string, OpenApiSchemaObject>;
  required?: string[];
  items?: OpenApiSchemaObject;
  $ref?: string;
  anyOf?: OpenApiSchemaObject[];
  oneOf?: OpenApiSchemaObject[];
  allOf?: OpenApiSchemaObject[];
  nullable?: boolean;
  enum?: unknown[];
  example?: unknown;
};

export type OpenApiParameterObject = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema?: OpenApiSchemaObject;
};

export type OpenApiRequestBodyObject = {
  description?: string;
  required?: boolean;
  content?: Record<
    string,
    {
      schema?: OpenApiSchemaObject;
    }
  >;
};

export type OpenApiOperationObject = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameterObject[];
  requestBody?: OpenApiRequestBodyObject;
  responses?: Record<string, unknown>;
};

export type OpenApiPathItemObject = Partial<
  Record<
    HttpMethod | "parameters",
    OpenApiOperationObject | OpenApiParameterObject[]
  >
>;

export type OpenApiDocument = {
  openapi?: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, OpenApiPathItemObject>;
  components?: {
    schemas?: Record<string, OpenApiSchemaObject>;
    parameters?: Record<string, OpenApiParameterObject>;
  };
};

export type CachedOpenApiDocument = {
  fetchedAt: string;
  apiOrigin: string;
  spec: OpenApiDocument;
};

export type ParamSpec = {
  name: string;
  in: "path" | "query";
  required: boolean;
  description?: string;
  schema?: OpenApiSchemaObject;
};

/** Resolved body schema for help / prompts (shallow property list). */
export type ResolvedBodySchema = {
  description?: string;
  required: string[];
  properties: Record<string, OpenApiSchemaObject>;
};

export type Endpoint = {
  method: HttpMethod;
  path: string;
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  pathParams: ParamSpec[];
  queryParams: ParamSpec[];
  bodySchema?: ResolvedBodySchema;
};

export type FieldInput = {
  key: string;
  value: string;
  raw: boolean;
};
