import { useEffect, useRef, useState } from "react";
import {
  pointerToDoc,
  prefersFinePointer,
} from "@/lib/presence/coords";
import { isServerMessage, type PresencePeer } from "@/lib/presence/protocol";
import { presenceSocketUrl } from "@/lib/presence/url";

export type PresenceStatus = "off" | "connecting" | "live" | "error";

export const PRESENCE_OPT_IN_KEY = "fc-presence-opt-in";

export function readPresenceOptIn(): boolean {
  try {
    return localStorage.getItem(PRESENCE_OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function writePresenceOptIn(on: boolean) {
  try {
    localStorage.setItem(PRESENCE_OPT_IN_KEY, on ? "1" : "0");
  } catch {}
}

const CURSOR_MS = 70;
const PING_MS = 25_000;

export function usePresence(room: string, enabled: boolean) {
  const [status, setStatus] = useState<PresenceStatus>("off");
  const [count, setCount] = useState(0);
  const [selfColor, setSelfColor] = useState<string | null>(null);
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const selfIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !room) {
      wsRef.current?.close();
      wsRef.current = null;
      selfIdRef.current = null;
      setStatus("off");
      setCount(0);
      setSelfColor(null);
      setPeers([]);
      return;
    }

    let cancelled = false;
    let retryTimer = 0;
    let pingTimer = 0;
    let attempt = 0;

    const applyHello = (peersIn: PresencePeer[], selfId: string) => {
      setPeers(peersIn.filter((peer) => peer.id !== selfId));
    };

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      const socket = new WebSocket(presenceSocketUrl(room));
      wsRef.current = socket;

      socket.addEventListener("open", () => {
        if (cancelled) return;
        attempt = 0;
        setStatus("live");
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
        if (!isServerMessage(payload)) return;

        if (payload.type === "hello") {
          selfIdRef.current = payload.self.id;
          setSelfColor(payload.self.color);
          setCount(payload.count);
          applyHello(payload.peers, payload.self.id);
          return;
        }
        if (payload.type === "join") {
          setCount(payload.count);
          setPeers((prev) => {
            if (prev.some((peer) => peer.id === payload.peer.id)) return prev;
            return [
              ...prev,
              { id: payload.peer.id, color: payload.peer.color, x: null, y: null },
            ];
          });
          return;
        }
        if (payload.type === "leave") {
          setCount(payload.count);
          setPeers((prev) => prev.filter((peer) => peer.id !== payload.id));
          return;
        }
        setPeers((prev) =>
          prev.map((peer) =>
            peer.id === payload.id
              ? { ...peer, x: payload.x, y: payload.y }
              : peer,
          ),
        );
      });

      socket.addEventListener("close", () => {
        window.clearInterval(pingTimer);
        if (cancelled || wsRef.current !== socket) return;
        setStatus("error");
        const delay = Math.min(8_000, 600 * 2 ** attempt);
        attempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      });

      socket.addEventListener("error", () => {
        socket.close();
      });
    };

    connect();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, room]);

  useEffect(() => {
    if (!enabled || !prefersFinePointer()) return;

    let last = 0;
    const send = (e: PointerEvent) => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const now = performance.now();
      if (now - last < CURSOR_MS) return;
      last = now;
      const point = pointerToDoc(e);
      socket.send(JSON.stringify({ type: "cursor", x: point.x, y: point.y }));
    };

    window.addEventListener("pointermove", send, { passive: true });
    return () => window.removeEventListener("pointermove", send);
  }, [enabled]);

  return { status, count, selfColor, peers };
}
