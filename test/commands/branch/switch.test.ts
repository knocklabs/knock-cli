import * as path from "node:path";

import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import { BRANCH_FILE_NAME } from "@/lib/helpers/branch";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();
const branchFilePath = path.resolve(sandboxDir, BRANCH_FILE_NAME);

describe("commands/branch/switch", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a valid branch slug", () => {
    beforeEach(() => {
      fs.ensureFileSync(branchFilePath);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "get", (stub) =>
        stub.resolves(factory.branch({ slug: "my-feature-branch-123" })),
      )
      .stdout()
      .command(["branch switch", "my-feature-branch-123"])
      .it(
        "fetches branch, updates .knock_current_branch file, and displays success message",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.prototype.get as any,
            "/v1/branches/my-feature-branch-123",
          );

          expect(fs.readFileSync(branchFilePath, "utf-8")).to.equal(
            "my-feature-branch-123\n",
          );

          expect(ctx.stdout).to.contain(
            "‣ Successfully switched to branch `my-feature-branch-123`",
          );
        },
      );
  });

  describe("given an argument containing mixed casing and whitespace", () => {
    beforeEach(() => {
      fs.ensureFileSync(branchFilePath);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "get", (stub) =>
        stub.resolves(factory.branch()),
      )
      .command(["branch switch", " Mixed Case   With Whitespace "])
      .it("slugifies input before fetching branch", () => {
        sinon.assert.calledWith(
          KnockMgmt.prototype.get as any,
          "/v1/branches/mixed-case-with-whitespace",
        );
      });
  });

  describe("given an invalid branch slug", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(
        // Attempts to pass in whitespace as the slug
        ["branch switch", " "],
      )
      .catch(/Invalid slug provided/)
      .it("throws an error");
  });

  describe("given no service token", () => {
    test
      .command(["branch switch", "my-feature-branch-123"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("when the given branch does not exist", () => {
    beforeEach(() => {
      fs.ensureFileSync(branchFilePath);
    });

    describe("and the --create flag is not provided", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockMgmt.prototype, "get", (stub) =>
          stub.rejects(
            new KnockMgmt.APIError(
              404,
              {
                code: "branch_not_found",
                message:
                  "The branch you specified was not found in this project",
                status: 404,
                type: "invalid_request_error",
              },
              undefined,
              new Headers(),
            ),
          ),
        )
        .command(["branch switch", "nonexistent-branch"])
        .catch(
          /The branch you specified was not found in this project \(status: 404\)/,
        )
        .it("throws error when API returns error");
    });

    describe("and the --create flag is provided", () => {
      // TODO
    });
  });

  describe("given no branch file exists", () => {
    describe("and no ancestor directory contains a .gitignore file", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockMgmt.prototype, "get", (stub) =>
          stub.resolves(factory.branch({ slug: "my-feature-branch-123" })),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "y" }).onSecondCall().resolves(),
        )
        .stdout()
        .command(["branch switch", "my-feature-branch-123"])
        .it(
          "creates branch file in current directory when first prompt is accepted by user",
          (ctx) => {
            sinon.assert.calledWith(enquirer.prototype.prompt as any, {
              type: "confirm",
              name: "input",
              message: `Create \`${BRANCH_FILE_NAME}\` at ${sandboxDir}?`,
            });

            sinon.assert.calledWith(
              KnockMgmt.prototype.get as any,
              "/v1/branches/my-feature-branch-123",
            );

            // branch file should be created
            expect(fs.readFileSync(branchFilePath, "utf-8")).to.equal(
              "my-feature-branch-123\n",
            );

            const gitIgnoreFilePath = path.resolve(sandboxDir, ".gitignore");

            sinon.assert.calledWith(enquirer.prototype.prompt as any, {
              type: "confirm",
              name: "input",
              message: `Create \`${gitIgnoreFilePath}\` to ignore \`${BRANCH_FILE_NAME}\`?`,
            });

            // .gitignore file should NOT be created
            expect(fs.existsSync(gitIgnoreFilePath)).to.equal(false);

            expect(ctx.stdout).to.contain(
              "‣ Successfully switched to branch `my-feature-branch-123`",
            );
          },
        );

      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockMgmt.prototype, "get", (stub) =>
          stub.resolves(factory.branch({ slug: "my-feature-branch-123" })),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "y" })
            .onSecondCall()
            .resolves({ input: "y" }),
        )
        .stdout()
        .command(["branch switch", "my-feature-branch-123"])
        .it(
          "creates branch file and .gitignore in current directory when both prompts are accepted by user",
          (ctx) => {
            sinon.assert.calledWith(enquirer.prototype.prompt as any, {
              type: "confirm",
              name: "input",
              message: `Create \`${BRANCH_FILE_NAME}\` at ${sandboxDir}?`,
            });

            sinon.assert.calledWith(
              KnockMgmt.prototype.get as any,
              "/v1/branches/my-feature-branch-123",
            );

            // branch file should be created
            expect(fs.readFileSync(branchFilePath, "utf-8")).to.equal(
              "my-feature-branch-123\n",
            );

            const gitIgnoreFilePath = path.resolve(sandboxDir, ".gitignore");

            sinon.assert.calledWith(enquirer.prototype.prompt as any, {
              type: "confirm",
              name: "input",
              message: `Create \`${gitIgnoreFilePath}\` to ignore \`${BRANCH_FILE_NAME}\`?`,
            });

            // .gitignore file should be created
            expect(fs.existsSync(gitIgnoreFilePath)).to.equal(true);
            expect(fs.readFileSync(gitIgnoreFilePath, "utf-8")).to.equal(
              `# Knock CLI config files\n${BRANCH_FILE_NAME}\n`,
            );

            expect(ctx.stdout).to.contain(
              "‣ Successfully switched to branch `my-feature-branch-123`",
            );
          },
        );
    });

    describe("and ancestor directory contains a .gitignore file", () => {
      beforeEach(() => {
        const gitIgnoreFilePath = path.resolve(sandboxDir, ".gitignore");
        fs.ensureFileSync(gitIgnoreFilePath);
        fs.writeFileSync(gitIgnoreFilePath, "foo\n");

        const descendantDir = path.resolve(sandboxDir, "a", "b");
        fs.ensureDirSync(descendantDir);
        process.chdir(descendantDir);
      });

      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockMgmt.prototype, "get", (stub) =>
          stub.resolves(factory.branch({ slug: "my-feature-branch-123" })),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "y" }).onSecondCall().resolves(),
        )
        .stdout()
        .command(["branch switch", "my-feature-branch-123"])
        .it(
          "creates branch file in directory containing .gitignore when first prompt is accepted by user",
          (ctx) => {
            sinon.assert.calledWith(enquirer.prototype.prompt as any, {
              type: "confirm",
              name: "input",
              message: `Create \`${BRANCH_FILE_NAME}\` at ${sandboxDir}?`,
            });

            sinon.assert.calledWith(
              KnockMgmt.prototype.get as any,
              "/v1/branches/my-feature-branch-123",
            );

            // branch file should be created
            expect(fs.readFileSync(branchFilePath, "utf-8")).to.equal(
              "my-feature-branch-123\n",
            );

            const gitIgnoreFilePath = path.resolve(sandboxDir, ".gitignore");

            sinon.assert.calledWith(enquirer.prototype.prompt as any, {
              type: "confirm",
              name: "input",
              message: `Update \`${gitIgnoreFilePath}\` to ignore \`${BRANCH_FILE_NAME}\`?`,
            });

            // .gitignore file should NOT be updated
            expect(fs.existsSync(gitIgnoreFilePath)).to.equal(true);
            expect(fs.readFileSync(gitIgnoreFilePath, "utf-8")).not.to.contain(
              BRANCH_FILE_NAME,
            );

            expect(ctx.stdout).to.contain(
              "‣ Successfully switched to branch `my-feature-branch-123`",
            );
          },
        );

      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockMgmt.prototype, "get", (stub) =>
          stub.resolves(factory.branch({ slug: "my-feature-branch-123" })),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "y" })
            .onSecondCall()
            .resolves({ input: "y" }),
        )
        .stdout()
        .command(["branch switch", "my-feature-branch-123"])
        .it(
          "creates branch file in directory containing .gitignore and updates .gitignore when both prompts are accepted by user",
          (ctx) => {
            sinon.assert.calledWith(enquirer.prototype.prompt as any, {
              type: "confirm",
              name: "input",
              message: `Create \`${BRANCH_FILE_NAME}\` at ${sandboxDir}?`,
            });

            sinon.assert.calledWith(
              KnockMgmt.prototype.get as any,
              "/v1/branches/my-feature-branch-123",
            );

            // branch file should be created
            expect(fs.readFileSync(branchFilePath, "utf-8")).to.equal(
              "my-feature-branch-123\n",
            );

            const gitIgnoreFilePath = path.resolve(sandboxDir, ".gitignore");

            sinon.assert.calledWith(enquirer.prototype.prompt as any, {
              type: "confirm",
              name: "input",
              message: `Update \`${gitIgnoreFilePath}\` to ignore \`${BRANCH_FILE_NAME}\`?`,
            });

            // .gitignore file should be updated
            expect(fs.existsSync(gitIgnoreFilePath)).to.equal(true);
            expect(fs.readFileSync(gitIgnoreFilePath, "utf-8")).to.contain(
              BRANCH_FILE_NAME,
            );

            expect(ctx.stdout).to.contain(
              "‣ Successfully switched to branch `my-feature-branch-123`",
            );
          },
        );
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "get", (stub) =>
        stub.resolves(factory.branch({ slug: "my-feature-branch-123" })),
      )
      .stub(enquirer.prototype, "prompt", (stub) => stub.resolves())
      .stdout()
      .command(["branch switch", "my-feature-branch-123"])
      .it(
        "does not create branch file or .gitignore when prompt is declined by user",
        () => {
          // User should only be prompted once, to create the branch file
          sinon.assert.calledOnceWithExactly(enquirer.prototype.prompt as any, {
            type: "confirm",
            name: "input",
            message: `Create \`${BRANCH_FILE_NAME}\` at ${sandboxDir}?`,
          });

          sinon.assert.notCalled(KnockMgmt.prototype.get as any);

          // branch file should NOT be created
          expect(fs.existsSync(branchFilePath)).to.equal(false);

          // .gitignore file should NOT be created
          const gitIgnoreFilePath = path.resolve(sandboxDir, ".gitignore");
          expect(fs.existsSync(gitIgnoreFilePath)).to.equal(false);
        },
      );
  });
});
