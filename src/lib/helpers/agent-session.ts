/*
 * Helpers for following a Knock agent session through its event journal, which
 * uses the Durable Streams protocol: an append-only log read from an opaque
 * offset, either in catch-up JSON chunks or live over SSE.
 *
 * Streamed blocks (text, reasoning, tool calls) arrive as "delta" events that
 * are later replaced by a "complete" snapshot sharing the same storedEventId. A
 * complete snapshot can also be marked `discarded` when a model retry throws
 * the block away.
 */
import type { Readable } from "node:stream";

import { ux } from "@oclif/core";
import { truncate } from "lodash";

import { AgentEventError } from "@/lib/helpers/error";
import { tryJsonParse } from "@/lib/helpers/json";
import { stripControlChars } from "@/lib/helpers/string";

// The server sends something every 15 seconds on a live connection, so this
// long without a single byte means the connection has died without saying so.
export const AGENT_READ_TIMEOUT_MS = 45_000;

const AGENT_EVENT_VERSION = 1;

export type AgentEvent = {
  type: string;
  seq: number;
  version: number;
  storedEventId: string;
  // The shape depends on the event type.
  value?: any;
};

export type AgentEventBatch = {
  events: AgentEvent[];
  nextOffset: string;
  upToDate: boolean;
};

export type AgentRunStatus = "running" | "complete" | "error";

export type AgentToolCall = {
  call_id: string;
  name: string;
  arguments: unknown;
};

export type AgentModifiedResource = {
  type: string;
  key: string;
  action?: string;
};

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;

// Used when the terminal doesn't report its size.
const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;

/*
 * Returns a formatted message for an error response from the agent API. Its
 * controllers send `{ error, details }`, and its auth checks send `{ message }`.
 */
export const formatAgentErrorMessage = (
  status: number,
  data?: { error?: string; message?: string; details?: unknown },
): string => {
  if (status >= 500) return "An internal server error occurred";

  const message =
    data?.error ?? data?.message ?? `Request failed with status ${status}`;
  const details = [data?.details].flat().filter(Boolean).join(", ");

  return details ? `${message}: ${details}` : message;
};

/*
 * Folds session events into the outcome of a run, for a single-run session.
 */
export class AgentRun {
  status: AgentRunStatus = "running";
  error?: string;

  private lastSeq = -1;
  private textBlocks = new Map<string, string>();
  private toolCalls = new Map<string, AgentToolCall>();
  private resources = new Map<string, AgentModifiedResource>();

  get isTerminal(): boolean {
    return this.status !== "running";
  }

  get text(): string {
    return [...this.textBlocks.values()].join("\n\n").trim();
  }

  get toolCallList(): AgentToolCall[] {
    return [...this.toolCalls.values()];
  }

  get modifiedResources(): AgentModifiedResource[] {
    return [...this.resources.values()];
  }

  /*
   * Applies an event, returning false if it has already been seen. Reading from
   * the right offset means that shouldn't happen, but a repeat would print twice.
   *
   * Throws on an event format this CLI doesn't know. A session keeps its events
   * for good and installed CLIs can be old, so guessing could lose the response
   * or miss the end of the run.
   */
  apply(event: AgentEvent): boolean {
    if (event.version !== AGENT_EVENT_VERSION) {
      throw new AgentEventError(
        `This session's events use version ${event.version}, which this CLI can't read. Upgrade the Knock CLI`,
      );
    }

    if (event.seq <= this.lastSeq) return false;
    this.lastSeq = event.seq;

    switch (event.type) {
      case "textContent":
        this.applyText(event);
        break;

      case "toolCall":
        this.applyToolCall(event);
        break;

      case "signal":
        this.applySignal(event);
        break;

      case "runEnd":
        this.status = "complete";
        break;

      case "runError":
        this.status = "error";
        this.error = event.value ?? "The agent run failed";
        break;

      default:
        break;
    }

    return true;
  }

