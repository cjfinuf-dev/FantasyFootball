import { useCallback, useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function useWebSocket(path: string) {
  const ws = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await SecureStore.getItemAsync("access_token");
      const socket = new WebSocket(`${WS_URL}${path}?token=${token}`);

      socket.onopen = () => {
        if (!cancelled) setConnected(true);
      };
      socket.onmessage = (e) => {
        if (!cancelled) setLastMessage(JSON.parse(e.data));
      };
      socket.onclose = () => {
        if (!cancelled) setConnected(false);
      };

      ws.current = socket;
    })();

    return () => {
      cancelled = true;
      ws.current?.close();
    };
  }, [path]);

  const send = useCallback((data: any) => {
    ws.current?.send(JSON.stringify(data));
  }, []);

  return { lastMessage, connected, send };
}
