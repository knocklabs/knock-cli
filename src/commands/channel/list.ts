import { Channel } from "@knocklabs/mgmt/resources/channels";
import { ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";

export default class ChannelList extends BaseCommand<typeof ChannelList> {
  static summary = "Display all channels configured for the account.";

  static enableJsonFlag = true;

  async run(): Promise<Channel[] | void> {
    const channels = await this.request();

    const { flags } = this.props;
    if (flags.json) return channels;

    await this.render(channels);
  }

  async request(): Promise<Channel[]> {
    return this.apiV1.listAllChannels();
  }

  async render(channels: Channel[]): Promise<void> {
    this.log(`‣ Showing ${channels.length} channels\n`);

    /*
     * Channels list table
     */

    const formattedChannels = channels.map((channel) => ({
      key: channel.key,
      name: channel.name,
      type: channel.type,
      provider: channel.provider,
      updated_at: formatDate(channel.updated_at),
    }));

    ux.table(formattedChannels, {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
      },
      type: {
        header: "Type",
      },
      provider: {
        header: "Provider",
      },
      updated_at: {
        header: "Updated at",
      },
    });
  }
}
