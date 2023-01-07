import os from "node:os";
import * as path from "node:path";

export const isTestEnv = process.env.NODE_ENV === "test";

export const sandboxDir = path.resolve(os.tmpdir(), ".knock");
