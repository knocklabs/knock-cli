import { PassThrough } from "node:stream";
import {
  setImmediate as nextTick,
  setTimeout as sleep,
} from "node:timers/promises";

import { expect } from "chai";
import * as sinon from "sinon";

import { AgentPromptReader, PromptInput } from "@/lib/helpers/agent-prompt";

type FakeTerminal = PassThrough & {
  isTTY: boolean;
  setRawMode: sinon.SinonStub;
};

const UP = "\u001B[A";
const CTRL_C = "\u0003";
const CTRL_D = "\u0004";
const ESC = "\u001B";

const buildTerminal = (): FakeTerminal => {
  const input = new PassThrough() as FakeTerminal;
  input.isTTY = true;
  input.setRawMode = sinon.stub();
  return input;
};

describe("lib/helpers/agent-prompt", () => {
  let input: FakeTerminal;
  let output: PassThrough;
  let written: string;
  let reader: AgentPromptReader;

  // Each write is a separate chunk, as separate keystrokes would be.
  const type = async (...chunks: string[]) => {
    for (const chunk of chunks) {
      input.write(chunk);
      // eslint-disable-next-line no-await-in-loop
      await nextTick();
    }
  };

  beforeEach(() => {
    input = buildTerminal();
    output = new PassThrough();
    written = "";
    output.on("data", (chunk) => {
      written += chunk.toString();
    });
    reader = new AgentPromptReader(input as PromptInput, output);
  });

  describe("read", () => {
    it("reads a line", async () => {
      const prompt = reader.read("> ");
      await type("Add an email step\r");

      expect(await prompt).to.equal("Add an email step");
      expect(written).to.contain("> ");
    });

    it("keeps a pasted prompt together", async () => {
      const prompt = reader.read("> ");
      await type("\u001B[200~first line\nsecond line\u001B[201~", "\r");

      expect(await prompt).to.equal("first line\nsecond line");
    });

    it("keeps an unmarked paste together", async () => {
      const prompt = reader.read("> ");
      await type("first line\nsecond line\n");

      expect(await prompt).to.equal("first line\nsecond line");
    });

    it("keeps the unfinished last line of an unmarked paste", async () => {
      const prompt = reader.read("> ");
      await type("first line\nsecond line");

      expect(await prompt).to.equal("first line\nsecond line");
    });

    it("stops reading when the signal aborts", async () => {
      const controller = new AbortController();
      const prompt = reader.read("> ", { signal: controller.signal });
      await type("half typed");
      controller.abort();

      expect(await prompt).to.equal(undefined);
      expect(written).to.contain("\u001B[?2004l");
    });

    it("doesn't read once the signal has aborted", async () => {
      const prompt = reader.read("> ", { signal: AbortSignal.abort() });

      expect(await prompt).to.equal(undefined);
    });

    it("turns on bracketed paste only while reading", async () => {
      const prompt = reader.read("> ");
      expect(written).to.contain("\u001B[?2004h");
      expect(written).not.to.contain("\u001B[?2004l");

      await type("hi\r");
      await prompt;

      expect(written).to.contain("\u001B[?2004l");
    });

    it("continues a line that ends with a backslash", async () => {
      const prompt = reader.read("> ", { continuation: ". " });
      await type("first line\\\r", "second line\r");

      expect(await prompt).to.equal("first line\nsecond line");
      expect(written).to.contain(". ");
    });

    it("clears what's typed on Ctrl-C", async () => {
      const prompt = reader.read("> ");
      await type("never mind", CTRL_C, "Add an email step\r");

      expect(await prompt).to.equal("Add an email step");
    });

    it("clears earlier lines on Ctrl-C", async () => {
      const prompt = reader.read("> ");
      await type("first line\\\r", CTRL_C, "Add an email step\r");

      expect(await prompt).to.equal("Add an email step");
    });

    it("quits on Ctrl-C with nothing typed", async () => {
      const prompt = reader.read("> ");
      await type(CTRL_C);

      expect(await prompt).to.equal(undefined);
    });

    it("quits on Ctrl-D", async () => {
      const prompt = reader.read("> ");
      await type(CTRL_D);

      expect(await prompt).to.equal(undefined);
    });

    it("remembers earlier prompts", async () => {
      const first = reader.read("> ");
      await type("Add an email step\r");
      await first;

      const second = reader.read("> ");
      await type(UP, "\r");

      expect(await second).to.equal("Add an email step");
    });

    it("leaves the terminal as it found it", async () => {
      const prompt = reader.read("> ");
      await type("hi\r");
      await prompt;

      expect(input.setRawMode.lastCall.args).to.eql([false]);
      expect(input.listenerCount("keypress")).to.equal(0);
    });
  });

  describe("watchForInterrupt", () => {
    it("calls back on Ctrl-C", async () => {
      const onInterrupt = sinon.spy();
      const stop = reader.watchForInterrupt(onInterrupt);

      await type(CTRL_C);
      stop();

      sinon.assert.calledOnceWithExactly(onInterrupt, "ctrl-c");
    });

    it("calls back on Esc", async () => {
      const onInterrupt = sinon.spy();
      const stop = reader.watchForInterrupt(onInterrupt);

      input.write(ESC);
      // A lone Esc is only known once nothing follows it for half a second.
      await sleep(600);
      stop();

      sinon.assert.calledOnceWithExactly(onInterrupt, "escape");
    });

    it("ignores other keys", async () => {
      const onInterrupt = sinon.spy();
      const stop = reader.watchForInterrupt(onInterrupt);

      await type("hello\r", UP);
      stop();

      sinon.assert.notCalled(onInterrupt);
    });

    it("reads keys in raw mode until stopped", async () => {
      const onInterrupt = sinon.spy();
      const stop = reader.watchForInterrupt(onInterrupt);

      expect(input.setRawMode.lastCall.args).to.eql([true]);

      stop();
      await type(CTRL_C);

      expect(input.setRawMode.lastCall.args).to.eql([false]);
      sinon.assert.notCalled(onInterrupt);
    });
  });
});
