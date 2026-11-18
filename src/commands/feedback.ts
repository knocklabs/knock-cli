import { text as readText } from "node:stream/consumers";

import { Args, Flags } from "@oclif/core";

import KnockHelp from "@/help";
import { CreateFeedbackBody, Feedback } from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";

// A --field with this key is sent as the note, the same as the positional arg.
const NOTE_FIELD = "note";

export default class FeedbackCommand extends BaseCommand<
  typeof FeedbackCommand
> {
  static summary =
    "Send bugs, friction, and feature requests to the Knock team.";

  static description = `Don't include secrets or personally identifiable information (PII) in feedback.

Pass - as the note to read it from stdin. Put -- first if the note itself starts with a dash.

Add context with repeatable --field key=value options. Any key is accepted, all values are strings, and the last value wins when a key repeats. These keys are recommended:

  type      A category such as bug, friction, or feature.
  product   The Knock product involved, such as workflows or guides.
  model     The name of the model used for the task.
  tool      The tool, command, or endpoint affected.
  task      What you were trying to do.
  expected  What you expected to happen.
  actual    What happened, including any error text.
  impact    The time spent, retries, or workarounds used.

The CLI version is sent along with your feedback. Agents can use this command to report issues they run into while completing a task.`;

  static examples = [
    `<%= config.bin %> <%= command.id %> "The error didn't explain how to fix the issue"`,
    "cat notes.md | <%= config.bin %> <%= command.id %> - --field product=workflows",
    `<%= config.bin %> <%= command.id %> "The validation error didn't name the missing variable" --field type=bug --field tool="knock workflow push" --field expected="An error naming the variable" --field actual="data is invalid"`,
  ];

  static flags = {
    field: Flags.string({
      summary:
        "Context about the feedback as key=value, such as type=bug. Repeatable.",
      multiple: true,
    }),
  };

  static args = {
    note: Args.string({
      description: "Your feedback, or - to read it from stdin.",
      // Otherwise oclif reads stdin itself and joins its lines.
      ignoreStdin: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<Feedback | void> {
    const { args, flags } = this.props;

    if (args.note === undefined && !flags.field?.length) {
      return new KnockHelp(this.config).showHelp([this.id!]);
    }

    const { [NOTE_FIELD]: noteField, ...fields } = this.parseFields(
      flags.field ?? [],
    );

    if (args.note !== undefined && noteField !== undefined) {
      this.error(
        `Pass the note as an argument or as --field ${NOTE_FIELD}=..., not both.`,
      );
    }

    const message = await this.readNote(args.note ?? noteField);

    const body: CreateFeedbackBody = {
      message,
      // Fields you pass win over the metadata the CLI adds.
      context: { cli_version: this.config.version, ...fields },
    };

    const resp = await withSpinner<{ feedback: Feedback }>(
      () => this.apiV1.createFeedback(body),
      { action: "‣ Sending feedback" },
    );

    if (flags.json) return resp.data.feedback;

    this.log("‣ Feedback sent, thank you!");
  }

  private parseFields(pairs: string[]): Record<string, string> {
    const fields: Record<string, string> = {};

    for (const pair of pairs) {
      const index = pair.indexOf("=");
      const key = index === -1 ? "" : pair.slice(0, index).trim();

      if (!key) {
        this.error(
          `Invalid --field "${pair}". Use key=value, such as --field type=bug.`,
        );
      }

      fields[key] = pair.slice(index + 1);
    }

    return fields;
  }

  private async readNote(note: string | undefined): Promise<string> {
    const text = note === "-" ? await this.readStdin() : note ?? "";

    if (!text.trim()) {
      this.error(
        "The note is empty. Pass your feedback as an argument, or - to read it from stdin.",
      );
    }

    return text.trim();
  }

  private async readStdin(): Promise<string> {
    if (process.stdin.isTTY) {
      this.error("No note on stdin. Pipe one in, or pass it as an argument.");
    }

    return readText(process.stdin);
  }
}
