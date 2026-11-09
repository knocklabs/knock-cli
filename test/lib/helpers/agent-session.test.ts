import { PassThrough } from "node:stream";
import { stripVTControlCharacters } from "node:util";

import { expect } from "chai";
import * as sinon from "sinon";

import {
  AgentEvent,
  AgentEventRenderer,
  AgentRun,
  formatAgentErrorMessage,
  readAgentEventStream,
  withIdleTimeout,
} from "@/lib/helpers/agent-session";
import { AgentEventError } from "@/lib/helpers/error";

let seq = 0;

const event = (attrs: Partial<AgentEvent> & { type: string }): AgentEvent => ({
  seq: seq++,
  version: 1,
  storedEventId: "stored-1",
  ...attrs,
});

const text = (type: string, value: string, attrs = {}) =>
  event({ type: "textContent", value: { type, value, ...attrs } });

const collect = async <T>(generator: AsyncGenerator<T>): Promise<T[]> => {
  const items: T[] = [];
  for await (const item of generator) items.push(item);
  return items;
};

async function* chunksOf(...chunks: (string | Uint8Array)[]) {
  const encoder = new TextEncoder();

  for (const chunk of chunks) {
    yield typeof chunk === "string" ? encoder.encode(chunk) : chunk;
  }
}

const render = (...events: AgentEvent[]): string => {
  let output = "";
  const renderer = new AgentEventRenderer((chunk) => {
    output += chunk;
  });

  for (const item of events) renderer.render(item);

  return stripVTControlCharacters(output);
};

const reasoning = (type: string, value: string, attrs = {}) =>
  event({ type: "reasoning", value: { type, value, ...attrs } });

const toolCall = (callId: string, name: string, attrs = {}) =>
  event({
    type: "toolCall",
    value: { type: "complete", callId, name, ...attrs },
  });

const toolResponse = (callId: string, name: string, attrs = {}) =>
  event({
    type: "toolResponse",
    value: { callId, name, status: "success", value: "ok", ...attrs },
  });

