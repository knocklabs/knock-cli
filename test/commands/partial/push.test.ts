import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import PartialValidate from "@/commands/partial/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { PARTIAL_JSON, PartialData, PartialType } from "@/lib/marshal/partial";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const partialJsonFile = "default/partial.json";

const mockPartialData: PartialData<WithAnnotation> = {
  key: "default",
  name: "Default",
  type: PartialType.Html,
  valid: true,
  visual_block_enabled: true,
  description: "This is a default partial",
  icon_name: "Microphone",
  content: `
    <!doctype html>
    <html>
    <body>
    <p>This is some example text</p>
    </body>
    </html>
    `.trimStart(),
  environment: "development",
  updated_at: "2023-09-29T19:08:04.129228Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  __annotation: {
    extractable_fields: {
      content: { default: true, file_ext: "txt" },
    },
    readonly_fields: [
      "environment",
      "key",
      "type",
      "valid",
      "created_at",
      "updated_at",
    ],
  },
};

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(PartialValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertPartial", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/partial/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a partial directory exists, for the partial key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, partialJsonFile);
      fs.outputJsonSync(abspath, { name: "Default" });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { partial: mockPartialData } })
      .stdout()
      .command(["partial push", "default"])
      .it("calls apiV1 upsertPartial with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertPartial as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { partialKey: "default" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
              }),
          ),
          sinon.match((partial) =>
            isEqual(partial, {
              key: "default",
              name: "Default",
            }),
          ),
        );
      });

    setupWithStub({ data: { partial: mockPartialData } })
      .stdout()
      .command([
        "partial push",
        "default",
        "--commit",
        "-m",
        "this is a commit comment!",
      ])
      .it("calls apiV1 upsertPartial with commit flags, if provided", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertPartial as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { partialKey: "default" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                commit: true,
                "commit-message": "this is a commit comment!",
                annotate: true,
              }),
          ),
          sinon.match((partial) =>
            isEqual(partial, {
              key: "default",
              name: "Default",
            }),
          ),
        );
      });

    setupWithStub({ data: { partial: mockPartialData } })
      .stdout()
      .command(["partial push", "default"])
      .it("writes the upserted partial data into partial.json", () => {
        const abspath = path.resolve(sandboxDir, partialJsonFile);
        const partialJson = fs.readJsonSync(abspath);

        expect(partialJson).to.eql({
          name: "Default",
          "content@": "content.html",
          description: "This is a default partial",
          icon_name: "Microphone",
          visual_block_enabled: true,
          __readonly: {
            valid: true,
            type: "html",
            key: "default",
            environment: "development",
            created_at: "2023-09-18T18:32:18.398053Z",
            updated_at: "2023-09-29T19:08:04.129228Z",
          },
        });
      });
  });

  describe("given a partial.json file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, partialJsonFile);
      fs.outputFileSync(abspath, '{"name":"default",}');

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { partial: mockPartialData } })
      .stdout()
      .command(["partial push", "default"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a partial.json file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, partialJsonFile);
      fs.outputJsonSync(abspath, { name: 1242 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["partial push", "default"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent partial directory, for the partial key", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { partial: mockPartialData } })
      .stdout()
      .command(["partial push", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate a partial directory/),
      )
      .it("throws an error");
  });

  describe("given no partial key arg or --all flag", () => {
    setupWithStub({ data: { partial: mockPartialData } })
      .stdout()
      .command(["partial push"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given both partial key arg and --all flag", () => {
    setupWithStub({ data: { partial: mockPartialData } })
      .stdout()
      .command(["partial push", "default", "--all"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given --all and a nonexistent partials index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["partial push", "--all", "--partials-dir", "partials"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate partial directories in/),
      )
      .it("throws an error");
  });

  describe("given --all and a partials index directory, without any partials", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "partials");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["partial push", "--all", "--partials-dir", "partials"])
      .catch((error) =>
        expect(error.message).to.match(/No partial directories found in/),
      )
      .it("throws an error");
  });

  describe("given --all and a partials index directory with 2 partials", () => {
    const indexDirPath = path.resolve(sandboxDir, "partials");

    beforeEach(() => {
      const messagesPartialJson = path.resolve(
        indexDirPath,
        "messages",
        PARTIAL_JSON,
      );
      fs.outputJsonSync(messagesPartialJson, { name: "Messages" });

      const transactionalPartialJson = path.resolve(
        indexDirPath,
        "transactional",
        PARTIAL_JSON,
      );
      fs.outputJsonSync(transactionalPartialJson, { name: "Transactional" });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { partial: mockPartialData } })
      .stdout()
      .command(["partial push", "--all", "--partials-dir", "partials"])
      .it("calls apiV1 upserted with expected props twice", () => {
        // Validate all first
        const stub1 = PartialValidate.validateAll as any;
        sinon.assert.calledOnce(stub1);

        const stub2 = KnockApiV1.prototype.upsertPartial as any;
        sinon.assert.calledTwice(stub2);

        const expectedArgs = {};
        const expectedFlags = {
          annotate: true,
          "service-token": "valid-token",
          environment: "development",
          all: true,
          "partials-dir": {
            abspath: indexDirPath,
            exists: true,
          },
        };

        // First upsert call
        sinon.assert.calledWith(
          stub2.firstCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((partial) =>
            isEqual(partial, { key: "messages", name: "Messages" }),
          ),
        );

        // Second upsert call
        sinon.assert.calledWith(
          stub2.secondCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((partial) =>
            isEqual(partial, { key: "transactional", name: "Transactional" }),
          ),
        );
      });
  });
});
