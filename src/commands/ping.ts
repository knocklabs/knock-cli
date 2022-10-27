import BaseCommand from "../lib/base-command";

export default class Ping extends BaseCommand {
  static description = "Ping the Knock management API to verify access.";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  public async run(): Promise<void> {
    // TODO: Need to handle an error response.
    const resp = await this.apiV1.ping();

    this.log(resp.data);
  }
}