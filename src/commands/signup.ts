import { Flags, ux } from "@oclif/core";

import { HeadlessAccountStatus } from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import {
  formatHeadlessAccountError,
  timer,
} from "@/lib/helpers/headless-account";
import { isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";

const READY_POLL_INTERVAL_MS = 5000;
const READY_MAX_POLLS = 24;

const CONFIRM_PROMPT =
  "This will provision a new, temporary Knock account, which is deleted after 24 hours unless a person claims it.\nContinue?";

type HeadlessAccount = {
  token: string;
  token_saved: boolean;
  status: HeadlessAccountStatus;
  expires_at: string;
  next_step: string;
};

const nextStep = (status: HeadlessAccountStatus, tokenSaved: boolean) => {
  if (status === "expired") {
    return "The account has expired. Run `knock signup` to create a new one.";
  }

  const claim =
    "run `knock headless claim --email <email>`" +
    (tokenSaved ? "" : " with KNOCK_SERVICE_TOKEN set to the account's token");

  return status === "provisioning"
    ? `The account is still being set up. Run \`knock headless status\` to check on it. Once it's ready, ${claim} to claim it.`
    : `To claim this account, ${claim}.`;
};

export default class Signup extends BaseCommand<typeof Signup> {
  protected requiresAuth = false;

  static summary = "Sign up for a temporary Knock account.";

  static description =
    "Provisions a new, temporary Knock account without a browser, for an " +
    "agent to build in right away. The account is deleted after 24 hours " +
    "unless a person claims it with `knock headless claim`. Pass --force to " +
    "run without the confirmation prompt.";

  static enableJsonFlag = true;

  static flags = {
    force: Flags.boolean({
      summary: "Skip confirmation prompt.",
    }),
  };

  public async run(): Promise<HeadlessAccount | void> {
    const { force, json } = this.props.flags;

    // Nothing can answer the prompt in these cases, so don't wait on it.
    if (!force && (json || !process.stdin.isTTY)) {
      this.error("Pass --force to sign up without a confirmation prompt.");
    }

    const confirmed = force || (await promptToConfirm(CONFIRM_PROMPT));

    if (!confirmed) {
      this.log("Signup cancelled.");
      return;
    }

    const result = await this.createAccount();

    if (json) return result;
  }

  private async createAccount(): Promise<HeadlessAccount> {
    spinner.start("‣ Creating a headless account");

    const resp = await this.apiV1.createHeadlessAccount();

    if (!isSuccessResp(resp)) {
      ux.error(new ApiError(formatHeadlessAccountError(resp)));
    }

    const { token, expires_at } = resp.data;

    // The API only returns the token once, so hold on to it before anything
    // else can go wrong.
    const unsavedReason = this.tokenUnsavedReason();
    if (!unsavedReason) await this.configStore.set({ serviceToken: token });

    const status = await this.waitUntilReady(token);

    spinner.stop();

    const result = {
      token,
      token_saved: !unsavedReason,
      status,
      expires_at,
      next_step: nextStep(status, !unsavedReason),
    };

    this.render(result, unsavedReason);

    return result;
  }

  /*
   * Saving the token only helps if the commands that follow go on to use it, so
   * returns why it would not be, and leaves any credentials already set alone.
   * Running as a logged in user, a saved token is ignored and commands would
   * act on that user's account instead of the new one.
   */
  private tokenUnsavedReason(): string | undefined {
    const { userSession, serviceToken } = this.configStore.get();

    if (this.props.flags["service-token"]) {
      return "A service token is already set through --service-token or KNOCK_SERVICE_TOKEN.";
    }

    if (userSession) {
      return "You're logged in with a Knock user account, which takes precedence over a saved token.";
    }

    if (serviceToken) {
      return "Your Knock config already has a service token.";
    }
  }

  /*
   * Setup usually takes a few seconds. The account is created by now and the
   * token already works, so nothing here fails the signup, not even a status
   * check that errors. Reports the last status seen instead.
   */
  private async waitUntilReady(token: string): Promise<HeadlessAccountStatus> {
    let status: HeadlessAccountStatus = "provisioning";

    for (let poll = 0; poll < READY_MAX_POLLS; poll++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const resp = await this.apiV1.getHeadlessAccountStatus(token);
        if (isSuccessResp(resp)) status = resp.data.status;
      } catch {
        this.debug("Failed to check the headless account status.");
      }

      if (status !== "provisioning") return status;

      // eslint-disable-next-line no-await-in-loop
      await timer.sleep(READY_POLL_INTERVAL_MS);
    }

    return status;
  }

  private render(result: HeadlessAccount, unsavedReason?: string): void {
    const { token, status, expires_at, next_step } = result;

    this.log("‣ Successfully created a headless account:");
    this.log(indentString(`Status: ${status}\nExpires at: ${expires_at}`, 4));
    this.log("");

    if (unsavedReason) {
      this.log(`‣ Your service token was not saved. ${unsavedReason}`);
      this.log("  It's only shown once. Pass it to each command to use it:");
      this.log("");
      this.log(indentString(`KNOCK_SERVICE_TOKEN=${token} knock whoami`, 4));
    } else {
      this.log("‣ Your service token was saved to your Knock config.");
    }

    this.log("");

    this.log(`‣ ${next_step}`);
  }
}
