import { handle } from "@astrojs/cloudflare/handler";
import { PresenceRoom, routePresence } from "./presence/room";

export { PresenceRoom };

type WorkerEnv = {
  PRESENCE: DurableObjectNamespace<PresenceRoom>;
  ASSETS: Fetcher;
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    if (new URL(request.url).pathname === "/presence") {
      return routePresence(request, env);
    }
    return handle(request, env, ctx);
  },
} satisfies ExportedHandler<WorkerEnv>;
