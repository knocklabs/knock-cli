// Commit payload data from the API.
export type CommitData = {
  id: string;
  target: { type: string; identifier: string };
  author: { name?: string; email: string };
  commit_message?: string;
  created_at: string;
  environment: string;
};
