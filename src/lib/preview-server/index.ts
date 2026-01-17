import * as http from "node:http";
import * as path from "node:path";

import express from "express";
import { WebSocketServer } from "ws";

import { createApiRouter } from "./api";
import { PreviewServerConfig } from "./types";
import { FileWatcher, setupWebSocket } from "./watcher";

/**
 * Create and start the preview server
 */
export async function createPreviewServer(
  config: PreviewServerConfig,
): Promise<http.Server> {
  const app = express();

  // Middleware
  app.use(express.json());

  // API routes
  app.use("/api", createApiRouter(config));

  // Serve static files for the preview client
  const clientDistPath = path.resolve(__dirname, "../../preview-client");
  app.use(express.static(clientDistPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });

  // Create HTTP server
  const server = http.createServer(app);

  // Set up WebSocket server for live reload
  const wss = new WebSocketServer({ server, path: "/ws" });
  setupWebSocket(wss);

  // Set up file watcher
  const fileWatcher = new FileWatcher(wss, config.workflowDirCtx);
  fileWatcher.start();

  // Clean up on server close
  const originalClose = server.close.bind(server);
  server.close = (callback?: (err?: Error) => void) => {
    fileWatcher.stop().catch(console.error);
    wss.close();
    return originalClose(callback);
  };

  // Start server
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(config.port, () => {
      resolve(server);
    });
  });
}

export * from "./types";
