import * as chokidar from "chokidar";
import { WebSocket, WebSocketServer } from "ws";

import { WorkflowDirContext } from "@/lib/run-context";

import { WebSocketMessage } from "./types";

/**
 * Debounce helper function
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * File watcher that monitors workflow directory for changes
 * and notifies connected WebSocket clients
 */
export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private wss: WebSocketServer;
  private workflowDirCtx: WorkflowDirContext;
  private debounceMs: number;

  constructor(
    wss: WebSocketServer,
    workflowDirCtx: WorkflowDirContext,
    debounceMs = 300,
  ) {
    this.wss = wss;
    this.workflowDirCtx = workflowDirCtx;
    this.debounceMs = debounceMs;
  }

  /**
   * Start watching the workflow directory for changes
   */
  start(): void {
    const debouncedNotify = debounce(() => {
      this.notifyClients({ type: "reload" });
    }, this.debounceMs);

    this.watcher = chokidar.watch(this.workflowDirCtx.abspath, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on("change", (path) => {
        console.log(`[watcher] File changed: ${path}`);
        debouncedNotify();
      })
      .on("add", (path) => {
        console.log(`[watcher] File added: ${path}`);
        debouncedNotify();
      })
      .on("unlink", (path) => {
        console.log(`[watcher] File deleted: ${path}`);
        debouncedNotify();
      });

    console.log(`[watcher] Watching ${this.workflowDirCtx.abspath}`);
  }

  /**
   * Stop watching for changes
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Notify all connected WebSocket clients
   */
  private notifyClients(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  }
}

/**
 * Set up WebSocket server for live reload
 */
export function setupWebSocket(wss: WebSocketServer): void {
  wss.on("connection", (ws) => {
    console.log("[websocket] Client connected");

    // Send connected message
    ws.send(JSON.stringify({ type: "connected" }));

    ws.on("close", () => {
      console.log("[websocket] Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("[websocket] Error:", error);
    });
  });
}
