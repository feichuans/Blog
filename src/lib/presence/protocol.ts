/** Presence 房间协议。客户端和 Durable Object 共用这份形状。 */

export const PRESENCE_CURSOR_STATES = [
  "default",
  "pointer",
  "text",
  "select",
  "move",
  "grab",
  "grabbing",
  "click",
  "blocked",
] as const;

export type PresenceCursorState = (typeof PRESENCE_CURSOR_STATES)[number];

export function isPresenceCursorState(
  value: unknown,
): value is PresenceCursorState {
  return PRESENCE_CURSOR_STATES.includes(value as PresenceCursorState);
}

export type PresencePeer = {
  id: string;
  color: string;
  /** 规范化后的 pathname；光标只在同 path 渲染，人数是全站合计。 */
  path: string;
  x: number | null;
  y: number | null;
  cursor: PresenceCursorState;
};

export type ClientMessage = {
  type: "cursor";
  x: number;
  y: number;
  cursor: PresenceCursorState;
};

export type ServerMessage =
  | {
      type: "hello";
      self: Pick<PresencePeer, "id" | "color" | "path">;
      peers: PresencePeer[];
      count: number;
    }
  | {
      type: "join";
      peer: Pick<PresencePeer, "id" | "color" | "path">;
      count: number;
    }
  | {
      type: "leave";
      id: string;
      count: number;
    }
  | {
      type: "cursor";
      id: string;
      path: string;
      x: number;
      y: number;
      cursor: PresenceCursorState;
    };

export function isServerMessage(value: unknown): value is ServerMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "hello" ||
    type === "join" ||
    type === "leave" ||
    type === "cursor"
  );
}

export const PRESENCE_COLORS = [
  "#DA702C",
  "#4385BE",
  "#879A39",
  "#8B7EC8",
  "#C03E53",
  "#3AA99F",
] as const;