  private applyText({ storedEventId, value }: AgentEvent): void {
    if (value.discarded) {
      this.textBlocks.delete(storedEventId);
    } else if (value.type === "complete") {
      this.textBlocks.set(storedEventId, value.value ?? "");
    } else {
      const text = this.textBlocks.get(storedEventId) ?? "";
      this.textBlocks.set(storedEventId, text + (value.value ?? ""));
    }
  }

  private applyToolCall({ storedEventId, value }: AgentEvent): void {
    if (value.discarded) {
      this.toolCalls.delete(storedEventId);
    } else if (value.type === "complete") {
      this.toolCalls.set(storedEventId, {
        call_id: value.callId,
        name: value.name,
        arguments: tryJsonParse(value.arguments),
      });
    }
  }

  private applySignal({ value }: AgentEvent): void {
    if (value?.action !== "modified_resources_updated") return;

    const { resource_type, resource_key, resource_action } = value;
    this.resources.set(`${resource_type}:${resource_key}`, {
      type: resource_type,
      key: resource_key,
      action: resource_action,
    });
  }
}

/*
 * Parses a raw SSE byte stream from the session journal into event batches. A
 * batch is complete once its control frame carries the offset to resume from.
 */
export async function* readAgentEventStream(
  stream: AsyncIterable<Uint8Array>,
): AsyncGenerator<AgentEventBatch> {
  let pending: AgentEvent[] = [];

  for await (const { event, data } of parseSseFrames(stream)) {
    if (event === "data") {
      pending.push(...JSON.parse(data));
    }

    if (event === "control") {
      const control = JSON.parse(data);
      yield {
        events: pending,
        nextOffset: control.streamNextOffset,
        upToDate: Boolean(control.upToDate),
      };
      pending = [];
    }
  }
}

async function* parseSseFrames(
  stream: AsyncIterable<Uint8Array>,
): AsyncGenerator<{ event?: string; data: string }> {
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of stream) {
    // A multi-byte character can be split across chunks.
    buffer += decoder.decode(chunk, { stream: true });

    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const lines = frame.split(/\r?\n/);
      const event = lines
        .find((line) => line.startsWith("event:"))
        ?.slice("event:".length)
        .trim();

      // Lines without a field name are comments, such as the server heartbeat.
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice("data:".length).trimStart())
        .join("\n");

      if (data) yield { event, data };
    }
  }
}

/*
 * Passes a stream through, failing it if nothing arrives for too long. This has
 * to watch the raw bytes, because parsing throws away the server's heartbeats.
 */
