import { randomUUID } from "node:crypto";
import { text as readText } from "node:stream/consumers";
import { setTimeout as sleep } from "node:timers/promises";

import { Args, Flags, Interfaces } from "@oclif/core";

import { CreateAgentSessionBody } from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import {
  AGENT_READ_TIMEOUT_MS,
  AgentEvent,
  AgentEventBatch,
  AgentEventRenderer,
  AgentModifiedResource,
  AgentRun,
  AgentToolCall,
  formatAgentErrorMessage,
  readAgentEventStream,
  withIdleTimeout,
} from "@/lib/helpers/agent-session";
import { AgentEventError, ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { tryJsonParse } from "@/lib/helpers/json";
import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { isSuccessResp } from "@/lib/helpers/request";
import { indentString, stripControlChars } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import { viewAgentSessionUrl } from "@/lib/urls";

// Reads from the start of the journal, per the Durable Streams protocol.
const START_OFFSET = "-1";

// A session's dashboard URL ends with its ID, so either can be passed.
const SESSION_URL_ID = /\/agents\/sessions\/([^#/?]+)/;
const SESSION_ID = /^[\w-]+$/;

// Polling starts quick for short runs and slows down for long ones. Past about
// 4 seconds Node drops the idle socket, so each poll would pay for a handshake.
const MIN_POLL_INTERVAL_MS = 2000;
const MAX_POLL_INTERVAL_MS = 4000;

// Live connections end routinely, so reconnect at once unless one died quickly.
const MIN_CONNECTION_MS = 1000;

const DEFAULT_TIMEOUT_SECONDS = 30 * 60;

// Each of these would otherwise end the CLI and leave the agent running.
const STOP_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;

// The longest delay that fits in a Node timer.
const MAX_TIMEOUT_SECONDS = 2_147_483;

// How many reads in a row can fail before giving up on following the run. These
// add up to about 2 minutes of backoff, enough to ride out a network change.
const MAX_READ_FAILURES = 12;
const MAX_AUTH_FAILURES = 3;
const MAX_BACKOFF_MS = 15_000;

// The same code `this.error` exits with.
const EXIT_CODE_FAILED = 2;
const EXIT_CODE_INTERRUPTED = 130;

type PromptStatus = "complete" | "error" | "timeout" | "interrupted" | "lost";

type PromptResult = {
  session_id: string;
  run_id: string;
  session_url?: string;
  status: PromptStatus;
  text: string;
  tool_calls: AgentToolCall[];
  modified_resources: AgentModifiedResource[];
  error?: string;
};

type PromptOutcome = Pick<PromptResult, "status" | "error">;

type AgentTarget = { environment?: string; branch?: string };

// Where an existing session's journal ends, and where its last prompt ran.
type SessionJournal = { offset: string; environment?: string };

const SPINNER_LABELS: Record<PromptStatus, string | undefined> = {
  complete: undefined,
  error: "failed",
  timeout: "timed out",
  interrupted: "interrupted",
  lost: "lost track",
};

// For a 200 that isn't from the journal, such as a proxy's login page. These are
// worth retrying, and 502 is what a proxy would call it if it were honest.
const unexpectedResponseError = (): ApiError =>
  new ApiError("Received an unexpected response from Knock", 502);

const toApiError = (status: number, data: unknown): ApiError => {
  const body = typeof data === "object" ? (data as AnyObj | null) : undefined;
  const message = formatAgentErrorMessage(status, body ?? undefined);
  return new ApiError(stripControlChars(message), status);
};

const notFoundError = (sessionId: string, data: unknown): ApiError => {
  const body = typeof data === "object" ? (data as AnyObj | null) : undefined;

  return body?.error === "session not found"
    ? new ApiError(
        `Agent session ${sessionId} doesn't exist in this account, or has been archived.`,
        404,
      )
    : new ApiError(
        "The Knock agent isn't enabled for this account. Please contact support to enable it.",
        404,
      );
};

// The environment or branch a prompt ran in, or undefined for the default.
const promptEnvironment = (event: AgentEvent): string | undefined => {
  const context: unknown = event.value?.context;
  if (!Array.isArray(context)) return undefined;

  const value = context.find((item) => item?.type === "environment")?.value;
  return typeof value === "string" && value ? value : undefined;
};

const isAuthError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401;

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof AgentEventError) return false;

  // Anything else is a dropped connection or a stream cut off mid-frame.
  if (!(error instanceof ApiError)) return true;

  const { status = 0 } = error;
  return status === 429 || status >= 500;
};

const backoffMs = (failures: number): number =>
  Math.min(1000 * 2 ** (failures - 1), MAX_BACKOFF_MS);

const pollIntervalMs = (elapsedMs: number): number =>
  Math.min(
    Math.max(elapsedMs * 0.05, MIN_POLL_INTERVAL_MS),
    MAX_POLL_INTERVAL_MS,
  );

export default class Agent extends BaseCommand<typeof Agent> {
  static summary = "Run a prompt with the Knock agent in your account.";

  static description = `Starts a new agent session and shows what the agent is doing as it happens. The agent can read and change resources in your account.

Pass --session with the ID of an earlier session to follow up in it. The agent keeps what it knows from that session, and works in the same environment or branch unless you pass --environment or --branch.

Pass - as the prompt to read it from stdin. Put -- first if the prompt itself starts with a dash. Pass --response-only to print only the agent's response, once it finishes.`;

  static examples = [
    '<%= config.bin %> <%= command.id %> "Add an email step to the welcome workflow"',
    "cat prompt.txt | <%= config.bin %> <%= command.id %> -",
    '<%= config.bin %> <%= command.id %> "Add a new-user guide" --response-only --branch my-feature',
    '<%= config.bin %> <%= command.id %> --session 3f2a6c1e-8b4d-4f7a-9c2e-5d1b0a7e6f43 "Now shorten the subject line"',
    '<%= config.bin %> <%= command.id %> -- "- Add an email step"',
  ];

  static flags = {
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
    session: Flags.string({
      summary:
        "The ID of an agent session to follow up in, or its dashboard URL. Stays in the session's environment or branch unless --environment or --branch is passed.",
    }),
    "response-only": Flags.boolean({
      summary:
        "Print only the agent's response, once it finishes, instead of its activity as it happens.",
    }),
    timeout: Flags.integer({
      summary:
        "Seconds to wait for the agent to finish. The agent keeps running after this.",
      default: DEFAULT_TIMEOUT_SECONDS,
      min: 1,
      max: MAX_TIMEOUT_SECONDS,
    }),
  };

  static args = {
    prompt: Args.string({
      required: true,
      description: "The prompt to run, or - to read it from stdin.",
      // Otherwise oclif reads stdin itself and joins the lines of the prompt.
      ignoreStdin: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<PromptResult | void> {
    const followUpId = this.parseSessionFlag();
    const target = this.resolveTarget(Boolean(followUpId));

    const prompt = await this.readPrompt();

    // Read before the run starts, so that only the new run's events are shown.
    const journal = followUpId ? await this.readJournal(followUpId) : undefined;

    const sessionId = followUpId ?? randomUUID();
    const runId = randomUUID();
    const sessionUrl = await this.buildSessionUrl(sessionId);

    // Branches are environments to the agent. Each run falls back to the
    // account's default environment when given none, so a follow-up names the
    // one its session was in.
    const envOrBranch =
      target.branch ?? target.environment ?? journal?.environment;

    // Set up before the session starts, so that it can't be orphaned. A second
    // Ctrl-C falls through to the default handler and kills the process.
    const interrupt = new AbortController();
    const onInterrupt = () => interrupt.abort();

    for (const signal of STOP_SIGNALS) process.once(signal, onInterrupt);

    try {
      await this.startRun({
        id: sessionId,
        runId,
        prompt,
        envOrBranch,
        isFollowUp: Boolean(journal),
      });

      const session = {
        session_id: sessionId,
        run_id: runId,
        session_url: sessionUrl,
      };

      this.logToStderr(
        `‣ ${journal ? "Continuing" : "Started"} agent session ${sessionId}`,
      );
      if (sessionUrl) this.logToStderr(indentString(sessionUrl, 4));

      const run = new AgentRun();
      const offset = journal?.offset ?? START_OFFSET;
      const outcome = await this.waitForRun(session, run, interrupt, offset);

      return this.finish({
        ...session,
        ...outcome,
        text: run.text,
        tool_calls: run.toolCallList,
        modified_resources: run.modifiedResources,
      });
    } finally {
      for (const signal of STOP_SIGNALS) process.off(signal, onInterrupt);
    }
  }

  /*
   * oclif's JSON error path loses the message, which isn't enumerable, and the
   * exit code. This covers errors from before a session starts: after that,
   * failures are reported through the result.
   */
  protected async catch(err: Interfaces.CommandError): Promise<void> {
    if (this.jsonEnabled()) {
      const { oclif } = err as Partial<Interfaces.OclifError>;
      process.exitCode = oclif?.exit ?? EXIT_CODE_FAILED;
    }

    return super.catch(err);
  }

  protected toErrorJson(err: unknown): { error: { message: string } } {
    return { error: { message: (err as Error).message } };
  }

  // With --json, the output is a single result once the run has finished.
  private isStreaming(): boolean {
    return !this.props.flags["response-only"] && !this.jsonEnabled();
  }

  private parseSessionFlag(): string | undefined {
    const value = this.props.flags.session?.trim();
    if (value === undefined) return undefined;

    const id = value.match(SESSION_URL_ID)?.[1] ?? value;

    if (!SESSION_ID.test(id)) {
      this.error(
        "--session must be the ID of an agent session, or its dashboard URL.",
      );
    }

    return id;
  }

  // An agent that can change resources shouldn't guess what it's pointed at.
  private resolveTarget(isFollowUp: boolean): AgentTarget {
    const { environment } = this.props.flags;

    // A follow-up stays where its session is unless told otherwise, so a branch
    // that only comes from .knockbranch doesn't move it.
    const isBranchFromFile = this.parseMetadata.flags.branch?.setFromDefault;
    const branch =
      isFollowUp && isBranchFromFile ? undefined : this.props.flags.branch;

    // For example, `--environment "$KNOCK_ENV"` with the variable unset.
    if (environment === "") {
      this.error("--environment can't be empty.");
    }

    // Matches the API, which rejects a branch with any other environment.
    if (branch && environment && environment !== "development") {
      this.error(
        "A branch can only be used with the development environment. Remove --environment, or run `knock branch exit` if the branch comes from .knockbranch.",
      );
    }

    return { environment, branch };
  }

  private async readPrompt(): Promise<string> {
    const { prompt } = this.props.args;

    const text = prompt === "-" ? await this.readStdin() : prompt;
    if (!text.trim()) this.error("The prompt is empty.");

    return text.trim();
  }

  private async readStdin(): Promise<string> {
    if (process.stdin.isTTY) {
      this.error("No prompt on stdin. Pipe one in, or pass it as an argument.");
    }

    return readText(process.stdin);
  }

  // Only used to link to the session, so a failure here shouldn't stop the run.
  private async buildSessionUrl(
    sessionId: string,
  ): Promise<string | undefined> {
    const resp = await this.apiV1.whoami().catch(() => null);
    if (!resp || !isSuccessResp(resp)) return undefined;

    return viewAgentSessionUrl(
      this.sessionContext.dashboardOrigin,
      resp.data.account_slug,
      sessionId,
    );
  }

  /*
   * Reads an existing session's journal to the end. A follow-up shows events
   * from there on, and runs where the last prompt ran.
   */
  private async readJournal(sessionId: string): Promise<SessionJournal> {
    let offset = START_OFFSET;
    let environment: string | undefined;

    /* eslint-disable no-await-in-loop -- each read resumes where the last ended. */
    for (;;) {
      const resp = await this.apiV1
        .getAgentSessionEvents(sessionId, { offset })
        .catch((error: Error) =>
          this.error(
            `Could not read agent session ${sessionId}: ${error.message}`,
          ),
        );

      if (resp.status === 404) this.error(notFoundError(sessionId, resp.data));
      if (!isSuccessResp(resp)) this.error(toApiError(resp.status, resp.data));

      const nextOffset = resp.headers["stream-next-offset"];

      if (!Array.isArray(resp.data) || !nextOffset) {
        this.error(unexpectedResponseError());
      }

      for (const event of resp.data) {
        if (event?.type === "prompt") environment = promptEnvironment(event);
      }

      offset = nextOffset;

      const isUpToDate = resp.headers["stream-up-to-date"] === "true";
      if (isUpToDate || resp.data.length === 0) return { offset, environment };
    }
    /* eslint-enable no-await-in-loop */
  }

  private async startRun({
    id,
    runId,
    prompt,
    envOrBranch,
    isFollowUp,
  }: {
    id: string;
    runId: string;
    prompt: string;
    envOrBranch?: string;
    isFollowUp: boolean;
  }): Promise<void> {
    const body: CreateAgentSessionBody = {
      id,
      run_id: runId,
      prompt,
      // There's no CLI invocation source. The api source fits best: it gets
      // plain markdown output and no interactive tools. The mcp source would
      // hide these sessions from the dashboard.
      source: "api",
      context: envOrBranch ? [{ type: "environment", value: envOrBranch }] : [],
    };

    const request = isFollowUp
      ? this.apiV1.createAgentRun(body)
      : this.apiV1.createAgentSession(body);

    const resp = await request.catch((error: Error) =>
      this.error(
        isFollowUp
          ? `Could not confirm that the prompt in agent session ${id} started: ${error.message}`
          : `Could not confirm that agent session ${id} started: ${error.message}`,
      ),
    );

    if (resp.status === 404) this.error(notFoundError(id, resp.data));

    if (resp.status === 409) {
      this.error(
        new ApiError(
          `Agent session ${id} is still running. Wait for it to finish, then follow up again.`,
          409,
        ),
      );
    }

    if (resp.status !== 202) this.error(toApiError(resp.status, resp.data));
  }

  private async waitForRun(
    session: Pick<PromptResult, "session_id" | "session_url">,
    run: AgentRun,
    interrupt: AbortController,
    offset: string,
  ): Promise<PromptOutcome> {
    const { timeout } = this.props.flags;

    const renderer = this.buildRenderer();
    const showSpinner = !this.isStreaming() && !this.jsonEnabled();

    const onEvent = (event: AgentEvent) => renderer?.render(event);

    const signal = AbortSignal.any([
      interrupt.signal,
      AbortSignal.timeout(timeout * 1000),
    ]);

    if (showSpinner) spinner.start("‣ Running");
    renderer?.start();

    let failure: unknown;

    try {
      const from = { sessionId: session.session_id, offset };
      await this.followRun(from, run, onEvent, signal);
    } catch (error) {
      if (!signal.aborted) failure = error;
    }

    renderer?.stop();

    const outcome = await this.resolveOutcome(session, run, interrupt, failure);

    if (showSpinner) spinner.stop(SPINNER_LABELS[outcome.status]);

    return outcome;
  }

  private async resolveOutcome(
    {
      session_id: sessionId,
      session_url: sessionUrl,
    }: Pick<PromptResult, "session_id" | "session_url">,
    run: AgentRun,
    interrupt: AbortController,
    failure: unknown,
  ): Promise<PromptOutcome> {
    const see = sessionUrl ? ` See ${sessionUrl}` : "";

    if (run.status === "complete" || run.status === "error") {
      return { status: run.status, error: run.error };
    }

    if (interrupt.signal.aborted) {
      // Said once the spinners are down, so that redrawing them can't erase it.
      this.logToStderr(`‣ Stopping agent session ${sessionId}...`);
      const stopped = await this.stopSession(sessionId);

      return {
        status: "interrupted",
        error: stopped
          ? `Stopped agent session ${sessionId}.`
          : `Could not stop agent session ${sessionId}, which may still be running.${see}`,
      };
    }

    if (failure) {
      return {
        status: "lost",
        error: this.formatLost(sessionId, failure, see),
      };
    }

    const { timeout } = this.props.flags;

    return {
      status: "timeout",
      error: `Timed out after ${timeout}s. Agent session ${sessionId} may still be running. Increase --timeout to wait longer.${see}`,
    };
  }

  private formatLost(sessionId: string, failure: unknown, see: string): string {
    const isExplained =
      failure instanceof ApiError || failure instanceof AgentEventError;

    // Parser and socket errors don't mean anything to the person running this.
    const reason = isExplained
      ? (failure as Error).message
      : "the connection was interrupted";

    const hint =
      isAuthError(failure) && this.sessionContext.type === "oauth"
        ? " Run `knock login` and try again."
        : "";

    return `Lost track of agent session ${sessionId}, which may still be running: ${reason}.${hint}${see}`;
  }

  private finish(result: PromptResult): PromptResult | void {
    const { status, error, text, modified_resources: resources } = result;
    const { session_id: sessionId } = result;

    if (this.jsonEnabled()) {
      if (status === "interrupted") process.exitCode = EXIT_CODE_INTERRUPTED;
      else if (status !== "complete") process.exitCode = EXIT_CODE_FAILED;

      return result;
    }

    if (!this.isStreaming() && text) {
      // Control characters only do anything in a terminal, and output sent to a
      // file or another program should stay exactly as the agent wrote it.
      this.log(process.stdout.isTTY ? stripControlChars(text) : text);
    }

    this.logModifiedResources(resources);

    // Once a run has ended, the session can take another prompt.
    if (status === "complete" || status === "error") {
      this.logToStderr(
        `‣ Follow up with: ${this.config.bin} ${this.id} --session ${sessionId} "<prompt>"`,
      );
    }

    if (status === "interrupted") {
      this.logToStderr(`‣ ${error}`);
      this.exit(EXIT_CODE_INTERRUPTED);
    }

    if (status !== "complete") {
      const message = stripControlChars(error ?? "");
      this.error(
        status === "error" ? `The agent run failed: ${message}` : message,
      );
    }
  }

  private buildRenderer(): AgentEventRenderer | undefined {
    if (!this.isStreaming()) return undefined;

    return new AgentEventRenderer((text) => process.stdout.write(text), {
      live: Boolean(process.stdout.isTTY) && process.env.TERM !== "dumb",
    });
  }

  private async followRun(
    from: { sessionId: string; offset: string },
    run: AgentRun,
    onEvent: (event: AgentEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const { sessionId } = from;
    const startedAt = Date.now();

    let { offset } = from;
    let behind = false;
    let failures = 0;

    const applyBatch = (batch: AgentEventBatch) => {
      try {
        for (const event of batch.events) {
          if (run.apply(event)) onEvent(event);
        }
      } catch (error) {
        // Reading it again won't help, and retrying would hide the problem.
        throw error instanceof AgentEventError
          ? error
          : new AgentEventError(`Could not process an event: ${error}`);
      }

      offset = batch.nextOffset;
      behind = !batch.upToDate && batch.events.length > 0;
      failures = 0;
    };

    /* eslint-disable no-await-in-loop -- each read resumes where the last ended. */
    while (!run.isTerminal) {
      const readStartedAt = Date.now();
      behind = false;

      try {
        for await (const batch of this.readEvents(sessionId, offset, signal)) {
          applyBatch(batch);

          // The server sends one chunk per connection and then only sends more
          // when there's a new event, so read the rest of a backlog straight away.
          if (run.isTerminal || behind) break;
        }

        if (run.isTerminal || behind) continue;

        const now = Date.now();
        const interval = this.isStreaming()
          ? MIN_CONNECTION_MS
          : pollIntervalMs(now - startedAt);
        const wait = interval - (now - readStartedAt);

        if (wait > 0) await sleep(wait, undefined, { signal });
      } catch (error) {
        if (signal.aborted) throw error;

        failures += 1;

        const canRetry = isAuthError(error)
          ? await this.refreshApiClient()
          : isRetryableError(error);

        const maxFailures = isAuthError(error)
          ? MAX_AUTH_FAILURES
          : MAX_READ_FAILURES;

        if (!canRetry || failures >= maxFailures) throw error;

        await sleep(backoffMs(failures), undefined, { signal });
      }
    }
    /* eslint-enable no-await-in-loop */
  }

  private async *readEvents(
    sessionId: string,
    offset: string,
    signal: AbortSignal,
  ): AsyncGenerator<AgentEventBatch> {
    if (this.isStreaming()) {
      const resp = await this.apiV1.streamAgentSessionEvents(sessionId, {
        offset,
        signal,
      });

      if (!isSuccessResp(resp)) {
        // Error bodies arrive as a stream here too.
        throw toApiError(resp.status, tryJsonParse(await readText(resp.data)));
      }

      if (!String(resp.headers["content-type"]).includes("event-stream")) {
        throw unexpectedResponseError();
      }

      yield* readAgentEventStream(
        withIdleTimeout(resp.data, AGENT_READ_TIMEOUT_MS),
      );
      return;
    }

    const resp = await this.apiV1.getAgentSessionEvents(sessionId, {
      offset,
      signal,
    });

    if (!isSuccessResp(resp)) throw toApiError(resp.status, resp.data);

    const nextOffset = resp.headers["stream-next-offset"];

    if (!Array.isArray(resp.data) || !nextOffset) {
      throw unexpectedResponseError();
    }

    yield {
      events: resp.data,
      nextOffset,
      upToDate: resp.headers["stream-up-to-date"] === "true",
    };
  }

  // A held stream only checks the token when it connects, so the token may have
  // expired without anything noticing until now.
  private async stopSession(sessionId: string): Promise<boolean> {
    const stop = () => this.apiV1.stopAgentSession(sessionId).catch(() => null);

    let resp = await stop();

    if (resp?.status === 401 && (await this.refreshApiClient())) {
      resp = await stop();
    }

    return Boolean(resp && isSuccessResp(resp));
  }

  private logModifiedResources(resources: AgentModifiedResource[]): void {
    if (resources.length === 0) return;

    this.logToStderr("‣ Modified resources:");

    for (const { action, type, key } of resources) {
      const parts = [action, type, key].filter(Boolean).join(" ");
      this.logToStderr(indentString(stripControlChars(parts), 4));
    }
  }
}
