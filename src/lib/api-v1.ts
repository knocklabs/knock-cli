import { Config } from "@oclif/core";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import { BFlags, Props } from "@/lib/base-command";
import { InputError } from "@/lib/helpers/error";
import { prune } from "@/lib/helpers/object";
import { PaginatedResp, toPageParams } from "@/lib/helpers/page";
import * as EmailLayout from "@/lib/marshal/email-layout";
import { MaybeWithAnnotation } from "@/lib/marshal/shared/types";
import * as Translation from "@/lib/marshal/translation";
import * as Workflow from "@/lib/marshal/workflow";

const DEFAULT_ORIGIN = "https://control.knock.app";
const API_VERSION = "v1";

/*
 * API v1 client
 */
export default class ApiV1 {
  client!: AxiosInstance;

  constructor(flags: BFlags, config: Config) {
    const baseURL = flags["api-origin"] || DEFAULT_ORIGIN;

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${flags["service-token"]}`,
        "User-Agent": `${config.userAgent}`,
      },
      // Don't reject the promise based on a response status code.
      validateStatus: null,
    });
  }

  async ping(): Promise<AxiosResponse> {
    return this.get("/ping");
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
  service_token_name: string;
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
  emailLayout?: EmailLayout.EmailLayoutData<A>;
  errors?: InputError[];
};

export type CommitAllChangesResp = {
  result?: "success";
  errors?: InputError[];
};

export type PromoteAllChangesResp = {
  result?: "success";
  errors?: InputError[];
};
