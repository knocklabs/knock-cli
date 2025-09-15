import { UserConfig } from "./user-config";

type BaseSessionContext = {
  type: "service" | "oauth";
  apiOrigin: string;
  dashboardOrigin: string;
  authOrigin: string;
};

export type ServiceTokenContext = BaseSessionContext & {
  type: "service";
  token: string | undefined;
  session: never;
};

export type OAuthTokenContext = BaseSessionContext & {
  type: "oauth";
  session: UserConfig["userSession"];
  token: never;
};

export type SessionContext = ServiceTokenContext | OAuthTokenContext;