describe("lib/helpers/agent-session", () => {
  beforeEach(() => {
    seq = 0;
  });

  describe("formatAgentErrorMessage", () => {
    it("reads the error and details from the agent api", () => {
      expect(
        formatAgentErrorMessage(400, {
          error: "invalid params",
          details: ["session id already exists"],
        }),
      ).to.equal("invalid params: session id already exists");
    });

    it("reads the message from fallback responses", () => {
      expect(
        formatAgentErrorMessage(401, { message: "Unauthorized" }),
      ).to.equal("Unauthorized");
    });

    it("hides internal errors", () => {
      expect(formatAgentErrorMessage(500, { error: "boom" })).to.equal(
        "An internal server error occurred",
      );
    });

    it("falls back to the status", () => {
      expect(formatAgentErrorMessage(418)).to.equal(
        "Request failed with status 418",
      );
    });
  });

  describe("AgentRun", () => {
    it("assembles text from deltas", () => {
      const run = new AgentRun();
      run.apply(text("delta", "Hel"));
      run.apply(text("delta", "lo"));

      expect(run.text).to.equal("Hello");
    });

    it("prefers the complete snapshot over deltas", () => {
      const run = new AgentRun();
      run.apply(text("delta", "Hel"));
      run.apply(text("complete", "Hello there"));

      expect(run.text).to.equal("Hello there");
    });

    it("joins blocks in order", () => {
      const run = new AgentRun();
      run.apply({ ...text("complete", "One"), storedEventId: "a" });
      run.apply({ ...text("complete", "Two"), storedEventId: "b" });

      expect(run.text).to.equal("One\n\nTwo");
    });

    it("drops discarded blocks", () => {
      const run = new AgentRun();
      run.apply(text("delta", "Half an ans"));
      run.apply(text("complete", "Half an ans", { discarded: true }));

      expect(run.text).to.equal("");
    });

    it("ignores events it has already seen", () => {
      const run = new AgentRun();
      const delta = text("delta", "Hello");

      expect(run.apply(delta)).to.equal(true);
      expect(run.apply(delta)).to.equal(false);
      expect(run.text).to.equal("Hello");
    });

    it("records complete tool calls only", () => {
      const run = new AgentRun();
      const value = { name: "upsert_workflow", callId: "call_1" };

      run.apply(
        event({ type: "toolCall", value: { ...value, type: "delta" } }),
      );
      expect(run.toolCallList).to.eql([]);

      run.apply(
        event({
          type: "toolCall",
          value: { ...value, type: "complete", arguments: "{}" },
        }),
      );
      expect(run.toolCallList).to.eql([
        { call_id: "call_1", name: "upsert_workflow", arguments: {} },
      ]);
    });

    it("tracks each modified resource once", () => {
      const run = new AgentRun();
      const value = {
        type: "knock:session",
        action: "modified_resources_updated",
        resource_type: "workflow",
        resource_key: "welcome",
      };

      run.apply(
        event({
          type: "signal",
          value: { ...value, resource_action: "create" },
        }),
      );
      run.apply(
        event({
          type: "signal",
          value: { ...value, resource_action: "update" },
        }),
      );
      run.apply(event({ type: "signal", value: { type: "changeTitle" } }));

      expect(run.modifiedResources).to.eql([
        { type: "workflow", key: "welcome", action: "update" },
      ]);
    });

    it("throws on an event version it doesn't know", () => {
      const run = new AgentRun();

      expect(() => run.apply({ ...text("delta", "Hi"), version: 2 })).to.throw(
        AgentEventError,
        /Upgrade the Knock CLI/,
      );
    });

    it("ends on runEnd", () => {
      const run = new AgentRun();
      run.apply(event({ type: "runEnd" }));

      expect(run.isTerminal).to.equal(true);
      expect(run.status).to.equal("complete");
    });

    it("ends on runError with its message", () => {
      const run = new AgentRun();
      run.apply(event({ type: "runError", value: "agent timeout" }));

      expect(run.isTerminal).to.equal(true);
      expect(run.status).to.equal("error");
      expect(run.error).to.equal("agent timeout");
    });
  });

  describe("readAgentEventStream", () => {
    const entry = { type: "runEnd", seq: 0, storedEventId: "stored-1" };
    const dataFrame = `event: data\ndata: ${JSON.stringify([entry])}\n\n`;
    const controlFrame =
      'event: control\ndata: {"streamNextOffset":"s:1","upToDate":true}\n\n';

    it("yields a batch for each control frame", async () => {
      const batches = await collect(
        readAgentEventStream(chunksOf(dataFrame, controlFrame)),
      );

      expect(batches).to.eql([
        { events: [entry], nextOffset: "s:1", upToDate: true },
      ]);
    });

    it("skips heartbeats", async () => {
      const batches = await collect(
        readAgentEventStream(
          chunksOf(
            ": heartbeat\n\n",
            dataFrame,
            ": heartbeat\n\n",
            controlFrame,
          ),
        ),
      );

      expect(batches[0].events).to.eql([entry]);
    });

    it("reassembles frames split across chunks", async () => {
      const frames = dataFrame + controlFrame;
      const batches = await collect(
        readAgentEventStream(chunksOf(frames.slice(0, 20), frames.slice(20))),
      );

      expect(batches[0].events).to.eql([entry]);
    });

    it("reassembles characters split across chunks", async () => {
      const unicode = { ...entry, type: "textContent", value: "café" };
      const bytes = new TextEncoder().encode(
        `event: data\ndata: ${JSON.stringify([unicode])}\n\n${controlFrame}`,
      );
      const splitAt = bytes.indexOf(0xc3) + 1;

      const batches = await collect(
        readAgentEventStream(
          chunksOf(bytes.slice(0, splitAt), bytes.slice(splitAt)),
        ),
      );

      expect(batches[0].events[0].value).to.equal("café");
    });

    it("reads frames with CRLF line endings", async () => {
      const batches = await collect(
        readAgentEventStream(
          chunksOf((dataFrame + controlFrame).replace(/\n/g, "\r\n")),
        ),
      );

      expect(batches[0].events).to.eql([entry]);
    });

    it("leaves events without a control frame to be read again", async () => {
      const batches = await collect(readAgentEventStream(chunksOf(dataFrame)));

      expect(batches).to.eql([]);
    });
  });

  describe("withIdleTimeout", () => {
    it("passes chunks through", async () => {
      const stream = new PassThrough();
      stream.end("hello");

      const chunks = await collect(withIdleTimeout(stream, 1000));

      expect(Buffer.concat(chunks).toString()).to.equal("hello");
    });

    it("fails a stream that goes quiet", async () => {
      const stream = new PassThrough();
      stream.write("hello");

      let failure: Error | undefined;

      try {
        await collect(withIdleTimeout(stream, 20));
      } catch (error) {
        failure = error as Error;
      }

      expect(failure?.message).to.equal("Nothing received for 20ms");
    });

    it("keeps a stream alive for as long as bytes arrive", async () => {
      const stream = new PassThrough();
      const chunks = withIdleTimeout(stream, 40);

      const writes = setInterval(() => stream.write(": heartbeat\n\n"), 10);
      setTimeout(() => {
        clearInterval(writes);
        stream.end();
      }, 80);

      expect((await collect(chunks)).length).to.be.greaterThan(1);
    });
  });

  describe("AgentEventRenderer", () => {
    it("writes text as it arrives without repeating the snapshot", () => {
      expect(
        render(
          text("delta", "Hel"),
          text("delta", "lo"),
          text("complete", "Hello"),
        ),
      ).to.equal("Hello\n\n");
    });

    it("writes the snapshot when no deltas came first", () => {
      expect(render(text("complete", "Hello"))).to.equal("Hello\n\n");
    });

    it("writes what's missing when the snapshot has more", () => {
      expect(render(text("delta", "Hel"), text("complete", "Hello"))).to.equal(
        "Hello\n\n",
      );
    });

    it("shows a snapshot that doesn't match what was written", () => {
      const output = render(
        text("delta", "Hel"),
        text("complete", "Goodbye friend"),
      );

      expect(output).to.contain("(revised)");
      expect(output).to.contain("Goodbye friend\n");
    });

    it("removes control characters from text", () => {
      expect(
        render(text("complete", "A\u001B]52;c;abc\u0007B\tC\nD\r\u009B2A")),
      ).to.equal("A]52;c;abcB\tC\nD2A\n\n");
    });

    it("keeps an escape sequence split across deltas apart", () => {
      expect(
        render(
          text("delta", "A\u001B"),
          text("delta", "]52;c;abc\u0007B"),
          text("complete", "A\u001B]52;c;abc\u0007B"),
        ),
      ).to.equal("A]52;c;abcB\n\n");
    });

    it("says when text it has written is discarded", () => {
      const output = render(
        text("delta", "Half"),
        text("complete", "Half", { discarded: true }),
      );

      expect(output).to.contain("Half\n");
      expect(output).to.contain("(discarded, retrying)");
    });

    it("writes thinking as a finished step, without its text", () => {
      const output = render(
        reasoning("delta", "Let me think"),
        reasoning("complete", "Let me think about it"),
      );

      expect(output).to.match(/^✓ Thought \(\d+ms\)\n$/);
    });

    it("writes thinking that arrives whole, with no time to report", () => {
      expect(render(reasoning("complete", ""))).to.equal("✓ Thought\n");
    });

    it("never writes the contents of redacted thinking", () => {
      const blob = "EqQBCgIYAhIM1gbcDa9GJwZA2b3h";

      expect(render(reasoning("complete", blob))).not.to.contain(blob);
    });

    it("skips discarded thinking", () => {
      expect(
        render(
          reasoning("delta", "Half a thought"),
          reasoning("complete", "Half a thought", { discarded: true }),
        ),
      ).to.equal("");
    });

    it("writes a tool once it finishes, with no arguments or result", () => {
      const output = render(
        toolCall("call_1", "read_file", { arguments: '{"path":"/a"}' }),
        toolResponse("call_1", "read_file", {
          value: "contents",
          durationMs: 12,
        }),
      );

      expect(output).to.equal("✓ read_file (12ms)\n");
    });

    it("keeps a tool name to one clean line", () => {
      expect(
        render(toolResponse("call_1", "bad\nna\u001B[2Ame", { durationMs: 1 })),
      ).to.equal("✓ bad na[2Ame (1ms)\n");
    });

    it("marks failed tools", () => {
      expect(
        render(
          toolResponse("call_1", "write_file", {
            status: "error",
            value: "denied",
            durationMs: 3,
          }),
        ),
      ).to.equal("✗ write_file (3ms)\n");
    });

    it("writes long durations in seconds", () => {
      expect(
        render(toolResponse("call_1", "bash", { durationMs: 12_345 })),
      ).to.equal("✓ bash (12.3s)\n");
    });

    it("times the tool itself when no duration is reported", () => {
      const clock = sinon.useFakeTimers({ now: 1000 });
      let output = "";
      const renderer = new AgentEventRenderer((chunk) => {
        output += chunk;
      });

      renderer.render(toolCall("call_1", "web_search"));
      clock.tick(250);
      renderer.render(toolResponse("call_1", "web_search"));
      clock.restore();

      expect(stripVTControlCharacters(output)).to.equal(
        "✓ web_search (250ms)\n",
      );
    });

    it("leaves out the duration when there's nothing to go on", () => {
      expect(render(toolResponse("call_1", "web_search"))).to.equal(
        "✓ web_search\n",
      );
    });

    it("starts a new line after unfinished text", () => {
      expect(
        render(text("delta", "Let me check"), toolCall("call_1", "read_file")),
      ).to.equal("Let me check\n");
    });

    describe("when live", () => {
      const eraseOne = "\u001B[1A\u001B[0J";
      const eraseTwo = "\u001B[2A\u001B[0J";

      let clock: sinon.SinonFakeTimers;
      let writes: string[];
      let renderer: AgentEventRenderer;

      beforeEach(() => {
        clock = sinon.useFakeTimers({ now: 1000 });
        writes = [];
        renderer = new AgentEventRenderer((chunk) => writes.push(chunk), {
          live: true,
        });
      });

      afterEach(() => {
        renderer.stop();
        clock.restore();
      });

      const plain = () => writes.map((w) => stripVTControlCharacters(w));

      it("shows a spinner while a tool runs", () => {
        renderer.render(toolCall("call_1", "read_file"));

        expect(plain()).to.eql(["⠋ read_file\n"]);
      });

      it("shows a spinner while the agent thinks", () => {
        renderer.render(reasoning("delta", "Let me"));
        renderer.render(reasoning("delta", " think"));

        expect(plain()).to.eql(["⠋ Thinking\n"]);
      });

      it("replaces the thinking spinner with how long it took", () => {
        renderer.render(reasoning("delta", "Let me think"));
        clock.tick(1500);
        renderer.render(reasoning("complete", "Let me think"));

        expect(plain().at(-1)).to.equal("✓ Thought (1.5s)\n");
      });

      it("drops the spinner of discarded thinking", () => {
        renderer.render(reasoning("delta", "Half a thought"));
        renderer.render(
          reasoning("complete", "Half a thought", { discarded: true }),
        );

        expect(writes[1]).to.equal(eraseOne);
      });

      it("animates the spinner in place", () => {
        renderer.render(toolCall("call_1", "read_file"));
        clock.tick(80);

        expect(writes[1]).to.contain(eraseOne);
        expect(stripVTControlCharacters(writes[1])).to.equal("⠙ read_file\n");
      });

      it("replaces the spinner with the outcome", () => {
        renderer.render(toolCall("call_1", "read_file"));
        renderer.render(
          toolResponse("call_1", "read_file", { durationMs: 12 }),
        );

        expect(writes[1]).to.contain(eraseOne);
        expect(stripVTControlCharacters(writes[1])).to.equal(
          "✓ read_file (12ms)\n",
        );
      });

      it("stops animating once tools finish", () => {
        renderer.render(toolCall("call_1", "read_file"));
        renderer.render(toolResponse("call_1", "read_file"));
        const count = writes.length;

        clock.tick(1000);

        expect(writes).to.have.length(count);
      });

      it("gives parallel tools a line each", () => {
        renderer.render(toolCall("call_1", "read_file"));
        renderer.render(toolCall("call_2", "bash"));

        expect(writes[1]).to.contain(eraseOne);
        expect(stripVTControlCharacters(writes[1])).to.equal(
          "⠋ read_file\n⠋ bash\n",
        );
      });

      it("keeps other tools running when one finishes first", () => {
        renderer.render(toolCall("call_1", "read_file"));
        renderer.render(toolCall("call_2", "bash"));
        renderer.render(toolResponse("call_2", "bash", { durationMs: 5 }));

        expect(writes[2]).to.contain(eraseTwo);
        expect(stripVTControlCharacters(writes[2])).to.equal(
          "✓ bash (5ms)\n⠋ read_file\n",
        );
      });

      it("writes text above running tools", () => {
        renderer.render(toolCall("call_1", "read_file"));
        renderer.render(text("complete", "Hello"));

        expect(writes[1]).to.contain(eraseOne);
        expect(stripVTControlCharacters(writes.slice(1).join(""))).to.equal(
          "Hello\n\n⠋ read_file\n",
        );
      });

      it("holds spinners back during unfinished text", () => {
        renderer.render(toolCall("call_1", "read_file"));
        renderer.render(text("delta", "Hel"));
        const count = writes.length;

        clock.tick(1000);

        expect(writes).to.have.length(count);
      });

      it("drops the spinner of a discarded tool call", () => {
        renderer.render(toolCall("call_1", "read_file"));
        renderer.render(toolCall("call_1", "read_file", { discarded: true }));

        expect(writes[1]).to.equal(eraseOne);
      });

      it("cuts a long name to fit the terminal", () => {
        const sized = new AgentEventRenderer((chunk) => writes.push(chunk), {
          live: true,
          getTerminalSize: () => ({ columns: 20, rows: 24 }),
        });

        sized.render(toolCall("call_1", "upsert_a_very_long_tool_name"));
        sized.stop();

        expect(stripVTControlCharacters(writes[0]).trimEnd()).to.equal(
          "⠋ upsert_a_very_...",
        );
      });

      it("counts steps that don't fit on screen", () => {
        const sized = new AgentEventRenderer((chunk) => writes.push(chunk), {
          live: true,
          getTerminalSize: () => ({ columns: 80, rows: 4 }),
        });

        for (const id of ["a", "b", "c", "d", "e"]) {
          sized.render(toolCall(id, `tool_${id}`));
        }

        const screen = stripVTControlCharacters(writes.at(-1) as string);

        expect(screen).to.equal("⠋ tool_a\n⠋ tool_b\n  + 3 more\n");

        sized.render(toolCall("f", "tool_f"));
        expect(writes.at(-1)).to.contain("\u001B[3A");

        sized.stop();
      });

      it("copes with a terminal that reports no size", () => {
        const sized = new AgentEventRenderer((chunk) => writes.push(chunk), {
          live: true,
          getTerminalSize: () => ({ columns: 0, rows: 0 }),
        });

        sized.render(toolCall("call_1", "read_file"));
        sized.stop();

        expect(stripVTControlCharacters(writes[0])).to.equal("⠋ read_file\n");
      });

      it("ends an unfinished line when stopped", () => {
        renderer.render(text("delta", "Working on the fi"));
        renderer.stop();

        expect(plain().join("")).to.equal("Working on the fi\n");
      });

      it("clears spinners when stopped", () => {
        renderer.render(toolCall("call_1", "read_file"));
        renderer.stop();

        expect(writes[1]).to.equal(eraseOne);
      });
    });

    it("writes model retries", () => {
      expect(
        render(
          event({
            type: "signal",
            value: { type: "modelRetry", attempt: 2, maxAttempts: 3 },
          }),
        ),
      ).to.contain("Retrying model request (2/3)");
    });

    it("skips events meant for other clients", () => {
      expect(
        render(
          event({ type: "prompt", value: { value: "Hi" } }),
          event({ type: "signal", value: { type: "changeTitle" } }),
          event({ type: "runInitializing" }),
          event({ type: "runEnd" }),
        ),
      ).to.equal("");
    });
  });
});
