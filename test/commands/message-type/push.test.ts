import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import MessageTypeValidate from "@/commands/message-type/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { MESSAGE_TYPE_JSON, MessageTypeData } from "@/lib/marshal/message-type";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const messageTypeJsonFile = "banner/message_type.json";

const mockMessageTypeData: MessageTypeData<WithAnnotation> = {
  key: "banner",
  valid: true,
  owner: "user",
  name: "Banner",
  variants: [
    {
      key: "default",
      name: "Default",
      fields: [
        {
          type: "text",
          key: "title",
          label: "Title",
          settings: {
            required: true,
            default: "",
          },
        },
      ],
    },
  ],
  preview: "<div>{{ title }}</div>",
  semver: "0.0.1",
  description: "My little banner",
  environment: "development",
  updated_at: "2023-10-02T19:24:48.714630Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  __annotation: {
    extractable_fields: {
      preview: { default: true, file_ext: "html" },
    },
    readonly_fields: [
      "key",
      "valid",
      "owner",
      "environment",
      "semver",
      "created_at",
      "updated_at",
    ],
  },
};

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(MessageTypeValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertMessageType", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/message-type/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a message type directory exists, for the message type key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, messageTypeJsonFile);
      fs.outputJsonSync(abspath, {
        name: "Banner",
        description: "My little banner",
        variants: [
          {
            key: "default",
            name: "Default",
            fields: [
              {
                type: "text",
                key: "title",
                label: "Title",
              },
            ],
          },
        ],
        preview: "<div>{{ title }}</div>",
      });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { message_type: mockMessageTypeData } })
      .stdout()
      .command(["message-type push", "banner"])
      .it("calls apiV1 upsertMessageType with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertMessageType as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { messageTypeKey: "banner" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
              }),
          ),
          sinon.match((messageType) =>
            isEqual(messageType, {
              key: "banner",
              name: "Banner",
              description: "My little banner",
              variants: [
                {
                  key: "default",
                  name: "Default",
                  fields: [
                    {
                      type: "text",
                      key: "title",
                      label: "Title",
                    },
                  ],
                },
              ],
              preview: "<div>{{ title }}</div>",
            }),
          ),
        );
      });

    setupWithStub({ data: { message_type: mockMessageTypeData } })
      .stdout()
      .command([
        "message-type push",
        "banner",
        "--commit",
        "-m",
        "this is a commit comment!",
      ])
      .it(
        "calls apiV1 upsertMessageType with commit flags, if provided",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.upsertMessageType as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, { messageTypeKey: "banner" }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "development",
                  commit: true,
                  "commit-message": "this is a commit comment!",
                  annotate: true,
                }),
            ),
            sinon.match((messageType) =>
              isEqual(messageType, {
                key: "banner",
                name: "Banner",
                description: "My little banner",
                variants: [
                  {
                    key: "default",
                    name: "Default",
                    fields: [
                      {
                        type: "text",
                        key: "title",
                        label: "Title",
                      },
                    ],
                  },
                ],
                preview: "<div>{{ title }}</div>",
              }),
            ),
          );
        },
      );

    setupWithStub({ data: { message_type: mockMessageTypeData } })
      .stdout()
      .command(["message-type push", "banner"])
      .it("writes the upserted layout data into message_type.json", () => {
        const abspath = path.resolve(sandboxDir, messageTypeJsonFile);
        const messageTypeJson = fs.readJsonSync(abspath);

        expect(messageTypeJson).to.eql({
          name: "Banner",
          description: "My little banner",
          variants: [
            {
              key: "default",
              name: "Default",
              fields: [
                {
                  type: "text",
                  key: "title",
                  label: "Title",
                  settings: {
                    required: true,
                    default: "",
                  },
                },
              ],
            },
          ],
          "preview@": "preview.html",
        });
      });
  });

  describe("given a message_type.json file with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, messageTypeJsonFile);
      fs.outputFileSync(abspath, '{"name":"Welcome",}');

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { message_type: mockMessageTypeData } })
      .stdout()
      .command(["message-type push", "banner"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a message_type.json file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, messageTypeJsonFile);
      fs.outputJsonSync(abspath, { name: 1242 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["message-type push", "banner"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent message type directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { message_type: mockMessageTypeData } })
      .stdout()
      .command(["message-type push", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(
          /^Cannot locate a message type directory/,
        ),
      )
      .it("throws an error");
  });

  describe("given no message type key arg or --all flag", () => {
    setupWithStub({ data: { message_type: mockMessageTypeData } })
      .stdout()
      .command(["message-type push"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given both message type key arg and --all flag", () => {
    setupWithStub({ data: { message_type: mockMessageTypeData } })
      .stdout()
      .command(["message-type push", "banner", "--all"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given --all and multiple message types", () => {
    const indexDirPath = path.resolve(sandboxDir, "message-types");

    beforeEach(() => {
      const bannerMessageTypeJson = path.resolve(
        indexDirPath,
        "banner",
        MESSAGE_TYPE_JSON,
      );
      fs.outputJsonSync(bannerMessageTypeJson, {
        name: "Banner",
        variants: [
          {
            key: "default",
            name: "Default",
            fields: [
              {
                type: "text",
                key: "title",
                label: "Title",
              },
            ],
          },
        ],
        preview: "<div>{{ title }}</div>",
      });

      const modalMessageTypeJson = path.resolve(
        indexDirPath,
        "modal",
        MESSAGE_TYPE_JSON,
      );
      fs.outputJsonSync(modalMessageTypeJson, {
        name: "Modal",
        variants: [
          {
            key: "default",
            name: "Default",
            fields: [
              {
                type: "text",
                key: "title",
                label: "Title",
              },
            ],
          },
        ],
        preview: "<div>{{ title }}</div>",
      });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { message_type: mockMessageTypeData } })
      .stdout()
      .command([
        "message-type push",
        "--all",
        "--message-types-dir",
        "message-types",
      ])
      .it("calls apiV1 upsertMessageType with expected props twice", () => {
        // Validate all first
        const stub1 = MessageTypeValidate.validateAll as any;
        sinon.assert.calledOnce(stub1);

        const stub2 = KnockApiV1.prototype.upsertMessageType as any;
        sinon.assert.calledTwice(stub2);

        const expectedFlags = {
          annotate: true,
          "service-token": "valid-token",
          environment: "development",
          all: true,
          "message-types-dir": {
            abspath: indexDirPath,
            exists: true,
          },
        };

        sinon.assert.calledWith(
          stub2.firstCall,
          sinon.match(({ flags }) => isEqual(flags, expectedFlags)),
          sinon.match((messageType) =>
            isEqual(messageType, {
              key: "banner",
              name: "Banner",
              variants: [
                {
                  key: "default",
                  name: "Default",
                  fields: [
                    {
                      type: "text",
                      key: "title",
                      label: "Title",
                    },
                  ],
                },
              ],
              preview: "<div>{{ title }}</div>",
            }),
          ),
        );

        sinon.assert.calledWith(
          stub2.secondCall,
          sinon.match(({ flags }) => isEqual(flags, expectedFlags)),
          sinon.match((messageType) =>
            isEqual(messageType, {
              key: "modal",
              name: "Modal",
              variants: [
                {
                  key: "default",
                  name: "Default",
                  fields: [
                    {
                      type: "text",
                      key: "title",
                      label: "Title",
                    },
                  ],
                },
              ],
              preview: "<div>{{ title }}</div>",
            }),
          ),
        );
      });
  });
});
