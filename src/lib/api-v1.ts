import { Config, Interfaces } from "@oclif/core";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import BaseCommand, { Props } from "@/lib/base-command";
import { JsonError } from "@/lib/helpers/error";
import { AnyObj, prune } from "@/lib/helpers/object";
import { PaginatedResp, toPageParams } from "@/lib/helpers/page";
import { MaybeWithAnnotation } from "@/lib/marshal/shared/types";
import * as Workflow from "@/lib/marshal/workflow";

const DEFAULT_ORIGIN = "https://control.knock.app";
const API_VERSION = "v1";

export type GFlags = Interfaces.InferredFlags<
  typeof BaseCommand["globalFlags"]
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

  // By resources:

  async ping(): Promise<AxiosResponse> {
    return this.get("/ping");
  }

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
    });
    const data = { workflow };

    return this.put(`/workflows/${args.workflowKey}`, data, { params });
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
  errors?: JsonError[];
};
