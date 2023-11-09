import { CommitData } from "./types";

export function formatCommitAuthor(commit: CommitData): string {
  const email = commit.author.email;
  const name = commit.author.name;

  return name ? `${name} <${email}>` : `<${email}>`;
}
