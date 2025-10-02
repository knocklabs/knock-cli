import KnockMgmt from "@knocklabs/mgmt";
import { Config } from "@oclif/core";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import { Props } from "@/lib/base-command";
import { InputError } from "@/lib/helpers/error";
import { prune } from "@/lib/helpers/object.isomorphic";
import { PaginatedResp, toPageParams } from "@/lib/helpers/page";
import * as Commit from "@/lib/marshal/commit";
import * as EmailLayout from "@/lib/marshal/email-layout";
import * as Guide from "@/lib/marshal/guide";
import * as MessageType from "@/lib/marshal/message-type";
import * as Partial from "@/lib/marshal/partial";
import { MaybeWithAnnotation } from "@/lib/marshal/shared/types";
import * as Translation from "@/lib/marshal/translation";
import * as Workflow from "@/lib/marshal/workflow";

import { SessionContext } from "./types";

const API_VERSION = "v1";

/**
 * KnockMgmt client requires a service token, but we set the Authorization
 * request header directly, so use a placeholder when service token is not
 * provided.
 */
const PLACEHOLDER_SERVICE_TOKEN = "placeholder-service-token";

/*
 * API v1 client
 */
export default class ApiV1 {
  client!: AxiosInstance;
  public mgmtClient: KnockMgmt;

  constructor(sessionContext: SessionContext, config: Config) {
    const baseURL = sessionContext.apiOrigin;
    const token = this.getToken(sessionContext);

    const headers = {
      // Used to authenticate the request to the API.
      Authorization: `Bearer ${token}`,
      // Used in conjunction with the JWT access token, to allow the OAuth server to
      // verify the client ID of the OAuth client that issued the access token.
      "x-knock-client-id": sessionContext.session?.clientId ?? undefined,
      "User-Agent": `${config.userAgent}`,
    };

    this.client = axios.create({
      baseURL,
      headers,
      // Don't reject the promise based on a response status code.
      validateStatus: null,
    });

    // This should eventually replace the Axios client
    this.mgmtClient = new KnockMgmt({
      serviceToken: sessionContext.token || PLACEHOLDER_SERVICE_TOKEN,
      baseURL,
      defaultHeaders: headers,
    });
  }

  private getToken(sessionContext: SessionContext): string | undefined {
    return sessionContext.session
      ? sessionContext.session.accessToken
      : sessionContext.token;
  }

  async whoami(): Promise<AxiosResponse<WhoamiResp>> {
    return this.get("/whoami");
  }

  // By resources: Workflows

