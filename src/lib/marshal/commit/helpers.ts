import { CommitData } from "./types";

export function formatCommitResource(commit: CommitData): string {
  const type = commit.resource.type;
  const identifier = commit.resource.identifier;

  return `${type} - ${identifier}`;
}

export function formatCommitAuthor(commit: CommitData): string {
  const email = commit.author.email;
  const name = commit.author.name;

  return name ? `${name} <${email}>` : `<${email}>`;
}
