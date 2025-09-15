import enquirer from "enquirer";

import BaseCommand from "@/lib/base-command";

const JOKES = [
  ["Boo.", "Boo who?", "Don't cry, it's just a joke!"],
  ["Cows go.", "Cows go who?", "No silly, cows go moo!"],
  ["Lettuce.", "Lettuce who?", "Lettuce in!"],
  ["Interrupting cow.", "Interrupting cow wh—", "MOO!"],
  ["Alpaca.", "Alpaca who?", "Alpaca the suitcase, let's go on vacation!"],
  ["To.", "To who?", "It's to whom."],
  [
    "HIPAA.",
    "HIPAA who?",
    "I'm sorry, I’m not authorized to release that information.",
  ],
  ["Control freak.", "Con–", "Okay, now you say, 'Control freak who?'."],
  ["Dejav.", "Dejav who?", "Knock, knock."],
  ["Art.", "Art who?", "R2D2!"],
  ["Spell.", "Spell who?", "W-h-o"],
  ["Beets.", "Beets who?", "Beets me!"],
];

export default class Knock extends BaseCommand<typeof Knock> {
  // Because, it's a secret :)
  static hidden = true;
  protected requiresAuth = false;

  public async run(): Promise<void> {
    const promptOpts = { type: "invisible", name: "input" };
    await enquirer.prompt({ ...promptOpts, message: "Who's there?" });

    const randomIndex = Math.floor(Math.random() * JOKES.length);
    const lines = JOKES[randomIndex];

    for (const line of lines) {
      // eslint-disable-next-line no-await-in-loop
      await enquirer.prompt({ ...promptOpts, message: line });
    }

    this.log("");
    this.log("Thank you for using Knock, and have a nice day! 🙂");
  }
}
