import BaseCommand from "@/lib/base-command";

export default class Pull extends BaseCommand<typeof Pull> {
  static summary =
    "Pull all resources from an environment into a local file system.";

  public async run(): Promise<void> {
    // TODO
    this.log("TODO");
  }
}
