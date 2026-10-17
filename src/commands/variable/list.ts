import { Flags, ux } from "@oclif/core";
import { AxiosResponse } from "axios";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import {
  maybePromptPageAction,
  pageFlags,
  PageInfo,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { withSpinner } from "@/lib/helpers/request";
import {
  BRANCH_ERROR,
  formatRedactedDefault,
  formatRedactedEnvironments,
  RedactedVariable,
  redactVariable,
  withEffectiveValue,
} from "@/lib/marshal/variable";

type RedactedList = {
  entries: RedactedVariable[];
  page_info: PageInfo;
};

export default class VariableList extends BaseCommand<typeof VariableList> {
  static summary =
    "Display variables in the project, or the value that applies in one environment.";

  static flags = {
    environment: Flags.string({
      summary:
        "Show only the value that applies in this environment: the override when one is set, otherwise the default.",
    }),
    type: Flags.string({
      summary: "Filter variables by type.",
      options: ["public", "secret"],
    }),
    branch: Flags.string({
      summary: "Rejected. Variables are not branch-scoped.",
    }),
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<RedactedList | void> {
    if (this.props.flags.branch) this.error(BRANCH_ERROR);

    const resp = await this.request();
    const redacted = this.redact(resp.data);

    if (this.props.flags.json) return redacted;

    this.render(redacted);
  }

  async request(
    pageParams: { after?: string; before?: string } = {},
  ): Promise<AxiosResponse<ApiV1.ListVariableResp>> {
    const { flags } = this.props;

    // Do not send --environment. That list is the override slot, which is
    // null when the default should apply. The project list has both, and
    // withEffectiveValue chooses the one that applies.
    return withSpinner<ApiV1.ListVariableResp>(() =>
      this.apiV1.listVariables({
        type: flags.type,
        after: pageParams.after ?? flags.after,
        before: pageParams.before ?? flags.before,
        limit: flags.limit,
      }),
    );
  }

  redact(data: ApiV1.ListVariableResp): RedactedList {
    const environment = this.props.flags.environment;

    return {
      page_info: data.page_info,
      entries: data.entries.map((entry) =>
        redactVariable(
          environment ? withEffectiveValue(entry, environment) : entry,
          environment,
        ),
      ),
    };
  }

  async render(data: RedactedList): Promise<void> {
    const { entries } = data;
    const { environment } = this.props.flags;
    const scope = environment ? `in \`${environment}\`` : "in the project";
    const noun = entries.length === 1 ? "variable" : "variables";
    this.log(`‣ Showing ${entries.length} ${noun} ${scope}\n`);

    if (environment) {
      ux.table(entries, {
        key: { header: "Key" },
        type: { header: "Type" },
        value: {
          header: "Value",
          get: (entry) => formatRedactedDefault(entry),
        },
        updated_at: {
          header: "Updated at",
          get: (entry) => formatDate(entry.updated_at),
        },
      });
    } else {
      ux.table(entries, {
        key: { header: "Key" },
        type: { header: "Type" },
        default: {
          header: "Default",
          get: (entry) => formatRedactedDefault(entry),
        },
        environments: {
          header: "Environments",
          get: (entry) => formatRedactedEnvironments(entry),
        },
        updated_at: {
          header: "Updated at",
          get: (entry) => formatDate(entry.updated_at),
        },
      });
    }

    return this.prompt(data);
  }

  async prompt(data: RedactedList): Promise<void> {
    const pageAction = await maybePromptPageAction(data.page_info);
    const pageParams =
      pageAction && paramsForPageAction(pageAction, data.page_info);

    if (pageParams) {
      this.log("\n");
      const resp = await this.request(pageParams);
      return this.render(this.redact(resp.data));
    }
  }
}
