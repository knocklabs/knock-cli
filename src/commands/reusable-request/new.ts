import * as path from "node:path";

import { Flags } from "@oclif/core";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { slugify } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as ReusableRequest from "@/lib/marshal/reusable-request";
import { ReusableRequestDirContext } from "@/lib/run-context";

import ReusableRequestPush from "./push";

export default class ReusableRequestNew extends BaseCommand<
  typeof ReusableRequestNew
> {
  static summary =
    "Create a new reusable request with a minimal configuration.";

  static flags = {
    name: Flags.string({
      summary: "The name of the reusable request",
      char: "n",
    }),
    key: Flags.string({
      summary: "The key of the reusable request",
      char: "k",
    }),
    type: Flags.string({
      summary: "The reusable request type. Only http_fetch is supported.",
      char: "t",
      options: [ReusableRequest.ReusableRequestType.HttpFetch],
      default: ReusableRequest.ReusableRequestType.HttpFetch,
    }),
    description: Flags.string({
      summary: "The description of the reusable request",
      char: "d",
    }),
    method: Flags.string({
      summary: "The HTTP method of the request.",
      options: [...ReusableRequest.REUSABLE_REQUEST_HTTP_METHODS],
      default: "get",
    }),
    url: Flags.string({
      summary: "The URL of the request.",
      default: "https://example.com",
    }),
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
    force: Flags.boolean({
      summary:
        "Force the creation of the reusable request directory without confirmation.",
    }),
    push: Flags.boolean({
      summary:
        "Whether or not to push the reusable request to Knock after creation.",
      default: false,
      char: "p",
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = this.props;
    const { resourceDir } = this.runContext;

    if (resourceDir) {
      return this.error(
        `Cannot create a new reusable request inside an existing ${resourceDir.type} directory`,
      );
    }

    let name = flags.name;
    let key = flags.key;

    if (!name) {
      const nameResponse = await prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "Reusable request name",
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Reusable request name is required";
          }

          return true;
        },
      });
      name = nameResponse.name;
    }

    if (!key) {
      const keyResponse = await prompt<{ key: string }>({
        type: "input",
        name: "key",
        message: "Reusable request key (immutable slug)",
        initial: slugify(name),
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Reusable request key is required";
          }

          const keyError = ReusableRequest.validateReusableRequestKey(value);
          if (keyError) {
            return `Invalid reusable request key: ${keyError}`;
          }

          return true;
        },
      });
      key = keyResponse.key;
    }

    const keyError = ReusableRequest.validateReusableRequestKey(key);
    if (keyError) {
      return this.error(
        `Invalid reusable request key \`${key}\` (${keyError})`,
      );
    }

    const reusableRequestDirCtx = await this.getReusableRequestDirContext(key);

    const promptMessage = reusableRequestDirCtx.exists
      ? `Found \`${reusableRequestDirCtx.key}\` at ${reusableRequestDirCtx.abspath}, overwrite?`
      : `Create a new reusable request directory \`${reusableRequestDirCtx.key}\` at ${reusableRequestDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(promptMessage));
    if (!input) return;

    const scaffold = {
      name,
      type: flags.type as ReusableRequest.ReusableRequestType,
      description: flags.description,
      method: flags.method as ReusableRequest.ReusableRequestHttpMethod,
      url: flags.url,
    };

    await ReusableRequest.generateReusableRequestDir(
      reusableRequestDirCtx,
      scaffold,
    );

    if (flags.push) {
      spinner.start("‣ Pushing reusable request to Knock");

      const pushArgs = [
        key,
        ...(flags.environment ? ["--environment", flags.environment] : []),
      ];
      if (flags.branch) {
        pushArgs.push("--branch", flags.branch);
      }

      try {
        await ReusableRequestPush.run(pushArgs);
      } catch (error) {
        this.error(`Failed to push reusable request to Knock: ${error}`);
      } finally {
        spinner.stop();
      }
    }

    this.log(`‣ Successfully created reusable request \`${key}\``);
  }

  async getReusableRequestDirContext(
    reusableRequestKey?: string,
  ): Promise<ReusableRequestDirContext> {
    const { cwd: runCwd } = this.runContext;

    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "reusable_request",
      runCwd,
    );

    if (reusableRequestKey) {
      const dirPath = path.resolve(dirCtx.abspath, reusableRequestKey);
      const exists = await ReusableRequest.isReusableRequestDir(dirPath);

      return {
        type: "reusable_request",
        key: reusableRequestKey,
        abspath: dirPath,
        exists,
      };
    }

    return this.error("Missing 1 required arg:\nreusableRequestKey");
  }
}
