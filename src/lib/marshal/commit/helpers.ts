import { CommitData } from "./types";

export function formatCommitTarget(commit: CommitData): string {
  const target = commit.target.type;
  const identifier = commit.target.identifier;

  return `${target} - ${identifier}`;
}

export function formatCommitAuthor(commit: CommitData): string {
  const email = commit.author.email;
  const name = commit.author.name;

  return name ? `${name} - ${email}` : email;
}
