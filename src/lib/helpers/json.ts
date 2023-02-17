import * as jsonlint from "@prantlf/jsonlint";
import * as fs from "fs-extra";

import { JsonSyntaxError } from "@/lib/helpers/error";
import { AnyObj } from "@/lib/helpers/object";

// Use double spaces (instead of tabs) when writing a json file, this matches
// how jsonlint parses and prints out human readable error messages in the
// `readJson` function below.
export const DOUBLE_SPACES = "  ";

/*
 * Reads a JSON file and then parses it into an object.
 *
 * Like the `readJson` method of `fs-extra`, but parse with jsonlint instead
 * so we can return a more human friendly error.
 *
 *  For example, instead of this error:
 *    SyntaxError: ...: Unexpected token } in JSON at position 972
 *
 *  Return a more friendly error with a line number, like this:
 *    Error: Parse error on line 39:
 *    ...type": "channel",    }
 *    ------------------------^
 *    Expecting 'STRING', got '}'
 */
type MaybeParsedPayload = AnyObj | undefined;
export type ReadJsonResult = [MaybeParsedPayload, JsonSyntaxError[]];

export const readJson = async (filePath: string): Promise<ReadJsonResult> => {
  const json = await fs.readFile(filePath, "utf8");

  let payload: MaybeParsedPayload;
  const errors: JsonSyntaxError[] = [];

  try {
    payload = jsonlint.parse(json) as AnyObj;
  } catch (error) {
    // https://github.com/prantlf/jsonlint#error-handling
    if (!(error instanceof SyntaxError)) throw error;

    errors.push(new JsonSyntaxError(error.message));
  }

  return [payload, errors];
};
