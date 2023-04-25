import { Config, Interfaces } from "@oclif/core";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import BaseCommand, { Props } from "@/lib/base-command";
import { InputError } from "@/lib/helpers/error";
import { AnyObj, prune } from "@/lib/helpers/object";
import { PaginatedResp, toPageParams } from "@/lib/helpers/page";
import { MaybeWithAnnotation } from "@/lib/marshal/shared/types";
import * as Translation from "@/lib/marshal/translation";
import * as Workflow from "@/lib/marshal/workflow";

const DEFAULT_ORIGIN = "https://control.knock.app";
const API_VERSION = "v1";

export type GFlags = Interfaces.InferredFlags<
  (typeof BaseCommand)["globalFlags"]
>;

/*
 * API v1 client
 */
export default class ApiV1 {
  client!: AxiosInstance;

  constructor(flags: GFlags, config: Config) {
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
    { args, flags }: Props,
    workflow: AnyObj,
  ): Promise<AxiosResponse<UpsertWorkflowResp<A>>> {
    const params = prune({
      environment: flags.environment,
      annotate: flags.annotate,
      commit: flags.commit,
      commit_message: flags["commit-message"],
    });
    const data = { workflow };

    return this.put(`/workflows/${args.workflowKey}`, data, { params });
  }

  async validateWorkflow(
    { args, flags }: Props,
    workflow: AnyObj,
  ): Promise<AxiosResponse<ValidateWorkflowResp>> {
    const params = prune({
      environment: flags.environment,
    });
    const data = { workflow };

    return this.put(`/workflows/${args.workflowKey}/validate`, data, {
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

  async listTranslations({
    flags,
  }: Props): Promise<AxiosResponse<ListTranslationResp>> {
    const params = prune({
      environment: flags.environment,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      ...toPageParams(flags),
    });

    return this.get("/translations", { params });
  }

  async upsertTranslation(
    { flags }: Props,
    translation: AnyObj,
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

/*
 * API v1 response types:
 */
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

export type ListTranslationResp = PaginatedResp<Translation.TranslationData>;

export type UpsertTranslationResp = {
  translation?: Translation.TranslationData;
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
