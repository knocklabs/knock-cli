import { Config, Interfaces } from "@oclif/core";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { isNil, omitBy } from "lodash";

import BaseCommand, { Props } from "@/lib/base-command";
import { Paginated, toPageParams } from "@/lib/helpers/page";
import { MaybeWithAnnotation } from "@/lib/marshal/shared/types";
import * as Workflow from "@/lib/marshal/workflow";

const DEFAULT_ORIGIN = "https://control.knock.app";
const API_VERSION = "v1";

export type GFlags = Interfaces.InferredFlags<
  typeof BaseCommand["globalFlags"]
>;

const prune = (params: Record<string, unknown>) => omitBy(params, isNil);

export default class ApiV1 {
  client!: AxiosInstance;

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
  }: Props): Promise<AxiosResponse<Paginated<Workflow.WorkflowData<A>>>> {
    const params = {
      environment: flags.environment,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      ...toPageParams(flags),
    };

    return this.get("/workflows", prune(params));
  }

  async getWorkflow<A extends MaybeWithAnnotation>({
    args,
    flags,
  }: Props): Promise<AxiosResponse<Workflow.WorkflowData<A>>> {
    const params = {
      environment: flags.environment,
      annotate: flags.annotate,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
    };

    return this.get(`/workflows/${args.workflowKey}`, prune(params));
  }

  // By methods:

  async get(subpath: string, params?: unknown): Promise<AxiosResponse> {
    return this.client.get(`/${API_VERSION}` + subpath, { params });
  }
}