  async listWorkflows<A extends MaybeWithAnnotation>({
    flags,
  }: Props): Promise<AxiosResponse<ListWorkflowResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      ...toPageParams(flags),
    });

    return this.get("/workflows", { params });
  }

  async getWorkflow<A extends MaybeWithAnnotation>({
    args,
    flags,
  }: Props): Promise<AxiosResponse<GetWorkflowResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
    });

    return this.get(`/workflows/${args.workflowKey}`, { params });
  }

  async upsertWorkflow<A extends MaybeWithAnnotation>(
    { flags }: Props,
    workflow: Workflow.WorkflowInput,
  ): Promise<AxiosResponse<UpsertWorkflowResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      commit: flags.commit,
      commit_message: flags["commit-message"],
    });
    const data = { workflow };

    return this.put(`/workflows/${workflow.key}`, data, { params });
  }

  async validateWorkflow(
    { flags }: Props,
    workflow: Workflow.WorkflowInput,
  ): Promise<AxiosResponse<ValidateWorkflowResp>> {
    const params = prune({
      environment: flags.environment,
    });
    const data = { workflow };

    return this.put(`/workflows/${workflow.key}/validate`, data, {
      params,
    });
  }

  async activateWorkflow({
    args,
    flags,
  }: Props): Promise<AxiosResponse<ActivateWorkflowResp>> {
    const params = prune({
      environment: flags.environment,
      status: flags.status,
    });

    return this.put(`/workflows/${args.workflowKey}/activate`, {}, { params });
  }

  async runWorkflow({
    args,
    flags,
  }: Props): Promise<AxiosResponse<ActivateWorkflowResp>> {
    const params = prune({
      environment: flags.environment,
    });
    const data = prune({
      recipients: flags.recipients,
      tenant: flags.tenant,
      data: flags.data,
      actor: flags.actor,
    });
    return this.put(`/workflows/${args.workflowKey}/run`, data, { params });
  }

  // By resources: Commits

  async listCommits({ flags }: Props): Promise<AxiosResponse<ListCommitResp>> {
    const params = prune({
      environment: flags.environment,
      branch: flags.branch,
      promoted: flags.promoted,
      resource_type: flags["resource-type"],
      resource_id: flags["resource-id"],
      ...toPageParams(flags),
    });

    return this.get("/commits", { params });
  }

  async getCommit({ args }: Props): Promise<AxiosResponse<GetCommitResp>> {
    return this.get(`/commits/${args.id}`);
  }

  async commitAllChanges({
    flags,
  }: Props): Promise<AxiosResponse<CommitAllChangesResp>> {
    const params = prune({
      environment: flags.environment,
      commit_message: flags["commit-message"],
    });

    return this.put(`/commits`, {}, { params });
  }

  async promoteAllChanges({
    flags,
  }: Props): Promise<AxiosResponse<PromoteAllChangesResp>> {
    const params = prune({
      to_environment: flags.to,
    });

    return this.put(`/commits/promote`, {}, { params });
  }

  async promoteOneChange({
    flags,
  }: Props): Promise<AxiosResponse<PromoteOneChangeResp>> {
    return this.put(`/commits/${flags.only}/promote`);
  }

  // By resources: Translations

  async listTranslations(
    { flags }: Props,
    filters: Partial<Translation.TranslationIdentifier> = {},
  ): Promise<AxiosResponse<ListTranslationResp>> {
    const params = prune({
      environment: flags.environment,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      locale_code: filters.localeCode,
      namespace: filters.namespace,
      format: flags.format,
      ...toPageParams(flags),
    });

    return this.get("/translations", { params });
  }

  async getTranslation(
    { flags }: Props,
    translation: Translation.TranslationIdentifier,
  ): Promise<AxiosResponse<GetTranslationResp>> {
    const params = prune({
      environment: flags.environment,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      namespace: translation.namespace,
      format: flags.format,
    });

    return this.get(`/translations/${translation.localeCode}`, { params });
  }

  async upsertTranslation(
    { flags }: Props,
    translation: Translation.TranslationInput,
  ): Promise<AxiosResponse<UpsertTranslationResp>> {
    const params = prune({
      environment: flags.environment,
      commit: flags.commit,
      commit_message: flags["commit-message"],
      namespace: translation.namespace,
    });

    return this.put(
      `/translations/${translation.locale_code}`,
      { translation },
      { params },
    );
  }

  async validateTranslation(
    { flags }: Props,
    translation: Translation.TranslationInput,
  ): Promise<AxiosResponse<ValidateTranslationResp>> {
    const params = prune({
      environment: flags.environment,
      namespace: translation.namespace,
    });
    const data = { translation };

    return this.put(`/translations/${translation.locale_code}/validate`, data, {
      params,
    });
  }

  // By resources: Email layouts

  async listEmailLayouts<A extends MaybeWithAnnotation>({
    flags,
  }: Props): Promise<AxiosResponse<ListEmailLayoutResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      ...toPageParams(flags),
    });

    return this.get("/email_layouts", { params });
  }

  async getEmailLayout<A extends MaybeWithAnnotation>({
    args,
    flags,
  }: Props): Promise<AxiosResponse<GetEmailLayoutResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
    });

    return this.get(`/email_layouts/${args.emailLayoutKey}`, { params });
  }

  async upsertEmailLayout<A extends MaybeWithAnnotation>(
    { flags }: Props,
    layout: EmailLayout.EmailLayoutInput,
  ): Promise<AxiosResponse<UpsertEmailLayoutResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      commit: flags.commit,
      commit_message: flags["commit-message"],
    });
    const data = { email_layout: layout };

    return this.put(`/email_layouts/${layout.key}`, data, { params });
  }

  async validateEmailLayout(
    { flags }: Props,
    layout: EmailLayout.EmailLayoutInput,
  ): Promise<AxiosResponse<ValidateEmailLayoutResp>> {
    const params = prune({
      environment: flags.environment,
    });
    const data = { email_layout: layout };

    return this.put(`/email_layouts/${layout.key}/validate`, data, {
      params,
    });
  }

  // By resources: Partials

  async listPartials<A extends MaybeWithAnnotation>({
    flags,
  }: Props): Promise<AxiosResponse<ListPartialResp<A>>> {
    const params = prune({
      environment: flags.environment,
      branch: flags.branch,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      annotate: flags.annotate,
      ...toPageParams(flags),
    });

    return this.get("/partials", { params });
  }

  async getPartial<A extends MaybeWithAnnotation>({
    args,
    flags,
  }: Props): Promise<AxiosResponse<GetPartialResp<A>>> {
    const params = prune({
      environment: flags.environment,
      branch: flags.branch,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
    });

    return this.get(`/partials/${args.partialKey}`, { params });
  }

  async upsertPartial<A extends MaybeWithAnnotation>(
    { flags }: Props,
    partial: Partial.PartialInput,
  ): Promise<AxiosResponse<UpsertPartialResp<A>>> {
    const params = prune({
      environment: flags.environment,
      branch: flags.branch,
      annotate: flags.annotate,
      commit: flags.commit,
      commit_message: flags["commit-message"],
    });
    const data = { partial };

    return this.put(`/partials/${partial.key}`, data, { params });
  }

  async validatePartial(
    { flags }: Props,
    partial: Partial.PartialInput,
  ): Promise<AxiosResponse<ValidatePartialResp>> {
    const params = prune({
      environment: flags.environment,
      branch: flags.branch,
    });
    const data = { partial };

    return this.put(`/partials/${partial.key}/validate`, data, {
      params,
    });
  }

  // By resources: Message types

  async listMessageTypes<A extends MaybeWithAnnotation>({
    flags,
  }: Props): Promise<AxiosResponse<ListMessageTypeResp<A>>> {
    const params = prune({
      environment: flags.environment,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      annotate: flags.annotate,
      ...toPageParams(flags),
    });

    return this.get("/message_types", { params });
  }

  async getMessageType<A extends MaybeWithAnnotation>({
    args,
    flags,
  }: Props): Promise<AxiosResponse<GetMessageTypeResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
    });

    return this.get(`/message_types/${args.messageTypeKey}`, { params });
  }

  async upsertMessageType<A extends MaybeWithAnnotation>(
    { flags }: Props,
    messageType: MessageType.MessageTypeInput,
  ): Promise<AxiosResponse<UpsertMessageTypeResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      commit: flags.commit,
      commit_message: flags["commit-message"],
    });
    const data = { message_type: messageType };

    return this.put(`/message_types/${messageType.key}`, data, { params });
  }

  async validateMessageType(
    { flags }: Props,
    messageType: MessageType.MessageTypeInput,
  ): Promise<AxiosResponse<ValidateMessageTypeResp>> {
    const params = prune({
      environment: flags.environment,
    });
    const data = { message_type: messageType };

    return this.put(`/message_types/${messageType.key}/validate`, data, {
      params,
    });
  }

  // By resources: Guides

  async listGuides<A extends MaybeWithAnnotation>({
    flags,
  }: Props): Promise<AxiosResponse<ListGuideResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      include_json_schema: flags["include-json-schema"],
      ...toPageParams(flags),
    });

    return this.get("/guides", { params });
  }

  async getGuide<A extends MaybeWithAnnotation>({
    args,
    flags,
  }: Props): Promise<AxiosResponse<GetGuideResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
    });

    return this.get(`/guides/${args.guideKey}`, { params });
  }

  async validateGuide(
    { flags }: Props,
    guide: Guide.GuideInput,
  ): Promise<AxiosResponse<ValidateGuideResp>> {
    const params = prune({
      environment: flags.environment,
    });
    const data = { guide };

    return this.put(`/guides/${guide.key}/validate`, data, {
      params,
    });
  }

  async upsertGuide<A extends MaybeWithAnnotation>(
    { flags }: Props,
    guide: Guide.GuideInput,
  ): Promise<AxiosResponse<UpsertGuideResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      commit: flags.commit,
      commit_message: flags["commit-message"],
    });
    const data = { guide };

    return this.put(`/guides/${guide.key}`, data, { params });
  }

  async activateGuide({
    args,
    flags,
  }: Props): Promise<AxiosResponse<ActivateGuideResp>> {
    const params = prune({
      environment: flags.environment,
      status: flags.status,
      from: flags.from,
      until: flags.until,
    });

    return this.put(`/guides/${args.guideKey}/activate`, {}, { params });
  }

  // By methods:

  async get(
    subpath: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    return this.client.get(`/${API_VERSION}` + subpath, config);
  }

  async put(
    subpath: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    return this.client.put(`/${API_VERSION}` + subpath, data, config);
  }
}

