import BaseCommand from "@/lib/base-command";

export default class Ping extends BaseCommand {
  // Deprecated, in favor of the whoami command.
  static hidden = true;

  static description = "Ping the Knock management API to verify access.";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  public async run(): Promise<void> {
    const resp = await this.apiV1.ping();

    this.log(resp.data);
  }
}
