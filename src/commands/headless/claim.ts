import { Flags, ux } from "@oclif/core";
import { prompt } from "enquirer";

import { ClaimHeadlessAccountResp } from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import { formatHeadlessAccountError } from "@/lib/helpers/headless-account";
import { isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";

export default class HeadlessClaim extends BaseCommand<typeof HeadlessClaim> {
  static summary = "Generate a claim to hand a headless account to a person.";

  static description =
    "Returns a link and a one-time code to show the person. They open the " +
    "link, sign in or sign up with the given email, and type the code to " +
    "become the account's owner. The link and code last 10 minutes, and " +
    "generating a new claim replaces the previous one. The account's service " +
    "token keeps working after the claim.";

  static enableJsonFlag = true;

  static flags = {
    email: Flags.string({
      summary: "The email of the person who will own the account.",
    }),
  };

  public async run(): Promise<ClaimHeadlessAccountResp | void> {
    const { flags } = this.props;

    const email = flags.email ?? (await this.promptForEmail());

    if (!email) {
      return this.error("An email is required. Pass it with --email.");
    }

    spinner.start("‣ Generating a claim");

    const resp = await this.apiV1.claimHeadlessAccount(email);

    if (!isSuccessResp(resp)) {
      ux.error(new ApiError(formatHeadlessAccountError(resp)));
    }

    spinner.stop();

    if (flags.json) return resp.data;

    this.render(email, resp.data);
  }

  private async promptForEmail(): Promise<string | undefined> {
    if (!process.stdin.isTTY) return undefined;

    try {
      const { email } = await prompt<{ email: string }>({
        type: "input",
        name: "email",
        message: "Email of the person who will own the account",
      });

      return email;
    } catch {
      return undefined;
    }
  }

  private render(email: string, claim: ClaimHeadlessAccountResp): void {
    const { claim_url, user_code, expires_at } = claim;

    this.log(`‣ Successfully generated a claim for ${email}.`);
    this.log("");
    this.log(`  Open this link and sign in or sign up with ${email}:`);
    this.log(indentString(claim_url, 4));
    this.log("");
    this.log("  Then type this code:");
    this.log(indentString(user_code, 4));
    this.log("");
    this.log(`  The link and code expire at ${expires_at}.`);
    this.log("");
    this.log("  Run `knock headless status` to see when they've finished.");
  }
}
