import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { umami } from "./umami";

const ALLOWED_ACTION_ORIGINS = new Set([
  "https://feichuans.com",
  "http://localhost:4321",
  "http://localhost:5173",
]);

const getRequestOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const assertAllowedOrigin = (request: Request) => {
  const requestOrigin = getRequestOrigin(request);

  if (!requestOrigin || !ALLOWED_ACTION_ORIGINS.has(requestOrigin)) {
    throw new Error("Forbidden");
  }
};

export const server = {
  getActiveVisitors: defineAction({
    async handler(_, context): Promise<number> {
      assertAllowedOrigin(context.request);
      return umami.getActiveVisitors();
    },
  }),
  getVisitorsBatch: defineAction({
    input: z.array(z.string()).max(50),
    async handler(paths, context): Promise<
      Array<{
        path: string;
        totalPageviews: number;
        totalSessions: number;
        totalVisitors: number;
      }>
    > {
      assertAllowedOrigin(context.request);
      return umami.getVisitorsBatch(paths);
    },
  }),
  getVisitors: defineAction({
    input: z.string().optional(),
    async handler(path, context): Promise<{
      totalPageviews: number;
      totalSessions: number;
      totalVisitors: number;
    }> {
      assertAllowedOrigin(context.request);
      return umami.getVisitors(path);
    },
  }),
};
