import { useCallback, useEffect, useRef, useState } from "react";

import { WebSocketMessage } from "../types";

interface UseWebSocketOptions {
  onReload?: () => void;
  onConnect?: () => void;
  onError?: (message: string) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
}

export function useWebSocket(
  options: UseWebSocketOptions = {},
): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { onReload, onConnect, onError } = options;

  const connect = useCallback(() => {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      console.log("[websocket] Connected");
      setIsConnected(true);
      onConnect?.();
    });

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);

        switch (message.type) {
          case "reload":
            console.log("[websocket] Reload requested");
            onReload?.();
            break;
          case "connected":
            console.log("[websocket] Server confirmed connection");
            break;
          case "error":
            console.error("[websocket] Server error:", message.message);
            onError?.(message.message || "Unknown error");
            break;
        }
      } catch (error) {
        console.error("[websocket] Failed to parse message:", error);
      }
    };

    ws.addEventListener("close", () => {
      console.log("[websocket] Disconnected");
      setIsConnected(false);

      // Attempt to reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[websocket] Attempting to reconnect...");
        connect();
      }, 2000);
    });

    ws.addEventListener("error", (error) => {
      console.error("[websocket] Error:", error);
    });
  }, [onReload, onConnect, onError]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastMessage };
}
