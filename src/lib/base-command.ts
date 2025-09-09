import { Command, Flags, Interfaces } from "@oclif/core";

import { AnyObj } from "@/lib/helpers/object.isomorphic";

import KnockApiV1 from "./api-v1";
import * as RunContext from "./run-context";
import { UserConfigStore } from "./user-config";
import {
  OAuthTokenContext,
  ServiceTokenContext,
  SessionContext,
} from "./types";
import { refreshAccessToken } from "./auth";
import {
  DEFAULT_API_URL,
  DEFAULT_AUTH_URL,
  DEFAULT_DASHBOARD_URL,
} from "./urls";

export type BFlags = Interfaces.InferredFlags<
  (typeof BaseCommand)["baseFlags"]
>;

type TFlags<T extends typeof Command> = Interfaces.InferredFlags<T["flags"]> &
  BFlags;

type TArgs<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

// Typed exactly for the underlying command with its flags and args.
type TProps<T extends typeof Command> = {
  flags: TFlags<T>;
  args: TArgs<T>;
};

// Typed loosely for convenience.
type GenericCommandProps = {
  flags: AnyObj & BFlags;
  args: AnyObj;
};

export type Props<T = unknown> = T extends typeof Command
  ? TProps<T>
  : GenericCommandProps;

function sessionWithDefaultOrigins(sessionContext: Partial<SessionContext>) {
  return {
    ...sessionContext,
    apiOrigin: sessionContext.apiOrigin ?? DEFAULT_API_URL,
    dashboardOrigin: sessionContext.dashboardOrigin ?? DEFAULT_DASHBOARD_URL,
    authOrigin: sessionContext.authOrigin ?? DEFAULT_AUTH_URL,
  };
}

abstract class BaseCommand<T extends typeof Command> extends Command {
  protected props!: TProps<T>;
  protected apiV1!: KnockApiV1;
  protected runContext!: RunContext.T;
  protected sessionContext!: SessionContext;
  protected configStore!: UserConfigStore;

  public async init(): Promise<void> {
    await super.init();

    this.configStore = new UserConfigStore(this.config.configDir);

    // 1. Load user's config from the config dir, as available.
    await this.configStore.load();

    // 2. Parse flags and args, must come after the user config load.
    const { args, flags } = await this.parse(this.ctor);
    this.props = { args: args as TArgs<T>, flags: flags as TFlags<T> };

    // 3. Build the initial session context.
    this.sessionContext = this.buildSessionContext();

    // 4. If the session context is an OAuth session, refresh the access token.
    if (this.sessionContext.type === "oauth") {
      await this.refreshAccessTokenForSession();
    }

    // 5. Instantiate a knock api client.
    this.apiV1 = new KnockApiV1(this.sessionContext, this.config);

    // 6. Load the run context of the invoked command.
    this.runContext = await RunContext.load(this.id);
  }

  private buildSessionContext(): SessionContext {
    const userConfig = this.configStore.get();
    const session = userConfig.userSession;

    // If the user has a session and a service token is not provided, use the session.
    if (session && !this.props.flags["service-token"]) {
      return sessionWithDefaultOrigins({
        type: "oauth",
        session,
        apiOrigin: this.props.flags["api-origin"] ?? userConfig.apiOrigin,
        dashboardOrigin: userConfig.dashboardOrigin,
        authOrigin: userConfig.authOrigin,
      }) as OAuthTokenContext;
    }

    // Otherwise, default to this being a service token session.
    return sessionWithDefaultOrigins({
      type: "service",
      token: this.props.flags["service-token"] ?? userConfig.serviceToken,
      apiOrigin: this.props.flags["api-origin"] ?? userConfig.apiOrigin,
      dashboardOrigin: userConfig.dashboardOrigin,
      authOrigin: userConfig.authOrigin,
    }) as ServiceTokenContext;
  }

  private async refreshAccessTokenForSession() {
    // Maybe refresh the access token?
    try {
      const refreshedSession = await refreshAccessToken({
        authUrl: this.sessionContext.authOrigin,
        clientId: this.sessionContext.session?.clientId ?? "",
        refreshToken: this.sessionContext.session?.refreshToken ?? "",
      });

      this.debug("Successfully refreshed access token.");
      // Update the user config to use the new session.
      await this.configStore.set({ userSession: refreshedSession });
      // Update the session context to use the new session.
      this.sessionContext = this.buildSessionContext();
    } catch (error) {
      this.debug("Failed to refresh access token, clearing session.");
      await this.configStore.set({ userSession: undefined });
    }
  }

  // Base flags are inherited by any command that extends BaseCommand.
  static baseFlags = {
    // Evaluated in the following precedence:
    // - service token flag passed into the command
    // - if not provided, fall back to env variable
    // - if not available, fall back to user config
    "service-token": Flags.string({
      summary: "The service token to authenticate with.",
      required: false,
      multiple: false,
      env: "KNOCK_SERVICE_TOKEN",
    }),

    // Hidden flags to use a different api url for development purposes.
    "api-origin": Flags.string({
      hidden: true,
      required: false,
      multiple: false,
    }),
  };
}

export default BaseCommand;
