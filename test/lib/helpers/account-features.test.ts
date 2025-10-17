import { expect } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import {
  checkAccountFeature,
  checkTranslationsFeature,
  FeatureName,
} from "@/lib/helpers/account-features";

describe("lib/helpers/account-features", () => {
  let apiV1: KnockApiV1;
  let whoamiStub: sinon.SinonStub;

  beforeEach(() => {
    apiV1 = new KnockApiV1(factory.sessionContext(), {
      userAgent: "test",
    } as any);
    whoamiStub = sinon.stub(apiV1, "whoami");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("checkAccountFeature", () => {
    describe("when the feature is enabled", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            data: factory.whoami({
              account_features: {
                translations_allowed: true,
              },
            }),
          }),
        );
      });

      it("should return enabled: true for translations_allowed feature", async () => {
        const result = await checkAccountFeature(
          apiV1,
          "translations_allowed" as FeatureName,
        );
        expect(result.enabled).to.be.true;
        expect(result.message).to.be.undefined;
      });

      it("should call whoami once", async () => {
        await checkAccountFeature(apiV1, "translations_allowed" as FeatureName);
        expect(whoamiStub.calledOnce).to.be.true;
      });
    });

    describe("when the feature is disabled", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            data: factory.whoami({
              account_features: {
                translations_allowed: false,
              },
            }),
          }),
        );
      });

      it("should return enabled: false with default message", async () => {
        const result = await checkAccountFeature(
          apiV1,
          "translations_allowed" as FeatureName,
        );
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(
          "The translations_allowed feature is not enabled for your account. Please contact support to enable this feature.",
        );
      });

      it("should return enabled: false with custom message when provided", async () => {
        const customMessage = "Custom error message for disabled feature";
        const result = await checkAccountFeature(
          apiV1,
          "translations_allowed" as FeatureName,
          {
            errorMessage: customMessage,
          },
        );
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(customMessage);
      });
    });

    describe("when account_features is null", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            data: factory.whoami({
              account_features: undefined,
            }),
          }),
        );
      });

      it("should return enabled: false with default message", async () => {
        const result = await checkAccountFeature(
          apiV1,
          "translations_allowed" as FeatureName,
        );
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(
          "The translations_allowed feature is not enabled for your account. Please contact support to enable this feature.",
        );
      });
    });

    describe("when account_features is undefined", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            data: factory.whoami({
              account_features: undefined,
            }),
          }),
        );
      });

      it("should return enabled: false with default message", async () => {
        const result = await checkAccountFeature(
          apiV1,
          "translations_allowed" as FeatureName,
        );
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(
          "The translations_allowed feature is not enabled for your account. Please contact support to enable this feature.",
        );
      });
    });

    describe("when whoami API call fails", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            status: 400,
            statusText: "Bad Request",
            data: { error: "Invalid token" },
          }),
        );
      });

      it("should return enabled: false with error message about unable to retrieve account information", async () => {
        const result = await checkAccountFeature(
          apiV1,
          "translations_allowed" as FeatureName,
        );
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(
          "Unable to retrieve account information: 400 Bad Request",
        );
      });
    });

    describe("when whoami API call returns 500 error", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            status: 500,
            statusText: "Internal Server Error",
            data: { error: "Server error" },
          }),
        );
      });

      it("should return enabled: false with error message about unable to retrieve account information", async () => {
        const result = await checkAccountFeature(
          apiV1,
          "translations_allowed" as FeatureName,
        );
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(
          "Unable to retrieve account information: 500 Internal Server Error",
        );
      });
    });

    describe("when whoami API call throws an exception", () => {
      beforeEach(() => {
        whoamiStub.rejects(new Error("Network error"));
      });

      it("should return enabled: false with the exception message", async () => {
        const result = await checkAccountFeature(
          apiV1,
          "translations_allowed" as FeatureName,
        );
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal("Network error");
      });
    });
  });

  describe("checkTranslationsFeature", () => {
    describe("when translations feature is enabled", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            data: factory.whoami({
              account_features: {
                translations_allowed: true,
              },
            }),
          }),
        );
      });

      it("should return enabled: true", async () => {
        const result = await checkTranslationsFeature(apiV1);
        expect(result.enabled).to.be.true;
        expect(result.message).to.be.undefined;
      });

      it("should call whoami once", async () => {
        await checkTranslationsFeature(apiV1);
        expect(whoamiStub.calledOnce).to.be.true;
      });
    });

    describe("when translations feature is disabled", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            data: factory.whoami({
              account_features: {
                translations_allowed: false,
              },
            }),
          }),
        );
      });

      it("should return enabled: false with default translations message", async () => {
        const result = await checkTranslationsFeature(apiV1);
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(
          "Translations are not enabled for your account. Please contact support to enable the translations feature.",
        );
      });

      it("should return enabled: false with custom message when provided", async () => {
        const customMessage = "Custom translations disabled message";
        const result = await checkTranslationsFeature(apiV1, {
          errorMessage: customMessage,
        });
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(customMessage);
      });
    });

    describe("when account_features is missing translations_allowed property", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            data: factory.whoami({
              account_features: {},
            }),
          }),
        );
      });

      it("should return enabled: false with default message", async () => {
        const result = await checkTranslationsFeature(apiV1);
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(
          "Translations are not enabled for your account. Please contact support to enable the translations feature.",
        );
      });
    });

    describe("when account_features is undefined", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            data: factory.whoami({
              account_features: undefined,
            }),
          }),
        );
      });

      it("should return enabled: false with default message", async () => {
        const result = await checkTranslationsFeature(apiV1);
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(
          "Translations are not enabled for your account. Please contact support to enable the translations feature.",
        );
      });
    });

    describe("when whoami API call fails", () => {
      beforeEach(() => {
        whoamiStub.resolves(
          factory.resp({
            status: 401,
            statusText: "Unauthorized",
            data: { error: "Unauthorized" },
          }),
        );
      });

      it("should return enabled: false with error message about unable to retrieve account information", async () => {
        const result = await checkTranslationsFeature(apiV1);
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal(
          "Unable to retrieve account information: 401 Unauthorized",
        );
      });
    });

    describe("when whoami API call throws an exception", () => {
      beforeEach(() => {
        whoamiStub.rejects(new Error("Network error"));
      });

      it("should return enabled: false with the exception message", async () => {
        const result = await checkTranslationsFeature(apiV1);
        expect(result.enabled).to.be.false;
        expect(result.message).to.equal("Network error");
      });
    });
  });
});
