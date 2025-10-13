import { indentString } from "@/lib/helpers/string";

// Individual changeset errors from the server side.
export type InputError = {
  field: string;
  message: string;
};

// Extends the built-in Error class while maintaining a prototype chain, to
// provide a base class for creating custom error classes.
// Reference: https://stackoverflow.com/a/58417721/3479934
class CustomError extends Error {
  constructor(message?: string) {
    // Error breaks the prototype chain here.
    super(message);

    // Restore the prototype chain.
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name;
  }
}

// Error response (non-2xx) from the Management API.
export class ApiError extends CustomError {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Error to indicate a syntax error in json and where.
export class JsonSyntaxError extends CustomError {}

// Error describing where and what in the json data is wrong.
export class JsonDataError extends CustomError {
  // For example: `foo.bar[2].baz`
  objPath: string;

  constructor(message: string, objPath: string) {
    super(message);
    this.objPath = objPath;
  }
}

// Error to indicate a syntax error in liquid content.
export class LiquidParseError extends CustomError {
  // Shows the erroneous liquid content with line numbers, should be taken
  // directly from a LiquidError.
  context: string;

  constructor(message: string, context: string) {
    super(message);
    this.context = context;
  }
}

// Generic error to wrap a message and associate it to a "source".
export class SourceError extends CustomError {
  // Arbitrary string to describe the identifying source of the error message.
  source: string;

  constructor(message: string, source: string, tag?: string) {
    super(tag ? `${tag}: ${message}` : message);
    this.source = source;
  }
}

// Possible errors we want to handle.
type HandledError =
  | ApiError
  | SyntaxError
  | JsonDataError
  | LiquidParseError
  | SourceError;

/*
 * Returns a formatted error message string from a single error instance.
 *
 * Note, primarily used to print out multiple errors below. When only need to
 * surface a single error, the oclif error helper takes an error instance.
 */
export const formatError = (error: HandledError): string => {
  switch (true) {
    case error instanceof ApiError:
    case error instanceof JsonSyntaxError:
      return `${error.name}: ${error.message}`;

    case error instanceof JsonDataError: {
      const e = error as JsonDataError;
      return e.objPath
        ? `${e.name}: data at "${e.objPath}" ${e.message}`
        : `${e.name}: ${e.message}`;
    }

    case error instanceof LiquidParseError: {
      const e = error as LiquidParseError;
      return `${e.name}: ${e.message + "\n" + e.context}`;
    }

    case error instanceof SourceError: {
      const e = error as SourceError;
      return `${e.source}\n` + indentString(e.message, 2);
    }

    default:
      throw new Error(`Unhandled error type: ${error}`);
  }
};

/*
 * Returns a formatted error message string from multiple errors.
 */
type FormatErrorsOpts = {
  joinBy?: string;
  prependBy?: string;
  indentBy?: number;
};

export const formatErrors = (
  errors: HandledError[],
  opts: FormatErrorsOpts = {},
): string => {
  const { prependBy = "", joinBy = "\n\n", indentBy = 0 } = opts;

  const formatted = errors.map((e) => formatError(e)).join(joinBy);
  return indentString(prependBy + formatted, indentBy);
};
