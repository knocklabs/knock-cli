// Don't ask me why, but importing this is necessary to stub KnockMgmt.prototype.delete
import "@/../test/support";

import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import { KnockEnv } from "@/lib/helpers/const";

describe("commands/branch/merge", () => {
  // TODO
});
