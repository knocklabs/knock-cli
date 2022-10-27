import { Config, Interfaces } from "@oclif/core";
import axios, { AxiosInstance, AxiosResponse } from "axios";

import BaseCommand from "./base-command";

const DEFAULT_ORIGIN = "https://control.knock.app";
const API_VERSION = "v1";

type GFlags = Interfaces.InferredFlags<typeof BaseCommand["globalFlags"]>;

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

  async ping(): Promise<AxiosResponse> {
    return this.client.get(`/${API_VERSION}/ping`);
  }
}
