/** Presence 房间协议。客户端和 Durable Object 共用这份形状。 */

export type PresencePeer = {
  id: string;
  color: string;
  x: number | null;
  y: number | null;
};

export type ClientMessage = {
  type: "cursor";
  x: number;
  y: number;
};

export type ServerMessage =
  | {
      type: "hello";
      self: Pick<PresencePeer, "id" | "color">;
      peers: PresencePeer[];
      count: number;
    }
  | {
      type: "join";
      peer: Pick<PresencePeer, "id" | "color">;
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
      x: number;
      y: number;
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
