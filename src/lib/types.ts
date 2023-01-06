// Error response (non-2xx) from the Management API.
export class APIError extends Error {}

// Generic error describing where and what in the data is wrong.
export type DataError = {
  path?: string;
  name: string;
  message: string;
};
