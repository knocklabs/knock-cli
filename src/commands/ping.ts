import BaseCommand from "@/lib/base-command";

export default class Ping extends BaseCommand {
  // Deprecated, in favor of the whoami command.
  static hidden = true;

  public async run(): Promise<void> {
    const resp = await this.apiV1.ping();

    this.log(resp.data);
  }
}
