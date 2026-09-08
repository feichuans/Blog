import { DurableObject } from "cloudflare:workers";
import {
  PRESENCE_COLORS,
  type PresencePeer,
  type ServerMessage,
} from "../lib/presence/protocol";

export type PresenceEnv = {
  PRESENCE: DurableObjectNamespace<PresenceRoom>;
};

type Session = {
  id: string;
  color: string;
  x: number | null;
  y: number | null;
};

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

function clamp01(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n));
}

export function isRoomId(room: string): boolean {
  return room.length > 0 && room.length <= 512 && !room.includes("\0");
}

export function routePresence(
  request: Request,
  env: PresenceEnv,
): Promise<Response> {
  const room = new URL(request.url).searchParams.get("room") ?? "";
  if (!isRoomId(room)) {
    return Promise.resolve(new Response("Bad room", { status: 400 }));
  }
  const id = env.PRESENCE.idFromName(room);
  return env.PRESENCE.get(id).fetch(request);
}

export class PresenceRoom extends DurableObject<PresenceEnv> {
  constructor(ctx: DurableObjectState, env: PresenceEnv) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return Response.json({ count: this.ctx.getWebSockets().length });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const id = crypto.randomUUID();
    const color = colorFor(id);
    const session: Session = { id, color, x: null, y: null };
    server.serializeAttachment(session);

    const count = this.ctx.getWebSockets().length;
    this.send(server, {
      type: "hello",
      self: { id, color },
      peers: this.listPeers(server),
      count,
    });
    this.broadcast({ type: "join", peer: { id, color }, count }, server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message === "ping") return;

    let data: unknown;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    if (!data || typeof data !== "object") return;

    const msg = data as { type?: string; x?: number; y?: number };
    if (msg.type !== "cursor") return;

    const x = clamp01(msg.x);
    const y = clamp01(msg.y);
    if (x === null || y === null) return;

    const session = (ws.deserializeAttachment() ?? {}) as Session;
    if (!session.id) return;
    session.x = x;
    session.y = y;
    ws.serializeAttachment(session);
    this.broadcast({ type: "cursor", id: session.id, x, y }, ws);
  }

  async webSocketClose(ws: WebSocket) {
    this.depart(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.depart(ws);
  }

  private depart(ws: WebSocket) {
    const session = ws.deserializeAttachment() as Session | undefined;
    try {
      ws.close(1000, "bye");
    } catch {}
    const remaining = this.ctx.getWebSockets().filter((socket) => socket !== ws)
      .length;
    if (session?.id) {
      this.broadcast({ type: "leave", id: session.id, count: remaining });
    }
  }

  private listPeers(except: WebSocket): PresencePeer[] {
    const peers: PresencePeer[] = [];
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) continue;
      const session = socket.deserializeAttachment() as Session | undefined;
      if (!session?.id) continue;
      peers.push({
        id: session.id,
        color: session.color,
        x: session.x,
        y: session.y,
      });
    }
    return peers;
  }

  private send(ws: WebSocket, payload: ServerMessage) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {}
  }

  private broadcast(payload: ServerMessage, except?: WebSocket) {
    const raw = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) continue;
      try {
        socket.send(raw);
      } catch {}
    }
  }
}
