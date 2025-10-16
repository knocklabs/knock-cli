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

      it("should return true for translations_allowed feature", async () => {
        const result = await checkAccountFeature(
          apiV1,
          "translations_allowed" as FeatureName,
        );
        expect(result).to.be.true;
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

      it("should throw an error with default message", async () => {
        try {
          await checkAccountFeature(
            apiV1,
            "translations_allowed" as FeatureName,
          );
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(
            "The translations_allowed feature is not enabled for your account. Please contact support to enable this feature.",
          );
        }
      });

      it("should throw an error with custom message when provided", async () => {
        const customMessage = "Custom error message for disabled feature";
        try {
          await checkAccountFeature(
            apiV1,
            "translations_allowed" as FeatureName,
            {
              errorMessage: customMessage,
            },
          );
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(customMessage);
        }
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

      it("should throw an error", async () => {
        try {
          await checkAccountFeature(
            apiV1,
            "translations_allowed" as FeatureName,
          );
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(
            "The translations_allowed feature is not enabled for your account. Please contact support to enable this feature.",
          );
        }
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

      it("should throw an error", async () => {
        try {
          await checkAccountFeature(
            apiV1,
            "translations_allowed" as FeatureName,
          );
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(
            "The translations_allowed feature is not enabled for your account. Please contact support to enable this feature.",
          );
        }
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

      it("should throw an error about unable to retrieve account information", async () => {
        try {
          await checkAccountFeature(
            apiV1,
            "translations_allowed" as FeatureName,
          );
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(
            "Unable to retrieve account information: 400 Bad Request",
          );
        }
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

      it("should throw an error about unable to retrieve account information", async () => {
        try {
          await checkAccountFeature(
            apiV1,
            "translations_allowed" as FeatureName,
          );
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(
            "Unable to retrieve account information: 500 Internal Server Error",
          );
        }
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

      it("should return true", async () => {
        const result = await checkTranslationsFeature(apiV1);
        expect(result).to.be.true;
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

      it("should throw an error with default translations message", async () => {
        try {
          await checkTranslationsFeature(apiV1);
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(
            "Translations are not enabled for your account. Please contact support to enable the translations feature.",
          );
        }
      });

      it("should throw an error with custom message when provided", async () => {
        const customMessage = "Custom translations disabled message";
        try {
          await checkTranslationsFeature(apiV1, {
            errorMessage: customMessage,
          });
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(customMessage);
        }
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

      it("should throw an error", async () => {
        try {
          await checkTranslationsFeature(apiV1);
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(
            "Translations are not enabled for your account. Please contact support to enable the translations feature.",
          );
        }
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

      it("should throw an error about unable to retrieve account information", async () => {
        try {
          await checkTranslationsFeature(apiV1);
          expect.fail("Expected error to be thrown");
        } catch (error) {
          expect((error as Error).message).to.equal(
            "Unable to retrieve account information: 401 Unauthorized",
          );
        }
      });
    });
  });
});
