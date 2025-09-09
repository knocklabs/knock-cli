import { waitForAccessToken } from "@/lib/auth";
import BaseCommand from "@/lib/base-command";
import { spinner } from "@/lib/helpers/ux";

export default class Login extends BaseCommand<typeof Login> {
  public async run(): Promise<void> {
    const { flags } = this.props;

    if (flags["service-token"]) {
      this.log("Service token provided, skipping login.");
      return;
    }

    spinner.start("‣ Authenticating with Knock...");

    const resp = await waitForAccessToken(
      this.sessionContext.dashboardOrigin,
      this.sessionContext.authOrigin,
    );

    spinner.stop();

    await this.configStore.set({ userSession: resp });

    this.log("‣ Successfully authenticated with Knock.");
  }
}
