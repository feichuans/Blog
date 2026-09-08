export const CHAT_NAME_MAX = 24;
export const CHAT_MESSAGE_MAX = 200;
export const CHAT_HISTORY_MAX = 50;
export const CHAT_RATE_LIMIT_MS = 10_000;

export type ChatMessage = {
  id: string;
  name: string;
  text: string;
  createdAt: number;
};

export type ChatClientMessage = {
  type: "message";
  requestId: string;
  name: string;
  text: string;
};

export type ChatServerMessage =
  | {
      type: "hello";
      messages: ChatMessage[];
    }
  | {
      type: "message";
      message: ChatMessage;
    }
  | {
      type: "sent";
      requestId: string;
    }
  | {
      type: "error";
      code: "INVALID_MESSAGE" | "RATE_LIMITED";
      message: string;
      requestId?: string;
      retryAfterMs?: number;
    };

export function isChatServerMessage(value: unknown): value is ChatServerMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "hello" ||
    type === "message" ||
    type === "sent" ||
    type === "error"
  );
}

export function normalizeChatField(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}
