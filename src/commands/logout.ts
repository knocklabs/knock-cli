import BaseCommand from "@/lib/base-command";
import { spinner } from "@/lib/helpers/ux";

export default class Logout extends BaseCommand<typeof Logout> {
  protected requiresAuth = false;

  static summary = "Log out of a Knock user account.";

  public async run(): Promise<void> {
    const { flags } = this.props;

    if (flags["service-token"]) {
      this.log("Service token provided, skipping logout.");
      return;
    }

    spinner.start("‣ Logging out of Knock...");

    await this.configStore.set({ userSession: undefined });

    spinner.stop();

    this.log("‣ Successfully logged out of Knock. See you around.");
  }
}
