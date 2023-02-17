import {
  Liquid,
  LiquidError,
  ParseError,
  TagToken,
  TokenizationError,
} from "liquidjs";

import { LiquidParseError } from "@/lib/helpers/error";

const engine = new Liquid({ timezoneOffset: 0 });

// Turn off a couple tags we do not support.
const disabled = {
  parse(token: TagToken): void {
    throw new Error(`"${token.name}" tag is not supported in Knock`);
  },
} as any;

engine.registerTag("render", disabled);
engine.registerTag("include", disabled);

/*
 * Try parsing a liquid supported string and return any parse errors.
 *
 * Note: we only care about checking for syntactical errors here so we only
 * parse, vs parsing and rendering.
 */
export function validateLiquidSyntax(
  input: string,
): undefined | LiquidParseError {
  try {
    engine.parse(input);
    return undefined;
  } catch (error) {
    // All liquidjs errors should be extended from the LiquidError class.
    // Reference: https://liquidjs.com/api/classes/util_error_.liquiderror.html
    if (!(error instanceof LiquidError)) throw error;

    // Here we only care about syntactical errors specifically.
    switch (true) {
      case error instanceof TokenizationError:
      case error instanceof ParseError:
        return new LiquidParseError(error.message, error.context);

      default:
        return undefined;
    }
  }
}