export type T = ApiV1;

/*
 * API v1 response types:
 */
export type WhoamiResp = {
  account_name: string;
  account_slug: string;
  service_token_name: string | null;
  user_id: string | null;
};

export type ListWorkflowResp<A extends MaybeWithAnnotation = unknown> =
  PaginatedResp<Workflow.WorkflowData<A>>;

export type GetWorkflowResp<A extends MaybeWithAnnotation = unknown> =
  Workflow.WorkflowData<A>;

export type UpsertWorkflowResp<A extends MaybeWithAnnotation = unknown> = {
  workflow?: Workflow.WorkflowData<A>;
  errors?: InputError[];
};

export type ValidateWorkflowResp = {
  workflow?: Workflow.WorkflowData;
  errors?: InputError[];
};

export type ActivateWorkflowResp = {
  workflow?: Workflow.WorkflowData;
  errors?: InputError[];
};

export type RehearseWorkflowResp = {
  workflow_run_id?: string;
  errors?: InputError[];
};

export type ListTranslationResp = PaginatedResp<Translation.TranslationData>;

export type GetTranslationResp = Translation.TranslationData;

export type UpsertTranslationResp = {
  translation?: Translation.TranslationData;
  errors?: InputError[];
};

export type ValidateTranslationResp = {
  translation?: Translation.TranslationData;
  errors?: InputError[];
};

