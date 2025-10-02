import type { Commit } from "@knocklabs/mgmt/resources/commits";

export function formatCommitAuthor(commit: Commit): string {
  const email = commit.author.email;
  const name = commit.author.name;

  return name ? `${name} <${email}>` : `<${email}>`;
}
