/*
 * Module for surveying the cwd location of the command run and its parent dirs
 * to gather context about a knock resource or the project that the command may
 * be refering to.
 */
import * as path from "node:path";

import * as fs from "fs-extra";

type WorkflowContext = {
  type: "workflow";
  key: string;
  root: string;
};

export type RunContext = {
  cwd: string;
  resource?: WorkflowContext;
};

const evaluateRecursively = (ctx: RunContext, currDir: string): RunContext => {
  if (currDir === "/") return ctx;
  if (ctx.resource) return ctx;

  if (fs.existsSync(`${currDir}/workflow.json`)) {
    ctx.resource = {
      type: "workflow",
      key: path.basename(currDir),
      root: currDir,
    };
  }

  const parentDir = path.resolve(currDir, "../");
  return evaluateRecursively(ctx, parentDir);
};

export const load = (): RunContext => {
  const ctx = { cwd: process.cwd() };

  return evaluateRecursively(ctx, ctx.cwd);
};

export type T = RunContext;
