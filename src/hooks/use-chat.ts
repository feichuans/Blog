import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_RATE_LIMIT_MS,
  isChatServerMessage,
  type ChatMessage,
} from "@/lib/chat/protocol";
import { chatSocketUrl } from "@/lib/chat/url";

export type ChatStatus = "off" | "connecting" | "live" | "error";

const PING_MS = 25_000;

export function useChat(enabled: boolean) {
  const [status, setStatus] = useState<ChatStatus>("off");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const lastSentAtRef = useRef(0);
  const acceptedCallbacksRef = useRef(new Map<string, () => void>());

  useEffect(() => {
    if (!enabled) {
      socketRef.current?.close();
      socketRef.current = null;
      setStatus("off");
      setError("");
      acceptedCallbacksRef.current.clear();
      return;
    }

    let cancelled = false;
    let retryTimer = 0;
    let pingTimer = 0;
    let attempt = 0;

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      const socket = new WebSocket(chatSocketUrl());
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (cancelled) return;
        attempt = 0;
        setStatus("live");
        setError("");
        window.clearInterval(pingTimer);
        pingTimer = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send("ping");
        }, PING_MS);
      });

      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string" || event.data === "pong") return;
        let payload: unknown;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!isChatServerMessage(payload)) return;

        if (payload.type === "hello") {
          setMessages(payload.messages);
          return;
        }
        if (payload.type === "message") {
          setMessages((previous) => [...previous, payload.message].slice(-50));
          setError("");
          return;
        }
        if (payload.type === "sent") {
          acceptedCallbacksRef.current.get(payload.requestId)?.();
          acceptedCallbacksRef.current.delete(payload.requestId);
          return;
        }
        if (payload.requestId) {
          acceptedCallbacksRef.current.delete(payload.requestId);
        }
        setError(payload.message);
      });

      socket.addEventListener("close", () => {
        window.clearInterval(pingTimer);
        if (cancelled || socketRef.current !== socket) return;
        setStatus("error");
        setError("连接中断，正在重连");
        const delay = Math.min(8_000, 600 * 2 ** attempt);
        attempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      });

      socket.addEventListener("error", () => socket.close());
    };

    connect();
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      socketRef.current?.close();
      socketRef.current = null;
      acceptedCallbacksRef.current.clear();
    };
  }, [enabled]);

  const sendMessage = useCallback((
    name: string,
    text: string,
    onAccepted: () => void,
  ): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("连接尚未就绪");
      return false;
    }
    const retryAfterMs = CHAT_RATE_LIMIT_MS - (Date.now() - lastSentAtRef.current);
    if (retryAfterMs > 0) {
      setError(`请等待 ${Math.ceil(retryAfterMs / 1000)} 秒后再发送`);
      return false;
    }
    const requestId = crypto.randomUUID();
    lastSentAtRef.current = Date.now();
    acceptedCallbacksRef.current.set(requestId, onAccepted);
    setError("");
    socket.send(JSON.stringify({ type: "message", requestId, name, text }));
    return true;
  }, []);

  return { status, messages, error, sendMessage };
}
