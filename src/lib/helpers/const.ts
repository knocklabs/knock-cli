import os from "node:os";
import * as path from "node:path";

import * as fs from "fs-extra";

export enum KnockEnv {
  Development = "development",
  Production = "production",
}

export const isTestEnv = process.env.NODE_ENV === "test";

// Note, need to wrap os.tmpdir() with fs.realpathSync() for macos because it's
// a symlink. (https://github.com/nodejs/node/issues/11422)
export const sandboxDir = path.resolve(fs.realpathSync(os.tmpdir()), ".knock");
