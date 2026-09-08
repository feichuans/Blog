import { DurableObject } from "cloudflare:workers";
import {
  CHAT_HISTORY_MAX,
  CHAT_MESSAGE_MAX,
  CHAT_NAME_MAX,
  CHAT_RATE_LIMIT_MS,
  normalizeChatField,
  type ChatMessage,
  type ChatServerMessage,
} from "../lib/chat/protocol";

export type ChatEnv = {
  CHAT: DurableObjectNamespace<ChatRoom>;
};

type ChatSession = {
  lastMessageAt: number;
};

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function routeChat(request: Request, env: ChatEnv): Promise<Response> {
  const id = env.CHAT.idFromName("site-chat");
  return env.CHAT.get(id).fetch(request);
}

export class ChatRoom extends DurableObject<ChatEnv> {
  private messages: ChatMessage[] = [];

  constructor(ctx: DurableObjectState, env: ChatEnv) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return Response.json({ available: true });
    }
    if (!isAllowedOrigin(request)) {
      return new Response("Forbidden origin", { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ lastMessageAt: 0 } satisfies ChatSession);
    this.send(server, { type: "hello", messages: this.messages });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string" || raw === "ping") return;

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      this.invalid(ws);
      return;
    }
    if (!value || typeof value !== "object") {
      this.invalid(ws);
      return;
    }

    const payload = value as {
      type?: unknown;
      requestId?: unknown;
      name?: unknown;
      text?: unknown;
    };
    const requestId = normalizeChatField(payload.requestId, 64);
    if (payload.type !== "message" || !requestId) {
      this.invalid(ws, requestId || undefined);
      return;
    }

    const name = normalizeChatField(payload.name, CHAT_NAME_MAX);
    const text = normalizeChatField(payload.text, CHAT_MESSAGE_MAX);
    if (!name || !text) {
      this.invalid(ws, requestId);
      return;
    }

    const now = Date.now();
    const session = (ws.deserializeAttachment() ?? {
      lastMessageAt: 0,
    }) as ChatSession;
    const retryAfterMs = CHAT_RATE_LIMIT_MS - (now - session.lastMessageAt);
    if (retryAfterMs > 0) {
      this.send(ws, {
        type: "error",
        code: "RATE_LIMITED",
        message: "发送得太快，请稍后再试",
        requestId,
        retryAfterMs,
      });
      return;
    }

    session.lastMessageAt = now;
    ws.serializeAttachment(session);

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      name,
      text,
      createdAt: now,
    };
    this.messages = [...this.messages, message].slice(-CHAT_HISTORY_MAX);
    this.send(ws, { type: "sent", requestId });
    this.broadcast({ type: "message", message });
  }

  private invalid(ws: WebSocket, requestId?: string) {
    this.send(ws, {
      type: "error",
      code: "INVALID_MESSAGE",
      message: "昵称和留言不能为空",
      requestId,
    });
  }

  private send(ws: WebSocket, payload: ChatServerMessage) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {}
  }

  private broadcast(payload: ChatServerMessage) {
    const raw = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(raw);
      } catch {}
    }
  }
}
