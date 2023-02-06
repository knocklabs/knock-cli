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
export class ApiError extends CustomError {}

// Error describing where and what in the json data is wrong.
export class JsonError extends CustomError {
  path: string;

  constructor(message: string, path: string) {
    super(message);
    this.path = path;
  }
}

// Possible errors we want to handle.
type HandledError = ApiError | SyntaxError | JsonError;

/*
 * Returns a formatted error message string from a single error instance.
 *
 * Note, primarily used to print out multiple errors below. When only need to
 * surface a single error, the oclif error helper takes an error instance.
 */
const formatError = (error: HandledError): string => {
  switch (true) {
    case error instanceof ApiError:
    case error instanceof SyntaxError:
      return `${error.name}: ${error.message}`;

    case error instanceof JsonError: {
      const e = error as JsonError;

      return e.path === ""
        ? `${e.name}: ${e.message}`
        : `${e.name}: data at "${e.path}" ${e.message}`;
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
  indentBy?: number;
};

export const formatErrors = (
  errors: HandledError[],
  opts: FormatErrorsOpts = {},
): string => {
  const { joinBy = "\n\n", indentBy = 0 } = opts;

  const formatted = errors.map((e) => formatError(e)).join(joinBy);
  return indentString(formatted, indentBy);
};
