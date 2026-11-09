import { PassThrough } from "node:stream";
import timers from "node:timers/promises";
import { stripVTControlCharacters } from "node:util";

import { expect, test } from "@oclif/test";
import nock from "nock";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import auth from "@/lib/auth";
import * as CustomFlags from "@/lib/helpers/flag";
import { UserConfig, UserConfigStore } from "@/lib/user-config";

const API_ORIGIN = "https://control.knock.app";
const NEXT_OFFSET = "session:00000000000000000002";

const UUID = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/;

const textDelta = {
  type: "textContent",
  seq: 0,
  version: 1,
  storedEventId: "stored-1",
  value: { type: "delta", value: "Done" },
};

const textComplete = {
  type: "textContent",
  seq: 1,
  version: 1,
  storedEventId: "stored-1",
  value: { type: "complete", value: "Done, added the step." },
};

const toolCall = {
  type: "toolCall",
  seq: 2,
  version: 1,
  storedEventId: "stored-2",
  value: {
    type: "complete",
    name: "upsert_workflow",
    callId: "call_1",
    arguments: '{"key":"welcome"}',
  },
};

const toolResponse = {
  type: "toolResponse",
  seq: 3,
  version: 1,
  storedEventId: "stored-3",
  value: {
    name: "upsert_workflow",
    callId: "call_1",
    status: "success",
    value: "ok",
    durationMs: 42,
  },
};

const modifiedResource = {
  type: "signal",
  seq: 4,
  version: 1,
  storedEventId: "stored-4",
  value: {
    type: "knock:session",
    action: "modified_resources_updated",
    resource_type: "workflow",
    resource_key: "welcome",
    resource_action: "update",
  },
};

const runEnd = {
  type: "runEnd",
  seq: 5,
  version: 1,
  storedEventId: "stored-5",
};

const runError = {
  type: "runError",
  seq: 5,
  version: 1,
  storedEventId: "stored-5",
  value: "The model is unavailable",
};

const allEvents = [
  textDelta,
  textComplete,
  toolCall,
  toolResponse,
  modifiedResource,
  runEnd,
];

const journalHeaders = (upToDate = true) => ({
  "stream-next-offset": NEXT_OFFSET,
  ...(upToDate ? { "stream-up-to-date": "true" } : {}),
});

const sseFrames = (events: unknown[], upToDate = true): string =>
  [
    `event: data\ndata: ${JSON.stringify(events)}\n\n`,
    `event: control\ndata: ${JSON.stringify({
      streamNextOffset: NEXT_OFFSET,
      upToDate,
    })}\n\n`,
  ].join("");

const api = () => nock(API_ORIGIN);

const SESSION_ID = "3f2a6c1e-8b4d-4f7a-9c2e-5d1b0a7e6f43";
const JOURNAL_END = "session:00000000000000000009";

// An earlier run in the session, on a branch.
const earlierRun = [
  {
    type: "prompt",
    seq: 0,
    version: 1,
    storedEventId: "stored-0",
    value: {
      role: "user",
      value: "Add a welcome workflow",
      context: [{ type: "environment", value: "my-feature" }],
      mode: "default",
    },
  },
  { type: "runEnd", seq: 1, version: 1, storedEventId: "stored-1" },
];

let runBody: Record<string, any>;

const mockJournal = (events: unknown[] = earlierRun) =>
  api()
    .get(`/agent/sessions/${SESSION_ID}/events`)
    .query({ offset: "-1" })
    .reply(200, events as nock.Body, {
      "stream-next-offset": JOURNAL_END,
      "stream-up-to-date": "true",
    });

const mockFollowUp = () => {
  api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });

  api()
    .post(`/agent/sessions/${SESSION_ID}/runs`, (body) => {
      runBody = body;
      return true;
    })
    .matchHeader("prefer", "respond-async")
    .reply(202, (_uri, body: any) => ({
      session_id: body.id,
      run_id: body.run_id,
      status: "accepted",
    }));
};

let createBody: Record<string, any>;

const mockStart = () => {
  api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });

  api()
    .post("/agent/sessions", (body) => {
      createBody = body;
      return true;
    })
    .matchHeader("prefer", "respond-async")
    .reply(202, (_uri, body: any) => ({
      session_id: body.id,
      run_id: body.run_id,
      status: "accepted",
    }));
};

