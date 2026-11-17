/*
 * Terminal input for an interactive agent session: reading the next prompt, and
 * watching for the person to stop the agent while it runs.
 */
import * as readline from "node:readline";

export type PromptInput = NodeJS.ReadableStream & {
  isTTY?: boolean;
  setRawMode?: (mode: boolean) => unknown;
};

export type InterruptKey = "escape" | "ctrl-c";

type Keypress = { name?: string; ctrl?: boolean };

// Asks the terminal to mark pasted text, so that a pasted line break doesn't
// send the prompt before the rest of it arrives.
const ENABLE_BRACKETED_PASTE = "\u001B[?2004h";
const DISABLE_BRACKETED_PASTE = "\u001B[?2004l";

const HISTORY_SIZE = 100;

const toInterruptKey = (key?: Keypress): InterruptKey | undefined => {
  if (key?.name === "escape") return "escape";
  if (key?.ctrl && key.name === "c") return "ctrl-c";
  return undefined;
};

export class AgentPromptReader {
  private input: PromptInput;
  private output: NodeJS.WritableStream;
  // Readline adds to this as lines are entered, so it lasts across prompts.
  private readonly history: string[] = [];

  constructor(input: PromptInput, output: NodeJS.WritableStream) {
    this.input = input;
    this.output = output;
  }

  /*
   * Reads a prompt, which can span lines when pasted or when a line ends with
   * a backslash. Resolves with undefined when the person wants to quit: Ctrl-D,
   * or Ctrl-C with nothing typed. Ctrl-C with something typed clears it. Also
   * resolves with undefined once the given signal aborts.
   */
  read(
    prompt: string,
    {
      continuation = "  ",
      signal,
    }: { continuation?: string; signal?: AbortSignal } = {},
  ): Promise<string | undefined> {
    const { input, output, history } = this;

    return new Promise((resolve) => {
      const lines: string[] = [];
      let isPasting = false;
      let isSubmitting = false;
      let isDone = false;

      // Added before the interface's own listener, so a paste is known about
      // before the line breaks inside it are handled.
      readline.emitKeypressEvents(input);
      const onKeypress = (_char: string, key?: Keypress) => {
        if (key?.name === "paste-start") isPasting = true;
        if (key?.name === "paste-end") isPasting = false;
      };

      input.on("keypress", onKeypress);

      const rl = readline.createInterface({
        input,
        output,
        prompt,
        terminal: true,
        history,
        historySize: HISTORY_SIZE,
        removeHistoryDuplicates: true,
      });

      const finish = (value?: string) => {
        if (isDone) return;
        isDone = true;

        // Anything after this, such as the agent's response, starts on its own line.
        if (value === undefined) output.write("\n");

        signal?.removeEventListener("abort", onAbort);
        input.off("keypress", onKeypress);
        output.write(DISABLE_BRACKETED_PASTE);
        rl.close();
        resolve(value);
      };

      const onAbort = () => finish();

      rl.on("line", (line: string) => {
        if (isPasting || isSubmitting) {
          lines.push(line);
          return;
        }

        if (line.endsWith("\\")) {
          lines.push(line.slice(0, -1));
          rl.setPrompt(continuation);
          rl.prompt();
          return;
        }

        lines.push(line);

        // Lines that come in with this one are a paste the terminal didn't
        // mark, so they're kept together, along with any unfinished last line.
        isSubmitting = true;
        setImmediate(() => {
          if (rl.line) lines.push(rl.line);
          finish(lines.join("\n"));
        });
      });

      rl.on("SIGINT", () => {
        if (!rl.line && lines.length === 0) {
          finish();
          return;
        }

        // Clears what's been typed on this line, then starts over on a new one
        // if earlier lines are on screen.
        rl.write(null, { ctrl: true, name: "e" });
        rl.write(null, { ctrl: true, name: "u" });

        if (lines.length > 0) {
          lines.length = 0;
          output.write("\n");
          rl.setPrompt(prompt);
          rl.prompt();
        }
      });

      // Ctrl-D on an empty line.
      rl.on("close", () => finish());

      if (signal?.aborted) {
        finish();
        return;
      }

      signal?.addEventListener("abort", onAbort);

      output.write(ENABLE_BRACKETED_PASTE);
      rl.prompt();
    });
  }

  /*
   * Calls back when Esc or Ctrl-C is pressed, until the returned function is
   * called. Anything else typed is dropped, so it doesn't end up mixed into the
   * agent's output.
   */
  watchForInterrupt(onInterrupt: (key: InterruptKey) => void): () => void {
    const { input } = this;

    readline.emitKeypressEvents(input);

    const onKeypress = (_char: string, key?: Keypress) => {
      const interruptKey = toInterruptKey(key);
      if (interruptKey) onInterrupt(interruptKey);
    };

    input.setRawMode?.(true);
    input.on("keypress", onKeypress);
    input.resume();

    return () => {
      input.off("keypress", onKeypress);
      input.setRawMode?.(false);
      input.pause();
    };
  }
}
