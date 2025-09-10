import open from "open";

/**
 * Browser utilities
 */
export const browser = {
  /**
   * Opens a URL in the default browser
   * @param url The URL to open
   */
  async openUrl(url: string): Promise<void> {
    await open(url);
  },
};
