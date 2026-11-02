import { ux } from "@oclif/core";
import { AxiosResponse } from "axios";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import {
  maybePromptPageAction,
  pageFlags,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { withSpinner } from "@/lib/helpers/request";

export default class WarehouseList extends BaseCommand<typeof WarehouseList> {
  static summary = "Display all warehouses connected to your account.";

  // Hidden until warehouse syncs are generally available.
  static hidden = true;

  static flags = {
    environment: CustomFlags.environment,
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListWarehouseResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  async request(
    pageParams = {},
  ): Promise<AxiosResponse<ApiV1.ListWarehouseResp>> {
    const props = merge(this.props, { flags: { ...pageParams } });

    return withSpinner<ApiV1.ListWarehouseResp>(() =>
      this.apiV1.listWarehouses(props),
    );
  }

  async render(data: ApiV1.ListWarehouseResp): Promise<void> {
    const { entries } = data;

    this.log(`‣ Showing ${entries.length} warehouses\n`);

    ux.table(entries, {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
      },
      type: {
        header: "Type",
      },
      connection_status: {
        header: "Connection",
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ApiV1.ListWarehouseResp): Promise<void> {
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
