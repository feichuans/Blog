import { handle } from "@astrojs/cloudflare/handler";
import { ChatRoom, routeChat } from "./chat/room";
import { PresenceRoom, routePresence } from "./presence/room";

export { ChatRoom, PresenceRoom };

type WorkerEnv = {
  CHAT: DurableObjectNamespace<ChatRoom>;
  PRESENCE: DurableObjectNamespace<PresenceRoom>;
  ASSETS: Fetcher;
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/presence") return routePresence(request, env);
    if (pathname === "/chat") return routeChat(request, env);
    return handle(request, env, ctx);
  },
} satisfies ExportedHandler<WorkerEnv>;
