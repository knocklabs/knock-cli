import * as fs from "fs-extra";
import * as jsonlint from "jsonlint";

import { DataError } from "./error";
import { AnyObj } from "./object";

/*
 * Reads a JSON file and then parses it into an object.
 *
 * Like the `readJson` method of `fs-extra`, but parse with jsonlint instead
 * so we can return a more human friendly error.
 *
 *  For example, instead of this error:
 *    SyntaxError: ...: Unexpected token } in JSON at position 972
 *
 *  We get a more friendly error with a line number, like this:
 *    Error: Parse error on line 39:
 *    ...type": "channel",    }
 *    ------------------------^
 *    Expecting 'STRING', got '}'
 */
type MaybeParsedPayload = AnyObj | undefined;
export type ReadJsonResult = [MaybeParsedPayload, DataError[]];

export const readJson = async (filePath: string): Promise<ReadJsonResult> => {
  const json = await fs.readFile(filePath, "utf8");

  let payload: MaybeParsedPayload;
  const errors: DataError[] = [];

  try {
    payload = jsonlint.parse(json);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    errors.push({ name: error.name, message: error.message });
  }

  return [payload, errors];
};
