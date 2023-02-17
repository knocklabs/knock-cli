import { Liquid, LiquidError } from "liquidjs";

const engine = new Liquid({ timezoneOffset: 0 });

export function validateLiquid(input: string): undefined | LiquidError {
  try {
    engine.parse(input);
    return undefined;
  } catch (error) {
    if (!(error instanceof LiquidError)) throw error;

    return error;
  }
}
