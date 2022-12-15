import { Config, Interfaces } from "@oclif/core";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { pickBy, identity } from 'lodash'

import BaseCommand from "@/lib/base-command";

import { toPaginationParams } from "./flag-helpers";

const DEFAULT_ORIGIN = "https://control.knock.app";
const API_VERSION = "v1";

type GFlags = Interfaces.InferredFlags<typeof BaseCommand["globalFlags"]>;

const prune = (params: Record<string, unknown>) =>
  pickBy(params, identity);

export default class ApiV1 {
  protected client!: AxiosInstance;

  constructor(flags: GFlags, config: Config) {
    const baseURL = flags["api-origin"] || DEFAULT_ORIGIN;

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${flags["service-token"]}`,
        "User-Agent": `${config.userAgent}`,
      },
    });
  }

  // By resources:

  async ping(): Promise<AxiosResponse> {
    return this.get("/ping");
  }

  async listWorkflows({ flags }: Interfaces.ParserOutput): Promise<AxiosResponse> {
    const params = {
      environment: flags["environment"],
      annotate: flags["annotate"],
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
      ...toPaginationParams(flags),
    }

    return this.get("/workflows", prune(params))
  }

  async getWorkflow({ args, flags }: Interfaces.ParserOutput): Promise<AxiosResponse> {
    const params = {
      environment: flags["environment"],
      annotate: flags["annotate"],
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
    }

    return this.get(`/workflows/${args.workflowKey}`, prune(params))
  }

  // By methods:
  // TODO: Need to handle an error response.

  async get(subpath: string, params?: any): Promise<AxiosResponse> {
    return this.client.get(`/${API_VERSION}` + subpath, { params });
  }
}
