import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { LAYOUT_JSON } from "@/lib/marshal/email-layout";

const layoutJsonFile = "default/layout.json";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "validateEmailLayout", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/layout/validate (a single layout)", () => {
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

    setupWithStub()
      .stdout()
      .command(["layout validate", "default"])
      .it("calls apiV1 validateEmailLayout with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateEmailLayout as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { emailLayoutKey: "default" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
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
  });

  describe("given a layout.json file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, layoutJsonFile);
      fs.outputFileSync(abspath, '{"name":"Default",}');

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["layout validate", "default"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a layout.json file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, layoutJsonFile);
      fs.outputJsonSync(abspath, { name: 123 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["layout validate", "default"])
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

    setupWithStub()
      .stdout()
      .command(["layout validate", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate a layout directory/),
      )
      .it("throws an error");
  });

  describe("given no layout key arg nor --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["layout validate"])
      .exit(2)
      .it("exists with status 2");
  });
});

describe("commands/layout/validate (all layouts)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a nonexistent layouts index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["layout validate", "--all", "--layouts-dir", "layouts"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate layout directories in/),
      )
      .it("throws an error");
  });

  describe("given a layout index directory, without any layouts", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "layouts");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["layout validate", "--all", "--layouts-dir", "layouts"])
      .catch((error) =>
        expect(error.message).to.match(/No layout directories found in/),
      )
      .it("throws an error");
  });

  describe("given a layouts index directory with 2 valid layouts", () => {
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

    setupWithStub()
      .stdout()
      .command(["layout validate", "--all", "--layouts-dir", "layouts"])
      .it("calls apiV1 validateEmailLayout with expected props twice", () => {
        const stub = KnockApiV1.prototype.validateEmailLayout as any;
        sinon.assert.calledTwice(stub);

        const expectedArgs = {};
        const expectedFlags = {
          "service-token": "valid-token",
          environment: "development",
          all: true,
          "layouts-dir": {
            abspath: indexDirPath,
            exists: true,
          },
        };

        // First validate call
        sinon.assert.calledWith(
          stub.firstCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((layout) =>
            isEqual(layout, { key: "messages", name: "Messages" }),
          ),
        );

        // Second validate call
        sinon.assert.calledWith(
          stub.secondCall,
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

  describe("given a layouts index directory, with 1 valid and 1 invalid layouts", () => {
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
      fs.outputJsonSync(transactionalLayoutJson, { name: 1234 });

      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateEmailLayout", (stub) =>
        stub
          .onFirstCall()
          .resolves(
            factory.resp({
              status: 422,
              data: {
                errors: [{ field: "name", message: "must be a string" }],
              },
            }),
          )
          .onSecondCall()
          .resolves(factory.resp()),
      )
      .stdout()
      .command(["layout validate", "--all", "--layouts-dir", "layouts"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError: data at "name" must be a string/,
        ),
      )
      .it("calls apiV1 validateEmailLayout twice, then errors", () => {
        const stub = KnockApiV1.prototype.validateEmailLayout as any;
        sinon.assert.calledTwice(stub);
      });
  });
});