export async function* withIdleTimeout(
  stream: Readable,
  timeoutMs: number,
): AsyncGenerator<Uint8Array> {
  const timer = setTimeout(() => {
    stream.destroy(new Error(`Nothing received for ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    for await (const chunk of stream) {
      timer.refresh();
      yield chunk;
    }
  } finally {
    clearTimeout(timer);
  }
}

const dim = (text: string): string => ux.colorize("gray", text);

const formatDuration = (ms: number): string =>
  ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

// Moves the cursor up over the given lines and erases everything below it.
const eraseLines = (count: number): string => `\u001B[${count}A\u001B[0J`;

// Tool names come from the model, so they could contain anything.
const formatStepName = (name: unknown): string =>
  stripControlChars(String(name ?? ""))
    .replace(/\s+/g, " ")
    .trim();

type RunningStep = { name: string; startedAt: number };

type TerminalSize = { columns?: number; rows?: number };

type AgentEventRendererOpts = {
  // Whether earlier lines can be redrawn, as in a terminal. Otherwise each step
  // only gets a line once it finishes.
  live?: boolean;
  // Read on every redraw, so that a resized terminal is picked up.
  getTerminalSize?: () => TerminalSize;
};

/*
 * Renders session events as they arrive, for people to read. Text is written
 * without buffering so it appears as the agent produces it.
 *
 * Thinking and tool calls are steps. Tools can run in parallel, so each running
 * step holds a spinner line at the bottom of the output. A step's line becomes
 * permanent when it finishes, and everything else is written above the lines
 * that remain. Thinking is only ever shown as a step: its text is noise here,
 * and redacted thinking arrives as an encrypted blob that looks the same.
 */
export class AgentEventRenderer {
  private write: (text: string) => void;
  private live: boolean;
  private getTerminalSize: () => TerminalSize;
  private printed = new Map<string, string>();
  private midLine = false;
  private isAfterBlankLine = false;

  private runningSteps = new Map<string, RunningStep>();
  // Text blocks that have started streaming but haven't been completed.
  private openText = new Set<string>();
  private isRunning = false;
  private drawnLines = 0;
  private frame = 0;
  private timer?: NodeJS.Timeout;

  constructor(
    write: (text: string) => void,
    {
      live = false,
      getTerminalSize = () => process.stdout,
    }: AgentEventRendererOpts = {},
  ) {
    this.write = write;
    this.live = live;
    this.getTerminalSize = getTerminalSize;
  }

  // Whether the last thing written was a blank line, as after a response.
  get endsWithBlankLine(): boolean {
    return this.isAfterBlankLine;
  }

  /*
   * Shows that the agent is working whenever nothing else is, such as between
   * a tool finishing and the agent's next output, until stopped.
   */
  start(): void {
    this.isRunning = true;
    this.redraw();
  }

  /*
   * Takes down any spinners. Call this when no more events will be rendered,
   * since steps still running at that point won't report back.
   */
  stop(): void {
    this.isRunning = false;
    this.runningSteps.clear();

    const newline = this.midLine ? "\n" : "";
    this.midLine = false;
    this.redraw(newline);
  }

  render(event: AgentEvent): void {
    switch (event.type) {
      case "textContent":
        this.renderText(event);
        break;

      case "reasoning":
        this.renderReasoning(event);
        break;

      case "toolCall":
        this.renderToolCall(event);
        break;

      case "toolResponse":
        this.renderToolResponse(event);
        break;

      case "signal":
        this.renderSignal(event);
        break;

      default:
        break;
    }
  }

  private renderText({ storedEventId, value }: AgentEvent): void {
    const printed = this.printed.get(storedEventId) ?? "";

    // A delta can end a line, and the next one may be on its way.
    if (value.discarded || value.type === "complete") {
      this.openText.delete(storedEventId);
    } else {
      this.openText.add(storedEventId);
    }

    if (value.discarded) {
      // It can't be taken back, so at least say it no longer counts.
      if (printed) this.writeLine(dim("(discarded, retrying)"));
      this.printed.delete(storedEventId);
      return;
    }

    const content = stripControlChars(value.value ?? "");

    if (value.type !== "complete") {
      this.writeText(storedEventId, printed, content);
      return;
    }

    // A complete snapshot repeats any deltas that came before it.
    if (content.startsWith(printed)) {
      this.writeText(storedEventId, printed, content.slice(printed.length));
    } else {
      // The snapshot is what counts, so show it rather than lose it.
      this.writeLine(dim("(revised)"));
      this.writeText(storedEventId, "", content);
    }

    this.writeLine("");
  }

  private writeText(id: string, printed: string, text: string): void {
    if (!text) return;

    this.midLine = !text.endsWith("\n");
    this.isAfterBlankLine = false;
    this.printed.set(id, printed + text);
    this.redraw(text);
  }

  private renderReasoning({ storedEventId, value }: AgentEvent): void {
    const step = `reasoning:${storedEventId}`;

    if (value.discarded) {
      this.dropStep(step);
    } else if (value.type === "complete") {
      this.finishStep(step, "Thought");
    } else if (!this.runningSteps.has(step)) {
      this.startStep(step, "Thinking");
    }
  }

  private renderToolCall({ value }: AgentEvent): void {
    const { callId, name, type, discarded } = value;

    if (discarded) {
      this.dropStep(callId);
    } else if (type === "complete") {
      this.startStep(callId, name);
    }
  }

  private renderToolResponse({ value }: AgentEvent): void {
    const { callId, name, status, durationMs } = value;

    this.finishStep(callId, name, { durationMs, failed: status === "error" });
  }

  private startStep(key: string, name: string): void {
    this.runningSteps.set(key, {
      name: formatStepName(name),
      startedAt: Date.now(),
    });

    const newline = this.midLine ? "\n" : "";
    this.midLine = false;
    this.redraw(newline);
  }

  private dropStep(key: string): void {
    this.runningSteps.delete(key);
    this.redraw();
  }

  private finishStep(
    key: string,
    name: string,
    {
      durationMs,
      failed = false,
    }: { durationMs?: number; failed?: boolean } = {},
  ): void {
    const step = this.runningSteps.get(key);
    this.runningSteps.delete(key);

    const elapsed = durationMs ?? (step && Date.now() - step.startedAt);
    const duration =
      elapsed === undefined ? "" : ` (${formatDuration(elapsed)})`;
    const mark = failed ? ux.colorize("red", "✗") : ux.colorize("green", "✓");

    this.writeLine(`${mark} ${formatStepName(name)}${dim(duration)}`);
  }

  private renderSignal({ value }: AgentEvent): void {
    if (value?.type === "modelRetry") {
      this.writeLine(
        dim(`Retrying model request (${value.attempt}/${value.maxAttempts})`),
      );
    }
  }

  private writeLine(line: string): void {
    const newline = this.midLine ? "\n" : "";
    this.midLine = false;
    this.isAfterBlankLine = line === "";
    this.redraw(`${newline}${line}\n`);
  }

  /*
   * Writes the given text above the spinner lines, as one write so that the
   * terminal doesn't flicker. Spinners wait while a line of text is unfinished.
   */
  private redraw(text = ""): void {
    const erase = this.drawnLines > 0 ? eraseLines(this.drawnLines) : "";

    const lines = this.live && !this.midLine ? this.buildSpinnerLines() : [];

    this.drawnLines = lines.length;

    const output = `${erase}${text}${lines.join("")}`;
    if (output) this.write(output);

    this.syncTimer();
  }

  /*
   * Moving back up to redraw only works if each line takes up exactly one row
   * and all of them are on screen, so names are cut to fit and extra steps are
   * counted instead of listed. The sizes can be 0, as well as missing.
   */
  private buildSpinnerLines(): string[] {
    const { columns, rows } = this.getTerminalSize();

    const steps = this.isWaiting()
      ? [{ name: "Working" }]
      : [...this.runningSteps.values()];
    const maxLines = Math.max((rows || DEFAULT_ROWS) - 1, 1);
    const shown =
      steps.length > maxLines ? steps.slice(0, maxLines - 1) : steps;

    const length = Math.max((columns || DEFAULT_COLUMNS) - 3, 1);
    const spinner = ux.colorize(
      "cyan",
      SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length],
    );

    const lines = shown.map(
      ({ name }) => `${spinner} ${truncate(name, { length })}\n`,
    );

    const hidden = steps.length - shown.length;

    return hidden > 0 ? [...lines, dim(`  + ${hidden} more\n`)] : lines;
  }

  // Started, with nothing running and no text on its way.
  private isWaiting(): boolean {
    return (
      this.isRunning && this.runningSteps.size === 0 && this.openText.size === 0
    );
  }

  private syncTimer(): void {
    const shouldTick =
      this.live && (this.runningSteps.size > 0 || this.isWaiting());

    if (shouldTick && !this.timer) {
      this.timer = setInterval(() => {
        this.frame += 1;
        this.redraw();
      }, SPINNER_INTERVAL_MS);

      // Never keep the process alive just to animate.
      this.timer.unref();
    }

    if (!shouldTick && this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
