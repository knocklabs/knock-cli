import { Flags, ux } from "@oclif/core";
import { AxiosResponse } from "axios";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { merge } from "@/lib/helpers/object";
import {
  maybePromptPageAction,
  pageFlags,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { withSpinner } from "@/lib/helpers/request";

export default class EmailLayoutList extends BaseCommand<
  typeof EmailLayoutList
> {
  static summary = "Display all email layouts for an environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListEmailLayoutResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  async request(
    pageParams = {},
  ): Promise<AxiosResponse<ApiV1.ListEmailLayoutResp>> {
    const props = merge(this.props, { flags: { ...pageParams } });

    return withSpinner<ApiV1.ListEmailLayoutResp>(() =>
      this.apiV1.listEmailLayouts(props),
    );
  }

  async render(data: ApiV1.ListEmailLayoutResp): Promise<void> {
    const { entries } = data;
    const { environment: env, "hide-uncommitted-changes": commitedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !commitedOnly ? "(including uncommitted)" : "";

    this.log(
      `‣ Showing ${entries.length} email layouts in \`${env}\` environment ${qualifier}\n`,
    );

    /*
     * Email layouts table
     */

    ux.table(entries, {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
      created_at: {
        header: "Created at",
        get: (entry) => formatDate(entry.created_at),
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ApiV1.ListEmailLayoutResp): Promise<void> {
    const { page_info } = data;

    const pageAction = await maybePromptPageAction(page_info);
    const pageParams = pageAction && paramsForPageAction(pageAction, page_info);

    if (pageParams) {
      this.log("\n");

      const resp = await this.request(pageParams);
      return this.render(resp.data);
    }
  }
}
