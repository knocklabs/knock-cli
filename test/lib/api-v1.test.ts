import { Config } from "@oclif/core";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const dummyConfig = new Config({ root: "/path/to/bin" });

describe("lib/api-v1", () => {
  describe("listWorkflows", () => {
    it("makes a GET request to /v1/workflows with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "get").returns(
        Promise.resolve({
          status: 200,
          data: {
            entries: [],
            page_info: factory.pageInfo(),
          },
        }),
      );

      const flags = {
        environment: "staging",
        annotate: true,
        "hide-uncommitted-changes": true,
        after: "foo",
        before: "bar",
        limit: 99,
        "rogue-flag": "hey",
      };
      await apiV1.listWorkflows(factory.props({ flags }));

      const params = {
        environment: "staging",
        annotate: true,
        hide_uncommitted_changes: true,
        after: "foo",
        before: "bar",
        limit: 99,
      };
      sinon.assert.calledWith(stub, "/v1/workflows", { params });

      stub.restore();
    });
  });

  describe("getWorkflow", () => {
    it("makes a GET request to /v1/workflows/:workflowKey with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "get").returns(
        Promise.resolve({
          data: factory.workflow(),
        }),
      );

      const args = { workflowKey: "foo" };
      const flags = {
        environment: "staging",
        annotate: true,
        "hide-uncommitted-changes": true,
        "rogue-flag": "hey",
      };
      await apiV1.getWorkflow(factory.props({ args, flags }));

      const params = {
        environment: "staging",
        annotate: true,
        hide_uncommitted_changes: true,
      };
      sinon.assert.calledWith(stub, "/v1/workflows/foo", { params });

      stub.restore();
    });
  });

  describe("upsertWorkflow", () => {
    it("makes a PUT request to /v1/workflows/:workflowKey with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "put").returns(
        Promise.resolve({
          data: factory.workflow(),
        }),
      );

      const args = { workflowKey: "foo" };
      const flags = {
        environment: "development",
        annotate: true,
        commit: true,
        "commit-message": "wip workflow",
        "rogue-flag": "hey",
      };
      const workflow = {
        name: "New campaign",
      };
      await apiV1.upsertWorkflow(factory.props({ args, flags }), workflow);

      const params = {
        environment: "development",
        annotate: true,
        commit: true,
        commit_message: "wip workflow",
      };
      sinon.assert.calledWith(
        stub,
        "/v1/workflows/foo",
        { workflow },
        { params },
      );

      stub.restore();
    });
  });

  describe("validateWorkflow", () => {
    it("makes a PUT request to /v1/workflows/:workflowKey/validate with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "put").returns(
        Promise.resolve({
          data: factory.workflow(),
        }),
      );

      const args = { workflowKey: "bar" };
      const flags = {
        environment: "development",
        "rogue-flag": "hey",
      };
      const workflow = {
        name: "New campaign",
      };
      await apiV1.validateWorkflow(factory.props({ args, flags }), workflow);

      const params = {
        environment: "development",
      };
      sinon.assert.calledWith(
        stub,
        "/v1/workflows/bar/validate",
        { workflow },
        { params },
      );

      stub.restore();
    });
  });

  describe("activateWorkflow", () => {
    it("makes a PUT request to /v1/workflows/:workflowKey/activate with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "put").returns(
        Promise.resolve({
          data: factory.workflow(),
        }),
      );

      const args = { workflowKey: "baz" };
      const flags = {
        environment: "development",
        status: false,
        "rogue-flag": "hey",
      };
      await apiV1.activateWorkflow(factory.props({ args, flags }));

      const params = {
        environment: "development",
        status: false,
      };
      sinon.assert.calledWith(
        stub,
        "/v1/workflows/baz/activate",
        {},
        { params },
      );

      stub.restore();
    });
  });

  describe("commitAllChanges", () => {
    it("makes a PUT request to /v1/commits with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "put").returns(
        Promise.resolve({
          data: { result: "success" },
        }),
      );

      const args = {};
      const flags = {
        environment: "development",
        "commit-message": "latest changes",
        "rogue-flag": "hey",
      };
      await apiV1.commitAllChanges(factory.props({ args, flags }));

      const params = {
        environment: "development",
        commit_message: "latest changes",
      };
      sinon.assert.calledWith(stub, "/v1/commits", {}, { params });

      stub.restore();
    });
  });

  describe("promoteAllChanges", () => {
    it("makes a PUT request to /v1/commits/promote with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "put").returns(
        Promise.resolve({
          data: { result: "success" },
        }),
      );

      const args = {};
      const flags = {
        to: "staging",
        "rogue-flag": "hey",
      };
      await apiV1.promoteAllChanges(factory.props({ args, flags }));

      const params = {
        to_environment: "staging",
      };
      sinon.assert.calledWith(stub, "/v1/commits/promote", {}, { params });

      stub.restore();
    });
  });

  describe("listTranslations", () => {
    it("makes a GET request to /v1/translations with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "get").returns(
        Promise.resolve({
          status: 200,
          data: {
            entries: [],
            page_info: factory.pageInfo(),
          },
        }),
      );

      const flags = {
        environment: "staging",
        annotate: true,
        "hide-uncommitted-changes": true,
        after: "foo",
        before: "bar",
        limit: 99,
      };
      await apiV1.listTranslations(factory.props({ flags }));

      const params = {
        environment: "staging",
        hide_uncommitted_changes: true,
        after: "foo",
        before: "bar",
        limit: 99,
      };
      sinon.assert.calledWith(stub, "/v1/translations", { params });

      stub.restore();
    });
  });

  describe("upsertTranslation", () => {
    it("makes a PUT request to /v1/translations/:locale with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "put").returns(
        Promise.resolve({
          data: factory.translation(),
        }),
      );

      const flags = {
        environment: "development",
        annotate: true,
        commit: true,
        "commit-message": "french translation",
        "rogue-flag": "hey",
      };
      const translation = {
        locale_code: "fr-FR",
        namespace: "tasks",
        content: '{"hello":"Bonjour"}',
      };
      await apiV1.upsertTranslation(factory.props({ flags }), translation);

      const params = {
        environment: "development",
        commit: true,
        commit_message: "french translation",
        namespace: "tasks",
      };
      sinon.assert.calledWith(
        stub,
        "/v1/translations/fr-FR",
        { translation },
        { params },
      );

      stub.restore();
    });
  });

  describe("validateTranslation", () => {
    it("makes a PUT request to /v1/translations/:locale/validate with supported params", async () => {
      const apiV1 = new KnockApiV1(factory.gFlags(), dummyConfig);

      const stub = sinon.stub(apiV1.client, "put").returns(
        Promise.resolve({
          data: factory.translation(),
        }),
      );

      const flags = {
        environment: "development",
        "rogue-flag": "hey",
      };
      const translation = {
        locale_code: "fr-FR",
        namespace: "admin",
        content: '{"hello":"Bonjour"}',
      };
      await apiV1.validateTranslation(factory.props({ flags }), translation);

      const params = {
        environment: "development",
        namespace: "admin",
      };
      sinon.assert.calledWith(
        stub,
        "/v1/translations/fr-FR/validate",
        { translation },
        { params },
      );

      stub.restore();
    });
  });
});
