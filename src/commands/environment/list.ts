import { Environment } from "@knocklabs/mgmt/resources/environments";
import { ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";

export default class EnvironmentList extends BaseCommand<
  typeof EnvironmentList
> {
  static summary = "Display all environments configured for the account.";

  static enableJsonFlag = true;

  async run(): Promise<Environment[] | void> {
    const environments = await this.request();

    const { flags } = this.props;
    if (flags.json) return environments;

    await this.render(environments);
  }

  async request(): Promise<Environment[]> {
    return this.apiV1.listAllEnvironments();
  }

  async render(environments: Environment[]): Promise<void> {
    this.log(`‣ Showing ${environments.length} environments\n`);

    /*
     * Environments list table
     */

    const formattedEnvironments = environments.map((environment) => ({
      slug: environment.slug,
      name: environment.name,
      order: environment.order,
      owner: environment.owner,
      updated_at: formatDate(environment.updated_at),
    }));

    ux.table(formattedEnvironments, {
      slug: {
        header: "Slug",
      },
      name: {
        header: "Name",
      },
      order: {
        header: "Order",
      },
      owner: {
        header: "Owner",
      },
      updated_at: {
        header: "Updated at",
      },
    });
  }
}
