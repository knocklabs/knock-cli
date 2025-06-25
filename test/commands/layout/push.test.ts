import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import EmailLayoutValidate from "@/commands/layout/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { EmailLayoutData, LAYOUT_JSON } from "@/lib/marshal/email-layout";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const layoutJsonFile = "default/layout.json";

const mockEmailLayoutData: EmailLayoutData<WithAnnotation> = {
  key: "default",
  name: "Default",
  html_layout: `
    <!doctype html>
    <html>
    <body>
    <p>This is some example text</p>
    </body>
    </html>
    `.trimStart(),
  text_layout: "Text {{ content }}",
  footer_links: [],
  environment: "development",
  updated_at: "2023-09-29T19:08:04.129228Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {
      html_layout: { default: true, file_ext: "html" },
      text_layout: { default: true, file_ext: "txt" },
    },
    readonly_fields: ["environment", "key", "created_at", "updated_at", "sha"],
  },
};

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(EmailLayoutValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertEmailLayout", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/layout/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a layout directory exists, for the layout key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, layoutJsonFile);
      fs.outputJsonSync(abspath, { name: "Default" });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { email_layout: mockEmailLayoutData } })
      .stdout()
      .command(["layout push", "default"])
      .it("calls apiV1 upsertEmailLayout with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertEmailLayout as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { emailLayoutKey: "default" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
              }),
          ),
          sinon.match((layout) =>
            isEqual(layout, {
              key: "default",
              name: "Default",
            }),
          ),
        );
      });

    setupWithStub({ data: { email_layout: mockEmailLayoutData } })
      .stdout()
      .command([
        "layout push",
        "default",
        "--commit",
        "-m",
        "this is a commit comment!",
      ])
      .it(
        "calls apiV1 upsertEmailLayout with commit flags, if provided",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.upsertEmailLayout as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, { emailLayoutKey: "default" }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "development",
                  commit: true,
                  "commit-message": "this is a commit comment!",
                  annotate: true,
                }),
            ),
            sinon.match((layout) =>
              isEqual(layout, {
                key: "default",
                name: "Default",
              }),
            ),
          );
        },
      );

    setupWithStub({ data: { email_layout: mockEmailLayoutData } })
      .stdout()
      .command(["layout push", "default"])
      .it("writes the upserted layout data into layout.json", () => {
        const abspath = path.resolve(sandboxDir, layoutJsonFile);
        const emailLayoutJson = fs.readJsonSync(abspath);

        expect(emailLayoutJson).to.eql({
          name: "Default",
          footer_links: [],
          "html_layout@": "html_layout.html",
          "text_layout@": "text_layout.txt",
          __readonly: {
            key: "default",
            environment: "development",
            created_at: "2023-09-18T18:32:18.398053Z",
          },
        });
      });
  });

  describe("given a layout.json file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, layoutJsonFile);
      fs.outputFileSync(abspath, '{"name":"default",}');

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { email_layout: mockEmailLayoutData } })
      .stdout()
      .command(["layout push", "default"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a layout.json file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, layoutJsonFile);
      fs.outputJsonSync(abspath, { name: 1242 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["layout push", "default"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent layout directory, for the layout key", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { email_layout: mockEmailLayoutData } })
      .stdout()
      .command(["layout push", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate a layout directory/),
      )
      .it("throws an error");
  });

  describe("given no email layout key arg or --all flag", () => {
    setupWithStub({ data: { email_layout: mockEmailLayoutData } })
      .stdout()
      .command(["layout push"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given both email layout key arg and --all flag", () => {
    setupWithStub({ data: { email_layout: mockEmailLayoutData } })
      .stdout()
      .command(["layout push", "default", "--all"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given --all and a nonexistent layouts index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["layout push", "--all", "--layouts-dir", "layouts"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate layout directories in/),
      )
      .it("throws an error");
  });

  describe("given --all and a layouts index directory, without any layouts", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "layouts");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["layout push", "--all", "--layouts-dir", "layouts"])
      .catch((error) =>
        expect(error.message).to.match(/No layout directories found in/),
      )
      .it("throws an error");
  });

  describe("given --all and a layouts index directory with 2 layouts", () => {
    const indexDirPath = path.resolve(sandboxDir, "layouts");

    beforeEach(() => {
      const messagesLayoutJson = path.resolve(
        indexDirPath,
        "messages",
        LAYOUT_JSON,
      );
      fs.outputJsonSync(messagesLayoutJson, { name: "Messages" });

      const transactionalLayoutJson = path.resolve(
        indexDirPath,
        "transactional",
        LAYOUT_JSON,
      );
      fs.outputJsonSync(transactionalLayoutJson, { name: "Transactional" });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { email_layout: mockEmailLayoutData } })
      .stdout()
      .command(["layout push", "--all", "--layouts-dir", "layouts"])
      .it("calls apiV1 upserted with expected props twice", () => {
        // Validate all first
        const stub1 = EmailLayoutValidate.validateAll as any;
        sinon.assert.calledOnce(stub1);

        const stub2 = KnockApiV1.prototype.upsertEmailLayout as any;
        sinon.assert.calledTwice(stub2);

        const expectedArgs = {};
        const expectedFlags = {
          annotate: true,
          "service-token": "valid-token",
          environment: "development",
          all: true,
          "layouts-dir": {
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
          sinon.match((layout) =>
            isEqual(layout, { key: "messages", name: "Messages" }),
          ),
        );

        // Second upsert call
        sinon.assert.calledWith(
          stub2.secondCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((layout) =>
            isEqual(layout, { key: "transactional", name: "Transactional" }),
          ),
        );
      });
  });
});
