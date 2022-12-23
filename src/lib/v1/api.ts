import axios, { AxiosInstance, AxiosResponse } from "axios";
import { Config, Interfaces } from "@oclif/core";
import { omitBy, isNil } from "lodash";

import BaseCommand, { Props } from "@/lib/base-command";
import * as Workflow from "@/lib/marshal/workflow";
import {
  toPaginationParams,
  Paginated,
} from "@/lib/helpers/pagination-helpers";

const DEFAULT_ORIGIN = "https://control.knock.app";
const API_VERSION = "v1";

type GFlags = Interfaces.InferredFlags<typeof BaseCommand["globalFlags"]>;

const prune = (params: Record<string, unknown>) => omitBy(params, isNil);

export default class ApiV1 {
  protected client!: AxiosInstance;

  constructor(flags: GFlags, config: Config) {
    const baseURL = flags["api-origin"] || DEFAULT_ORIGIN;

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${flags["service-token"]}`,
        "User-Agent": `${config.userAgent}`,
        // Remove once the Z_BUF_ERROR error bug from 1.2.1 is fixed.
        // Reference: https://github.com/axios/axios/issues/5346#issuecomment-1340241163
        "Accept-Encoding": "gzip,deflate,compress",
      },
    });
  }

  // By resources:

  async ping(): Promise<AxiosResponse> {
    return this.get("/ping");
  }

  async listWorkflows({
    flags,
  }: Props): Promise<AxiosResponse<Paginated<Workflow.WorkflowPayload>>> {
    const params = {
      environment: flags["environment"],
      annotate: flags["annotate"],
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      ...toPaginationParams(flags),
    };

    return this.get("/workflows", prune(params));
  }

  async getWorkflow({
    args,
    flags,
  }: Props): Promise<AxiosResponse<Workflow.WorkflowPayload>> {
    const params = {
      environment: flags["environment"],
      annotate: flags["annotate"],
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
    };

    return this.get(`/workflows/${args.workflowKey}`, prune(params));
  }

  // By methods:
  // TODO: Need to handle an error response.

  async get(subpath: string, params?: any): Promise<AxiosResponse> {
    return this.client.get(`/${API_VERSION}` + subpath, { params });
  }
}