const eventsPath = /^\/agent\/sessions\/[\da-f-]+\/events/;

const mockEvents = (offset: string, events: unknown[], upToDate = true) =>
  api()
    .get(eventsPath)
    .query({ offset })
    .reply(200, events as nock.Body, journalHeaders(upToDate));

const mockLiveEvents = (offset: string, body: string) =>
  api()
    .get(eventsPath)
    .query({ offset, live: "sse" })
    .reply(200, body, { "content-type": "text/event-stream" });

describe("commands/agent", () => {
  const originalStdin = process.stdin;
  const originalIsTTY = process.stdout.isTTY;
  let sleep: sinon.SinonStub;

  beforeEach(() => {
    nock.disableNetConnect();
    createBody = {};
    runBody = {};
    sleep = sinon.stub(timers, "setTimeout").resolves();
  });

  afterEach(() => {
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: originalStdin,
    });
    process.stdout.isTTY = originalIsTTY;
    process.exitCode = undefined;
    sleep.restore();
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("given no prompt arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["agent"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a blank prompt", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["agent", "   ", "--response-only"])
      .catch(/The prompt is empty/)
      .it("doesn't start a session", () => {
        expect(createBody).to.eql({});
      });
  });

  describe("given --response-only", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("starts a session and prints the response", (ctx) => {
        expect(nock.isDone()).to.equal(true);

        expect(createBody).to.deep.include({
          prompt: "Add an email step",
          source: "api",
          context: [],
        });
        expect(createBody.id).to.match(UUID);
        expect(createBody.run_id).to.match(UUID);

        expect(ctx.stdout).to.equal("Done, added the step.\n");
        expect(ctx.stderr).to.contain(`Started agent session ${createBody.id}`);
        expect(ctx.stderr).to.contain(
          `https://dashboard.knock.app/collab-io/agents/sessions/${createBody.id}`,
        );
        expect(ctx.stderr).to.contain("update workflow welcome");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [textDelta]);
        mockEvents(NEXT_OFFSET, allEvents.slice(1));
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("polls from the last offset until the run ends", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.equal("Done, added the step.\n");
        sinon.assert.calledOnce(sleep);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [textDelta], false);
        mockEvents(NEXT_OFFSET, allEvents.slice(1));
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("keeps reading while behind the journal", () => {
        expect(nock.isDone()).to.equal(true);
        sinon.assert.notCalled(sleep);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api().get("/v1/whoami").reply(500, {});
        api().post("/agent/sessions").reply(202, {});
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("still runs when it can't build the session link", (ctx) => {
        expect(ctx.stdout).to.equal("Done, added the step.\n");
        expect(ctx.stderr).not.to.contain("dashboard.knock.app");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api().get("/v1/whoami").replyWithError("socket hang up");
        api().post("/agent/sessions").reply(202, {});
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("still runs when the link request fails outright", (ctx) => {
        expect(ctx.stdout).to.equal("Done, added the step.\n");
      });
  });

  describe("given a run that ends with control characters in it", () => {
    const hostile = "Done\u001B]52;c;Y3VybA==\u0007\u001B[2A";
    const hostileEvents = [
      { ...textComplete, value: { type: "complete", value: hostile } },
      {
        ...modifiedResource,
        value: { ...modifiedResource.value, resource_key: "wel\u001B[2Acome" },
      },
      runEnd,
    ];

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        process.stdout.isTTY = true;
        mockStart();
        mockEvents("-1", hostileEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("removes them on a terminal", (ctx) => {
        expect(ctx.stdout).to.equal("Done]52;c;Y3VybA==[2A\n");
        expect(ctx.stderr).not.to.contain("\u001B");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        process.stdout.isTTY = false;
        mockStart();
        mockEvents("-1", hostileEvents);
      })
      .stdout({ stripColor: false })
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("keeps the response exact when piped", (ctx) => {
        expect(ctx.stdout).to.equal(`${hostile}\n`);
      });
  });

  describe("given - as the prompt", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        const stream = new PassThrough();
        Object.defineProperty(process, "stdin", {
          configurable: true,
          value: stream,
        });
        stream.end("Add an email step\n");

        mockStart();
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "-", "--response-only"])
      .it("reads the prompt from stdin", () => {
        expect(createBody.prompt).to.equal("Add an email step");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        const stream = new PassThrough();
        (stream as any).isTTY = true;
        Object.defineProperty(process, "stdin", {
          configurable: true,
          value: stream,
        });
      })
      .command(["agent", "-", "--response-only"])
      .catch(/No prompt on stdin/)
      .it("refuses to wait on a terminal");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        const stream = new PassThrough();
        Object.defineProperty(process, "stdin", {
          configurable: true,
          value: stream,
        });
        stream.end("line one\nline two\n");
      })
      .command(["agent"])
      .exit(2)
      .it("only reads stdin when asked to");
  });

  describe("given an environment or branch", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--environment", "staging", "--response-only"])
      .it("passes the environment as context", () => {
        expect(createBody.context).to.eql([
          { type: "environment", value: "staging" },
        ]);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--branch", "my-feature", "--response-only"])
      .it("passes the branch as the environment", () => {
        expect(createBody.context).to.eql([
          { type: "environment", value: "my-feature" },
        ]);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command([
        "agent",
        "Hi",
        "--branch",
        "my-feature",
        "--environment",
        "development",
        "--response-only",
      ])
      .it("allows a branch of the development environment", () => {
        expect(createBody.context).to.eql([
          { type: "environment", value: "my-feature" },
        ]);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([
        "agent",
        "Hi",
        "--branch",
        "my-feature",
        "--environment",
        "staging",
      ])
      .catch(/A branch can only be used with the development environment/)
      .it("refuses a branch of any other environment", () => {
        expect(createBody).to.eql({});
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["agent", "Hi", "--environment", "", "--response-only"])
      .catch(/--environment can't be empty/)
      .it("refuses an empty environment", () => {
        expect(createBody).to.eql({});
      });
  });

  describe("given --session", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockJournal();
        mockFollowUp();
        mockEvents(JOURNAL_END, allEvents);
      })
      .stdout()
      .stderr()
      .command([
        "agent",
        "Now shorten the subject line",
        "--session",
        SESSION_ID,
        "--response-only",
      ])
      .it("runs the prompt in that session", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(createBody).to.eql({});
        expect(runBody.id).to.equal(SESSION_ID);
        expect(runBody.run_id).to.match(UUID);
        expect(runBody.prompt).to.equal("Now shorten the subject line");
        expect(runBody.source).to.equal("api");
        expect(ctx.stdout).to.equal("Done, added the step.\n");
        expect(ctx.stderr).to.contain(`Continuing agent session ${SESSION_ID}`);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockJournal();
        mockFollowUp();
        mockEvents(JOURNAL_END, allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--session", SESSION_ID, "--response-only"])
      .it("stays in the environment of the session's last prompt", () => {
        expect(runBody.context).to.eql([
          { type: "environment", value: "my-feature" },
        ]);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockJournal([
          earlierRun[0],
          earlierRun[1],
          {
            ...earlierRun[0],
            seq: 2,
            value: { ...earlierRun[0].value, context: [] },
          },
          { ...earlierRun[1], seq: 3 },
        ]);
        mockFollowUp();
        mockEvents(JOURNAL_END, allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--session", SESSION_ID, "--response-only"])
      .it(
        "leaves the environment to the account when the last prompt did",
        () => {
          expect(runBody.context).to.eql([]);
        },
      );

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockJournal();
        mockFollowUp();
        mockEvents(JOURNAL_END, allEvents);
      })
      .stdout()
      .stderr()
      .command([
        "agent",
        "Hi",
        "--session",
        SESSION_ID,
        "--environment",
        "staging",
        "--response-only",
      ])
      .it("moves to an environment that's passed", () => {
        expect(runBody.context).to.eql([
          { type: "environment", value: "staging" },
        ]);
      });

    const sandbox = sinon.createSandbox();

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        sandbox.replace(CustomFlags.branch, "default", async () => "other");
        mockJournal();
        mockFollowUp();
        mockEvents(JOURNAL_END, allEvents);
      })
      .finally(() => sandbox.restore())
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--session", SESSION_ID, "--response-only"])
      .it("isn't moved by the branch in .knockbranch", () => {
        expect(runBody.context).to.eql([
          { type: "environment", value: "my-feature" },
        ]);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        sandbox.replace(CustomFlags.branch, "default", async () => "other");
        mockJournal();
        mockFollowUp();
        mockEvents(JOURNAL_END, allEvents);
      })
      .finally(() => sandbox.restore())
      .stdout()
      .stderr()
      .command([
        "agent",
        "Hi",
        "--session",
        SESSION_ID,
        "--environment",
        "staging",
        "--response-only",
      ])
      .it(
        "doesn't refuse an environment over the branch in .knockbranch",
        () => {
          expect(runBody.context).to.eql([
            { type: "environment", value: "staging" },
          ]);
        },
      );

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockJournal();
        mockFollowUp();
        mockEvents(JOURNAL_END, allEvents);
      })
      .stdout()
      .stderr()
      .command([
        "agent",
        "Hi",
        "--session",
        `https://dashboard.knock.app/collab-io/agents/sessions/${SESSION_ID}?tab=1`,
        "--response-only",
      ])
      .it("takes the session's dashboard URL", () => {
        expect(runBody.id).to.equal(SESSION_ID);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["agent", "Hi", "--session", "../stop", "--response-only"])
      .catch(/--session must be the ID of an agent session/)
      .it("refuses a value that isn't a session ID");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockJournal();
        mockFollowUp();
        mockEvents(JOURNAL_END, allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--session", SESSION_ID, "--json"])
      .it("prints the result of the new run", (ctx) => {
        const result = JSON.parse(ctx.stdout);

        expect(result.session_id).to.equal(SESSION_ID);
        expect(result.run_id).to.equal(runBody.run_id);
        expect(result.status).to.equal("complete");
        expect(result.text).to.equal("Done, added the step.");
        expect(ctx.stderr).to.equal("");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api()
          .get(`/agent/sessions/${SESSION_ID}/events`)
          .query({ offset: "-1" })
          .reply(200, earlierRun.slice(0, 1), {
            "stream-next-offset": "session:00000000000000000001",
          });
        api()
          .get(`/agent/sessions/${SESSION_ID}/events`)
          .query({ offset: "session:00000000000000000001" })
          .reply(200, earlierRun.slice(1), {
            "stream-next-offset": JOURNAL_END,
            "stream-up-to-date": "true",
          });
        mockFollowUp();
        mockEvents(JOURNAL_END, allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--session", SESSION_ID, "--response-only"])
      .it("reads the whole journal before following the new run", (ctx) => {
        expect(runBody.context).to.eql([
          { type: "environment", value: "my-feature" },
        ]);
        expect(ctx.stdout).to.equal("Done, added the step.\n");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api()
          .get(`/agent/sessions/${SESSION_ID}/events`)
          .query({ offset: "-1" })
          .reply(404, { error: "session not found" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--session", SESSION_ID, "--response-only"])
      .catch(/doesn't exist in this account, or has been archived/)
      .it("explains a session that isn't there", () => {
        expect(runBody).to.eql({});
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockJournal();
        api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });
        api()
          .post(`/agent/sessions/${SESSION_ID}/runs`)
          .reply(409, { error: "session is already running" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--session", SESSION_ID, "--response-only"])
      .catch(/is still running\. Wait for it to finish, then follow up again/)
      .it("explains a session that's busy");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockJournal();
        api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });
        api()
          .post(`/agent/sessions/${SESSION_ID}/runs`)
          .replyWithError("socket hang up");
      })
      .stdout()
      .stderr()
      .command(["agent", "Hi", "--session", SESSION_ID, "--response-only"])
      .catch(/Could not confirm that the prompt in agent session .* started/)
      .it("can't say whether a dropped request started the run");
  });

  describe("given a run that ends", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("says how to follow up", (ctx) => {
        expect(ctx.stderr).to.contain(
          `‣ Follow up with: knock agent --session ${createBody.id} "<prompt>"`,
        );
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [textDelta, runError]);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/The agent run failed/)
      .it("says how to follow up after a failed run too", (ctx) => {
        expect(ctx.stderr).to.contain("Follow up with:");
      });
  });

  describe("given --json", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--json"])
      .it("prints the outcome of the run", (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql({
          session_id: createBody.id,
          run_id: createBody.run_id,
          session_url: `https://dashboard.knock.app/collab-io/agents/sessions/${createBody.id}`,
          status: "complete",
          text: "Done, added the step.",
          tool_calls: [
            {
              call_id: "call_1",
              name: "upsert_workflow",
              arguments: { key: "welcome" },
            },
          ],
          modified_resources: [
            { type: "workflow", key: "welcome", action: "update" },
          ],
        });
        expect(ctx.stderr).to.equal("");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [textDelta, runError]);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--json"])
      .it(
        "exits non-zero with the session details when the run fails",
        (ctx) => {
          const result = JSON.parse(ctx.stdout);

          expect(result.session_id).to.equal(createBody.id);
          expect(result.status).to.equal("error");
          expect(result.error).to.equal("The model is unavailable");
          expect(process.exitCode).to.equal(2);
        },
      );
  });

  describe("given --json and --response-only", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--json", "--response-only"])
      .it("prints the same result as --json alone", (ctx) => {
        expect(JSON.parse(ctx.stdout).text).to.equal("Done, added the step.");
      });
  });

  describe("given a run that fails", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [textComplete, modifiedResource, runError]);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/The agent run failed: The model is unavailable/)
      .it("still prints what the agent did first", (ctx) => {
        expect(ctx.stdout).to.equal("Done, added the step.\n");
        expect(ctx.stderr).to.contain("update workflow welcome");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [textComplete, modifiedResource]);
        sleep.restore();
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--json", "--timeout", "1"])
      .it("reports a timeout with what's happened so far", (ctx) => {
        const result = JSON.parse(ctx.stdout);

        expect(result.session_id).to.equal(createBody.id);
        expect(result.status).to.equal("timeout");
        expect(result.error).to.contain("may still be running");
        expect(result.modified_resources).to.have.length(1);
        expect(process.exitCode).to.equal(2);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .reply(() => {
            process.emit("SIGINT");
            return [200, [textDelta], journalHeaders()];
          });
        api()
          .post(/^\/agent\/session\/[\da-f-]+\/stop$/)
          .reply(200, { ok: true });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--json"])
      .it("reports an interrupt with its own exit code", (ctx) => {
        const result = JSON.parse(ctx.stdout);

        expect(result.status).to.equal("interrupted");
        expect(result.error).to.contain("Stopped agent session");
        expect(process.exitCode).to.equal(130);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });
        api()
          .post("/agent/sessions")
          .reply(403, { error: "insufficient permissions" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--json"])
      .it("keeps the message of an error from before the session", (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql({
          error: { message: "insufficient permissions" },
        });
        expect(process.exitCode).to.equal(2);
      });
  });

  describe("given json output set through the environment", () => {
    test
      .env({
        KNOCK_SERVICE_TOKEN: "valid-token",
        KNOCK_CONTENT_TYPE: "json",
      })
      .do(() => {
        mockStart();
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step"])
      .it("still prints the result", (ctx) => {
        expect(JSON.parse(ctx.stdout).text).to.equal("Done, added the step.");
      });
  });

  describe("given a prompt", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockLiveEvents("-1", sseFrames(allEvents));
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step"])
      .it("renders the agent's activity", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.contain("Done, added the step.\n");
        const stdout = stripVTControlCharacters(ctx.stdout);
        expect(stdout).to.contain("✓ upsert_workflow (42ms)\n");
        expect(stdout).not.to.contain('{"key":"welcome"}');

        // The text isn't printed again once the run ends.
        expect(ctx.stdout.match(/added the step/g)).to.have.length(1);
        expect(ctx.stderr).to.contain("update workflow welcome");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        // The server closes live connections about once a minute.
        mockLiveEvents("-1", sseFrames([textDelta], false));
        mockLiveEvents(NEXT_OFFSET, sseFrames(allEvents.slice(1)));
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step"])
      .it("resumes from the last offset when disconnected", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.contain("Done, added the step.\n");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        // The data arrives, but the connection drops before the control frame
        // that would confirm it, so the same offset is read again.
        mockLiveEvents(
          "-1",
          `event: data\ndata: ${JSON.stringify([textDelta])}\n\n`,
        );
        mockLiveEvents("-1", sseFrames(allEvents));
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step"])
      .it("doesn't print anything twice after a dropped connection", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.contain("Done, added the step.\n");
        expect(ctx.stdout).not.to.contain("DoneDone");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        // The rest of a backlog only comes from connecting again.
        mockLiveEvents("-1", sseFrames([textDelta], false));
        mockLiveEvents(NEXT_OFFSET, sseFrames(allEvents.slice(1)));
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step"])
      .it("reconnects right away while behind the journal", () => {
        expect(nock.isDone()).to.equal(true);
        sinon.assert.notCalled(sleep);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        process.stdout.isTTY = true;
        mockStart();
        mockLiveEvents("-1", sseFrames(allEvents));
      })
      .stdout({ stripColor: false })
      .stderr()
      .command(["agent", "Add an email step"])
      .it("leaves no spinner behind in a terminal", (ctx) => {
        const lastDraw = ctx.stdout.split("\u001B[0J").at(-1);

        expect(lastDraw).to.contain("✓ upsert_workflow");
        expect(lastDraw).not.to.match(/[⠋⠙⠸⠹]/);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockLiveEvents("-1", sseFrames([textDelta, runError]));
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step"])
      .catch(/The agent run failed: The model is unavailable/)
      .it("fails when the run fails");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockLiveEvents("-1", sseFrames([textDelta, runError]));
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step"])
      .catch(/The agent run failed/)
      .it("ends the line before the error is printed", (ctx) => {
        expect(ctx.stdout).to.equal("Done\n");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .reply(403, { error: "insufficient permissions" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step"])
      .catch(/insufficient permissions/)
      .it("reads the error out of a streamed response");
  });

  describe("given the session can't be started", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });
        api().post("/agent/sessions").reply(404, { message: "Not found" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/isn't enabled for this account\. Please contact support/)
      .it("explains a 404");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });
        api()
          .post("/agent/sessions")
          .reply(403, { error: "insufficient permissions" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/insufficient permissions/)
      .it("surfaces the api error");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });
        api().post("/agent/sessions").replyWithError("socket hang up");
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/Could not confirm that agent session .* started: socket hang up/)
      .it("can't say whether a dropped request started it");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });
        api().post("/agent/sessions").reply(200, "");
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/Request failed with status 200/)
      .it("refuses a response that didn't accept the session");
  });

  describe("given an invalid --timeout", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["agent", "Hi", "--timeout", "2147484", "--response-only"])
      .exit(2)
      .it("rejects a value too long for a timer", () => {
        expect(createBody).to.eql({});
      });
  });

  describe("given failures while following the run", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api().get(eventsPath).query(true).reply(500, {});
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("retries server errors", (ctx) => {
        expect(ctx.stdout).to.equal("Done, added the step.\n");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api().get(eventsPath).query(true).replyWithError("socket hang up");
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("retries dropped connections", (ctx) => {
        expect(ctx.stdout).to.equal("Done, added the step.\n");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .times(11)
          .replyWithError("socket hang up");
        mockEvents("-1", allEvents);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("rides out a long network change", (ctx) => {
        expect(ctx.stdout).to.equal("Done, added the step.\n");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .times(12)
          .replyWithError("socket hang up");
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/which may still be running: the connection was interrupted/)
      .it("gives up eventually, without internal error text", () => {
        expect(nock.isDone()).to.equal(true);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        // Doesn't look like the journal: this is what a proxy's login page does.
        api()
          .get(eventsPath)
          .query(true)
          .times(12)
          .reply(200, "<html>Sign in</html>", journalHeaders());
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/Received an unexpected response from Knock/)
      .it("retries, then reports, a response that isn't events", () => {
        expect(nock.isDone()).to.equal(true);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        // Without an offset, each read would start over with nothing to slow it.
        api().get(eventsPath).query(true).times(12).reply(200, [textDelta]);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/Received an unexpected response from Knock/)
      .it("doesn't loop on a response with no offset", () => {
        expect(nock.isDone()).to.equal(true);
        expect(sleep.callCount).to.equal(11);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .times(12)
          .reply(200, "<html>Sign in</html>", { "content-type": "text/html" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step"])
      .catch(/Received an unexpected response from Knock/)
      .it("reports a live response that isn't an event stream", () => {
        expect(nock.isDone()).to.equal(true);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [{ ...textDelta, value: undefined }]);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/Could not process an event/)
      .it("doesn't retry an event it can't process", () => {
        expect(nock.isDone()).to.equal(true);
        sinon.assert.notCalled(sleep);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [{ ...textDelta, version: 2 }]);
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/use version 2, which this CLI can't read\. Upgrade the Knock CLI/)
      .it("says when it needs upgrading");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .reply(404, { error: "session not found" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch((error) => {
        expect(error.message).to.contain("may still be running");
        expect(error.message).to.contain("session not found");
        expect(error.message).to.contain(createBody.id);
      })
      .it("gives up on other errors, naming the session");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api().get(eventsPath).query(true).reply(401, { message: "Nope" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/Nope/)
      .it("doesn't retry a rejected service token");
  });

  describe("given a user session that expires during the run", () => {
    let userConfig: UserConfig;

    const stubConfig = () =>
      test
        .do(() => {
          userConfig = { userSession: factory.authenticatedSession() };
        })
        .stub(UserConfigStore.prototype, "get", (stub) =>
          stub.callsFake(() => userConfig),
        )
        .stub(UserConfigStore.prototype, "set", (stub) =>
          stub.callsFake(async (updated: UserConfig) => {
            userConfig = { ...userConfig, ...updated };
            return userConfig;
          }),
        );

    const firstToken = factory.authenticatedSession({ accessToken: "first" });
    const secondToken = factory.authenticatedSession({ accessToken: "second" });

    stubConfig()
      .stub(auth, "refreshAccessToken", (stub) =>
        stub
          .onFirstCall()
          .resolves(factory.authenticatedSession({ accessToken: "first" }))
          .onSecondCall()
          .resolves(factory.authenticatedSession({ accessToken: "second" })),
      )
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .matchHeader("authorization", "Bearer first")
          .reply(401, { message: "Expired" });
        api()
          .get(eventsPath)
          .query(true)
          .matchHeader("authorization", "Bearer second")
          .reply(200, allEvents, journalHeaders());
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("refreshes the token and carries on", (ctx) => {
        sinon.assert.calledTwice(auth.refreshAccessToken as any);
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.equal("Done, added the step.\n");
      });

    stubConfig()
      .stub(auth, "refreshAccessToken", (stub) =>
        stub.onFirstCall().resolves(firstToken),
      )
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .matchHeader("authorization", "Bearer first")
          .reply(() => {
            // Another command refreshed and saved a newer token in the meantime.
            userConfig = { userSession: secondToken };
            return [401, { message: "Expired" }];
          });
        api()
          .get(eventsPath)
          .query(true)
          .matchHeader("authorization", "Bearer second")
          .reply(200, allEvents, journalHeaders());
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("uses a token another command saved, instead of refreshing", () => {
        sinon.assert.calledOnce(auth.refreshAccessToken as any);
        expect(nock.isDone()).to.equal(true);
      });

    stubConfig()
      .stub(auth, "refreshAccessToken", (stub) =>
        stub
          .onFirstCall()
          .resolves(firstToken)
          .onSecondCall()
          .rejects(new Error("Failed to refresh access token"))
          .onThirdCall()
          .resolves(secondToken),
      )
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .times(2)
          .matchHeader("authorization", "Bearer first")
          .reply(401, { message: "Expired" });
        api()
          .get(eventsPath)
          .query(true)
          .matchHeader("authorization", "Bearer second")
          .reply(200, allEvents, journalHeaders());
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .it("survives a failed refresh without clearing the login", (ctx) => {
        expect(ctx.stdout).to.equal("Done, added the step.\n");
        sinon.assert.neverCalledWith(UserConfigStore.prototype.set as any, {
          userSession: undefined,
        });
      });

    stubConfig()
      .stub(auth, "refreshAccessToken", (stub) =>
        stub
          .rejects(new Error("Failed to refresh access token"))
          .onFirstCall()
          .resolves(firstToken),
      )
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .times(3)
          .reply(401, { message: "Expired" });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .catch(/Run `knock login` and try again/)
      .it("gives up on auth sooner, and says what to do");

    stubConfig()
      .stub(auth, "refreshAccessToken", (stub) =>
        stub
          .onFirstCall()
          .resolves(firstToken)
          .onSecondCall()
          .resolves(secondToken),
      )
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .reply(() => {
            process.emit("SIGINT");
            return [200, [textDelta], journalHeaders()];
          });
        api()
          .post(/^\/agent\/session\/[\da-f-]+\/stop$/)
          .matchHeader("authorization", "Bearer first")
          .reply(401, { message: "Expired" });
        api()
          .post(/^\/agent\/session\/[\da-f-]+\/stop$/)
          .matchHeader("authorization", "Bearer second")
          .reply(200, { ok: true });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .exit(130)
      .it("refreshes the token to stop the session", () => {
        expect(nock.isDone()).to.equal(true);
      });
  });

  describe("given the run outlasts --timeout", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [textComplete, modifiedResource]);
        sleep.restore();
      })
      .stub(KnockApiV1.prototype, "stopAgentSession", (stub) => stub.resolves())
      .stdout()
      .stderr()
      .command([
        "agent",
        "Add an email step",
        "--timeout",
        "1",
        "--response-only",
      ])
      .catch((error) => {
        expect(error.message).to.contain("Timed out after 1s");
        expect(error.message).to.contain(createBody.id);
        expect(error.message).to.contain("may still be running");
        expect(error.message).to.contain("--timeout");
      })
      .it("leaves the agent running and says what it did so far", (ctx) => {
        sinon.assert.notCalled(KnockApiV1.prototype.stopAgentSession as any);
        expect(ctx.stdout).to.equal("Done, added the step.\n");
        expect(ctx.stderr).to.contain("update workflow welcome");
      });
  });

  describe("given an interrupt", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        api()
          .get(eventsPath)
          .query(true)
          .reply(() => {
            process.emit("SIGINT");
            return [200, [textDelta], journalHeaders()];
          });
        api()
          .post(/^\/agent\/session\/[\da-f-]+\/stop$/)
          .reply(200, { ok: true });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .exit(130)
      .it("stops the session", () => {
        expect(nock.isDone()).to.equal(true);
      });

    for (const signal of ["SIGTERM", "SIGHUP"] as const) {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .do(() => {
          mockStart();
          api()
            .get(eventsPath)
            .query(true)
            .reply(() => {
              process.emit(signal);
              return [200, [textDelta], journalHeaders()];
            });
          api()
            .post(/^\/agent\/session\/[\da-f-]+\/stop$/)
            .reply(200, { ok: true });
        })
        .stdout()
        .stderr()
        .command(["agent", "Add an email step", "--response-only"])
        .exit(130)
        .it(`stops the session on ${signal}`, () => {
          expect(nock.isDone()).to.equal(true);
        });
    }

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        api().get("/v1/whoami").reply(200, { account_slug: "collab-io" });
        api()
          .post("/agent/sessions")
          .reply(() => {
            process.emit("SIGINT");
            return [202, {}];
          });
        api()
          .post(/^\/agent\/session\/[\da-f-]+\/stop$/)
          .reply(200, { ok: true });
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .exit(130)
      .it("stops a session interrupted while starting", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stderr).to.contain("Stopped agent session");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        mockStart();
        mockEvents("-1", [textComplete, modifiedResource], false);
        api()
          .get(eventsPath)
          .query({ offset: NEXT_OFFSET })
          .reply(() => {
            process.emit("SIGINT");
            return [200, [], journalHeaders()];
          });
        api()
          .post(/^\/agent\/session\/[\da-f-]+\/stop$/)
          .reply(500, {});
      })
      .stdout()
      .stderr()
      .command(["agent", "Add an email step", "--response-only"])
      .exit(130)
      .it("says when it couldn't stop the session", (ctx) => {
        expect(ctx.stderr).to.contain("Could not stop agent session");
        expect(ctx.stderr).to.contain("may still be running");
        expect(ctx.stderr).to.contain("update workflow welcome");
      });
  });
});
