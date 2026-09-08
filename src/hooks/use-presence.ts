import { useEffect, useRef, useState } from "react";
import {
  pointerToDoc,
  prefersFinePointer,
} from "@/lib/presence/coords";
import {
  isServerMessage,
  type PresenceCursorState,
  type PresencePeer,
} from "@/lib/presence/protocol";
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

function hasSelectableTextAt(e: PointerEvent, target: HTMLElement): boolean {
  if (getComputedStyle(target).userSelect === "none") return false;

  const caret = document.caretPositionFromPoint?.(e.clientX, e.clientY);
  if (caret?.offsetNode.nodeType === Node.TEXT_NODE) return true;

  const legacyRange = document.caretRangeFromPoint?.(e.clientX, e.clientY);
  return legacyRange?.startContainer.nodeType === Node.TEXT_NODE;
}

function cursorStateAt(e: PointerEvent): PresenceCursorState {
  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (!(target instanceof HTMLElement)) {
    return e.buttons ? "click" : "default";
  }

  const cssCursor = getComputedStyle(target).cursor;
  const isText =
    /text|vertical-text/.test(cssCursor) ||
    Boolean(target.closest("input, textarea, [contenteditable='true']")) ||
    hasSelectableTextAt(e, target);
  const isAction = /pointer/.test(cssCursor) ||
    Boolean(target.closest("a[href], button, summary, label, select"));

  if (target.matches(":disabled") || /not-allowed|no-drop/.test(cssCursor)) {
    return "blocked";
  }
  if (/grabbing/.test(cssCursor)) return "grabbing";
  if (/grab/.test(cssCursor)) return e.buttons ? "grabbing" : "grab";
  if (/move|all-scroll|crosshair|resize/.test(cssCursor)) return "move";
  if (isAction) return e.buttons ? "click" : "pointer";
  if (isText) return e.buttons ? "select" : "text";
  return e.buttons ? "click" : "default";
}

export function usePresence(room: string, path: string, enabled: boolean) {
  const [status, setStatus] = useState<PresenceStatus>("off");
  const [count, setCount] = useState(0);
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const selfIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !room || !path) {
      wsRef.current?.close();
      wsRef.current = null;
      selfIdRef.current = null;
      setStatus("off");
      setCount(0);
      setPeers([]);
      return;
    }

    let cancelled = false;
    let retryTimer = 0;
    let pingTimer = 0;
    let attempt = 0;

    const applyHello = (peersIn: PresencePeer[], selfId: string) => {
      setPeers(
        peersIn
          .filter((peer) => peer.id !== selfId)
          .map((peer) => ({ ...peer, cursor: peer.cursor ?? "default" })),
      );
    };

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      const socket = new WebSocket(presenceSocketUrl(room, path));
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
              {
                id: payload.peer.id,
                color: payload.peer.color,
                path: payload.peer.path,
                x: null,
                y: null,
                cursor: "default",
              },
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
              ? {
                  ...peer,
                  path: payload.path,
                  x: payload.x,
                  y: payload.y,
                  cursor: payload.cursor,
                }
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
  }, [enabled, room, path]);

  useEffect(() => {
    if (!enabled || !prefersFinePointer()) return;

    let last = 0;
    const send = (e: PointerEvent, force = false) => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const now = performance.now();
      if (!force && now - last < CURSOR_MS) return;
      last = now;
      const point = pointerToDoc(e);
      socket.send(
        JSON.stringify({
          type: "cursor",
          x: point.x,
          y: point.y,
          cursor: cursorStateAt(e),
        }),
      );
    };
    const sendImmediately = (e: PointerEvent) => send(e, true);

    window.addEventListener("pointermove", send, { passive: true });
    window.addEventListener("pointerdown", sendImmediately, { passive: true });
    window.addEventListener("pointerup", sendImmediately, { passive: true });
    window.addEventListener("pointercancel", sendImmediately, { passive: true });
    return () => {
      window.removeEventListener("pointermove", send);
      window.removeEventListener("pointerdown", sendImmediately);
      window.removeEventListener("pointerup", sendImmediately);
      window.removeEventListener("pointercancel", sendImmediately);
    };
  }, [enabled]);

  return { status, count, peers };
}