export type ListEmailLayoutResp<A extends MaybeWithAnnotation = unknown> =
  PaginatedResp<EmailLayout.EmailLayoutData<A>>;

export type GetEmailLayoutResp<A extends MaybeWithAnnotation = unknown> =
  EmailLayout.EmailLayoutData<A>;

export type UpsertEmailLayoutResp<A extends MaybeWithAnnotation = unknown> = {
  email_layout?: EmailLayout.EmailLayoutData<A>;
  errors?: InputError[];
};

export type ValidateEmailLayoutResp = {
  email_layout?: EmailLayout.EmailLayoutData;
  errors?: InputError[];
};

export type ListCommitResp = PaginatedResp<Commit.CommitData>;

export type GetCommitResp = Commit.CommitData;

export type CommitAllChangesResp = {
  result?: "success";
  errors?: InputError[];
};

export type PromoteAllChangesResp = {
  result?: "success";
  errors?: InputError[];
};

export type PromoteOneChangeResp = {
  commit?: Commit.CommitData;
  errors?: InputError[];
};

export type ListPartialResp<A extends MaybeWithAnnotation = unknown> =
  PaginatedResp<Partial.PartialData<A>>;

export type GetPartialResp<A extends MaybeWithAnnotation = unknown> =
  Partial.PartialData<A>;

export type UpsertPartialResp<A extends MaybeWithAnnotation = unknown> = {
  partial?: Partial.PartialData<A>;
  errors?: InputError[];
};

export type ValidatePartialResp = {
  partial?: Partial.PartialData;
  errors?: InputError[];
};

export type ListMessageTypeResp<A extends MaybeWithAnnotation = unknown> =
  PaginatedResp<MessageType.MessageTypeData<A>>;

export type GetMessageTypeResp<A extends MaybeWithAnnotation = unknown> =
  MessageType.MessageTypeData<A>;

export type UpsertMessageTypeResp<A extends MaybeWithAnnotation = unknown> = {
  message_type?: MessageType.MessageTypeData<A>;
  errors?: InputError[];
};

export type ValidateMessageTypeResp = {
  message_type?: MessageType.MessageTypeData;
  errors?: InputError[];
};

export type ListGuideResp<A extends MaybeWithAnnotation = unknown> =
  PaginatedResp<Guide.GuideData<A>>;

export type GetGuideResp<A extends MaybeWithAnnotation = unknown> =
  Guide.GuideData<A>;

export type ValidateGuideResp = {
  guide?: Guide.GuideData;
  errors?: InputError[];
};

export type UpsertGuideResp<A extends MaybeWithAnnotation = unknown> = {
  guide?: Guide.GuideData<A>;
  errors?: InputError[];
};

export type ActivateGuideResp = {
  guide?: Guide.GuideData;
  errors?: InputError[];
};

export type ListBranchResp = PaginatedResp<BranchData>;

// TODO Remove this type once @knocklabs/mgmt includes branch operations
export type BranchData = {
  created_at: string;
  deleted_at: string | null;
  last_commit_at: string | null;
  slug: string;
  updated_at: string;
};
