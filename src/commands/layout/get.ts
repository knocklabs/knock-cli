import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { withSpinner } from "@/lib/helpers/request";
import * as EmailLayout from "@/lib/marshal/email_layout";

export default class EmailLayoutGet extends BaseCommand<typeof EmailLayoutGet> {
  static summary = "Display a single email layout from an environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
  };

  static args = {
    emailLayoutKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetEmailLayoutResp | void> {
    const { flags } = this.props;

    const resp = await withSpinner<ApiV1.GetEmailLayoutResp>(() =>
      this.apiV1.getEmailLayout(this.props),
    );

    if (flags.json) return resp.data;
    this.render(resp.data);
  }

  render(email_layout: ApiV1.GetEmailLayoutResp): void {
    const { emailLayoutKey } = this.props.args;
    const { environment: env, "hide-uncommitted-changes": commitedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !commitedOnly ? "(including uncommitted)" : "";

    this.log(
      `‣ Showing email layout \`${emailLayoutKey}\` in \`${env}\` environment ${qualifier}\n`,
    );
    /*
     * Email layout list table
     */

    const rows = [
      {
        key: "Key",
        value: email_layout.key,
      },
      {
        key: "Name",
        value: email_layout.name,
      },
      {
        key: "Updated at",
        value: formatDate(email_layout.updated_at),
      },
      {
        key: "Created at",
        value: formatDate(email_layout.created_at),
      },
    ];

    ux.table(rows, {
      key: {
        header: "Email layout",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 16,
      },
    });

    this.log("");
    if (email_layout.footer_links) {
      ux.table(EmailLayout.getFooterLinksList(email_layout), {
        key: {
          header: "Footer Links",
          minWidth: 24,
        },
        value: {
          header: "",
          minWidth: 16,
        },
      });
    }
  }
}
