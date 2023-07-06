import * as jsonlint from "@prantlf/jsonlint";
import * as fs from "fs-extra";

import { JsonSyntaxError } from "@/lib/helpers/error";
import { AnyObj } from "@/lib/helpers/object";

// Use double spaces (instead of tabs) when writing a json file, this matches
// how jsonlint parses and prints out human readable error messages in the
// `readJson` function below.
export const DOUBLE_SPACES = "  ";

/*
 * Parses a json string with it into an object with jsonlint.
 */
export type ParsedJson = AnyObj;
type MaybeParsedJson = ParsedJson | undefined;
export type ParseJsonResult = [MaybeParsedJson, JsonSyntaxError[]];

export const parseJson = (json: string): ParseJsonResult => {
  let payload: MaybeParsedJson;
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

/*
* Tries to parse a json string and returns the parsed JSON object if successful,
  otherwise returns the original string.
*/
type MaybeParseJsonResult = ParsedJson | string;
export const tryJsonParse = (maybeJson: string): MaybeParseJsonResult => {
  try {
    const data = JSON.parse(maybeJson);
    return data;
  } catch {
    return maybeJson;
  }
};

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
export const readJson = async (filePath: string): Promise<ParseJsonResult> => {
  const json = await fs.readFile(filePath, "utf8");

  return parseJson(json);
};
