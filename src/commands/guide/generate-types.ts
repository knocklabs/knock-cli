import path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import {
  getLanguageFromExtension,
  supportedExtensions,
} from "@/lib/helpers/typegen";
import { spinner } from "@/lib/helpers/ux";
import * as Guide from "@/lib/marshal/guide";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const supportedExts = supportedExtensions.join(", ");

export default class GuideGenerateTypes extends BaseCommand<
  typeof GuideGenerateTypes
> {
  static description =
    "Generate types for all guides in an environment and write them to a file.";

  static flags = {
    environment: Flags.string({
      summary: "Select the environment to generate types for.",
      default: KnockEnv.Development,
    }),
    "output-file": CustomFlags.filePath({
      summary: `The output file to write the generated types to. We currently support ${supportedExts} files only. Your file extension will determine the target language for the generated types.`,
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    const outputFilePath = flags["output-file"].abspath;
    const extension = path.extname(outputFilePath);
    const targetLang = getLanguageFromExtension(extension);

    if (!targetLang) {
      this.error(
        new ApiError(
          `Unsupported file extension: ${extension}. We currently support ${supportedExts} files only.`,
        ),
      );
    }

    spinner.start(`‣ Loading guides`);

    // 1. List all guides in the target environment.
    const guides = await this.listAllGuides();

    spinner.stop();

    // 2. Generate types for all guides and its step contents.
    spinner.start(`‣ Generating types`);

    const { result, count, mapping } = await Guide.generateTypes(
      guides,
      targetLang,
    );

    spinner.stop();

    if (!result) {
      this.log(
        `‣ No guides with content JSON schema found, skipping type generation`,
      );
      return;
    }

    // 3. Write the generated types to the output file.
    await fs.outputFile(outputFilePath, result.lines.join("\n"));

    // 4. If for typescript, render and append the types index at the end.
    if (targetLang === "typescript") {
      const lines = Guide.generateIndexTypeTS(mapping);
      await fs.appendFile(outputFilePath, lines.join("\n"));
    }

    this.log(
      `‣ Successfully generated types for ${count} message type(s) and wrote them to ${outputFilePath}`,
    );
  }

  async listAllGuides(
    pageParams: Partial<PageInfo> = {},
    guidesFetchedSoFar: Guide.GuideData<WithAnnotation>[] = [],
  ): Promise<Guide.GuideData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        limit: MAX_PAGINATION_LIMIT,
        // Generate json schemas for guide contents so we can generate types.
        ["include-json-schema"]: true,
      },
    });

    const resp = await this.apiV1.listGuides<WithAnnotation>(props);

    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const guides = [...guidesFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllGuides({ after: pageInfo.after }, guides)
      : guides;
  }
}
