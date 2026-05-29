import { Help, ux } from "@oclif/core";

const BRAND_COLOR = "#FF573A";

const WORDMARK = `
██╗  ██╗███╗   ██╗ ██████╗  ██████╗██╗  ██╗
██║ ██╔╝████╗  ██║██╔═══██╗██╔════╝██║ ██╔╝
█████╔╝ ██╔██╗ ██║██║   ██║██║     █████╔╝ 
██╔═██╗ ██║╚██╗██║██║   ██║██║     ██╔═██╗ 
██║  ██╗██║ ╚████║╚██████╔╝╚██████╗██║  ██╗
╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
`.trim();

type Entry = [cmd: string, summary: string];

const GET_STARTED: Entry[] = [
  ["knock login", "Log in with a Knock user account"],
  ["knock init", "Initialize a new Knock project (knock.json)"],
];

const COMMON: Entry[] = [
  ["knock workflow pull", "Pull workflows into a local file system"],
  ["knock workflow push", "Push workflows from a local file system to Knock"],
  ["knock push", "Push all resources from a local file system to Knock"],
  ["knock commit promote", "Promote commits to the subsequent environment"],
  ["knock <command> --help", "Get help for a command"],
];

function brand(text: string): string {
  return ux.colorize(BRAND_COLOR, text);
}

export default class KnockHelp extends Help {
  protected async showRootHelp(): Promise<void> {
    this.log("");
    this.log(brand(WORDMARK));
    this.log("");
    this.log(`» Knock CLI\n`);
    this.logSection("Get started:", GET_STARTED);
    this.logSection("Common commands:", COMMON);
  }

  private logSection(title: string, entries: Entry[]): void {
    const pad = Math.max(...entries.map(([c]) => c.length));
    this.log(title);
    this.log("");

    for (const [cmd, summary] of entries) {
      this.log(`  ${brand(cmd.padEnd(pad))}  ${summary}`);
    }

    this.log("");
  }
}
