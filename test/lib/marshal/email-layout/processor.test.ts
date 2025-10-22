import { expect } from "chai";

import {
  buildEmailLayoutDirBundle,
  EmailLayoutData,
} from "@/lib/marshal/email-layout";
import { prepareResourceJson } from "@/lib/marshal/shared/helpers.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const remoteEmailLayout: EmailLayoutData<WithAnnotation> = {
  key: "default",
  name: "Default",
  html_layout: "<html><body><p> Example content </html></body><p>",
  text_layout: "Text {{content}}",
  footer_links: [{ text: "Link 1", url: "https://example.com" }],
  environment: "development",
  updated_at: "2023-10-02T19:24:48.714630Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {
      html_layout: { default: true, file_ext: "html" },
      text_layout: { default: true, file_ext: "txt" },
    },
    readonly_fields: ["key", "environment", "created_at", "updated_at", "sha"],
  },
};

describe("lib/marshal/layout/processor", () => {
  describe("prepareResourceJson", () => {
    it("moves over email layout's readonly fields under __readonly field", () => {
      const emailLayoutJson = prepareResourceJson(remoteEmailLayout);

      expect(emailLayoutJson.key).to.equal(undefined);
      expect(emailLayoutJson.environment).to.equal(undefined);
      expect(emailLayoutJson.created_at).to.equal(undefined);
      expect(emailLayoutJson.updated_at).to.equal(undefined);
      expect(emailLayoutJson.sha).to.equal(undefined);

      expect(emailLayoutJson.__readonly).to.eql({
        key: "default",
        environment: "development",
        created_at: "2023-09-18T18:32:18.398053Z",
      });
    });

    it("removes the __annotation field", () => {
      const emailLayoutJson = prepareResourceJson(remoteEmailLayout);
      expect(emailLayoutJson.__annotation).to.equal(undefined);
    });
  });

  describe("buildEmailLayoutDirBundle", () => {
    describe("given a fetched layout that has not been pulled before", () => {
      const result = buildEmailLayoutDirBundle(remoteEmailLayout);

      expect(result).to.eql({
        "html_layout.html": "<html><body><p> Example content </html></body><p>",
        "text_layout.txt": "Text {{content}}",
        "layout.json": {
          name: "Default",
          footer_links: [{ text: "Link 1", url: "https://example.com" }],
          "html_layout@": "html_layout.html",
          "text_layout@": "text_layout.txt",
          __readonly: {
            key: "default",
            environment: "development",
            created_at: "2023-09-18T18:32:18.398053Z",
          },
        },
      });
    });

    describe("given a fetched layout with a local version available", () => {
      it("returns a dir bundle based on a local version and default extract settings", () => {
        const localEmailLayout = {
          name: "default",
          "html_layout@": "foo/bar/layout.html",
          "text_layout@": "text_layout.txt",
        };

        const result = buildEmailLayoutDirBundle(
          remoteEmailLayout,
          localEmailLayout,
        );

        expect(result).to.eql({
          "foo/bar/layout.html":
            "<html><body><p> Example content </html></body><p>",
          "text_layout.txt": "Text {{content}}",
          "layout.json": {
            name: "Default",
            footer_links: [{ text: "Link 1", url: "https://example.com" }],
            "html_layout@": "foo/bar/layout.html",
            "text_layout@": "text_layout.txt",
            __readonly: {
              key: "default",
              environment: "development",
              created_at: "2023-09-18T18:32:18.398053Z",
            },
          },
        });
      });
    });

    describe("when called with a $schema", () => {
      it("returns a dir bundle with the $schema in the layout.json", () => {
        const result = buildEmailLayoutDirBundle(
          remoteEmailLayout,
          {},
          "https://schemas.knock.app/cli/email-layout.json",
        );

        expect(result["layout.json"]).to.contain({
          $schema: "https://schemas.knock.app/cli/email-layout.json",
        });
      });
    });
  });
});
