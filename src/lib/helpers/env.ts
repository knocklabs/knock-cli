import os from "node:os";

export const isTestEnv = process.env.NODE_ENV === "test";

export const sandboxDir = `${os.tmpdir()}/.knock`;
