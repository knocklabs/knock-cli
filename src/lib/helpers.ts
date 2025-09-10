import open from "open";

/**
 * Browser utilities
 */
export const browser = {
  /**
   * Opens a URL in the default browser
   * @param url The URL to open
   * @returns A promise that resolves when the URL is opened
   */
  async openUrl(url: string): Promise<void> {
    await open(url);
  },
};
