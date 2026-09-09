import {
  UMAMI_API_CLIENT_ENDPOINT,
  UMAMI_DEBUG,
  UMAMI_API_KEY,
  UMAMI_WEBSITE_ID,
} from "astro:env/server";

type VisitorStats = {
  totalPageviews: number;
  totalSessions: number;
  totalVisitors: number;
};

type UmamiStatsResponse = {
  pageviews?: number;
  visits?: number;
  visitors?: number;
};

// 自建版返回 [{ x }]，Cloud 返回 { visitors }
type UmamiActiveResponse = { visitors?: number } | Array<{ x?: number }>;

type UmamiMetricResponse = Array<{
  x?: string;
  y?: number;
}>;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const DEFAULT_WEBSITE_ID = "e68649b2-93c5-4ee5-abd9-78cca185ebed";
const DEFAULT_API_ENDPOINT = "https://api.umami.is/v1";
const ACTIVE_VISITORS_CACHE_TTL = 15_000;
const VISITOR_STATS_CACHE_TTL = 60_000;

const normalizeApiEndpoint = (value?: string) => {
  const endpoint = value?.trim().replace(/\/+$/, "");
  if (!endpoint) return DEFAULT_API_ENDPOINT;
  if (endpoint === "https://api.umami.is") return DEFAULT_API_ENDPOINT;
  return endpoint;
};

const rawApiEndpoint =
  UMAMI_API_CLIENT_ENDPOINT || process.env.UMAMI_API_CLIENT_ENDPOINT;
const websiteId =
  UMAMI_WEBSITE_ID || process.env.UMAMI_WEBSITE_ID || DEFAULT_WEBSITE_ID;
const debugFlag = UMAMI_DEBUG || process.env.UMAMI_DEBUG;
const apiKey = UMAMI_API_KEY || process.env.UMAMI_API_KEY;
const apiEndpoint = normalizeApiEndpoint(rawApiEndpoint);
const shouldLogUmami = debugFlag === "1" || debugFlag === "true";

let warnedMissingKey = false;
let warnedEndpointRewrite = false;
const umamiCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

const warnMissingKey = () => {
  if (!warnedMissingKey) {
    warnedMissingKey = true;
    console.warn("Umami: missing UMAMI_API_KEY");
  }
};

const logUmami = (message: string, data?: Record<string, unknown>) => {
  if (!shouldLogUmami) return;
  if (data) {
    console.log(`[umami] ${message}`, data);
    return;
  }
  console.log(`[umami] ${message}`);
};

const warnEndpointRewrite = () => {
  if (!warnedEndpointRewrite) {
    warnedEndpointRewrite = true;
    console.warn(
      "Umami: normalized UMAMI_API_CLIENT_ENDPOINT to https://api.umami.is/v1",
    );
  }
};

if (rawApiEndpoint?.trim() === "https://api.umami.is") {
  warnEndpointRewrite();
}

const zeroStats = (): VisitorStats => ({
  totalPageviews: 0,
  totalSessions: 0,
  totalVisitors: 0,
});

const scoreStats = (stats: VisitorStats) =>
  stats.totalVisitors * 1_000_000 +
  stats.totalPageviews * 1_000 +
  stats.totalSessions;

const getCacheEntry = <T>(key: string) =>
  (umamiCache.get(key) as CacheEntry<T> | undefined) ?? null;

const getFreshCachedValue = <T>(key: string) => {
  const entry = getCacheEntry<T>(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) return null;
  return entry.value;
};

const getStaleCachedValue = <T>(key: string) => getCacheEntry<T>(key)?.value ?? null;

const setCachedValue = <T>(key: string, value: T, ttl: number) => {
  umamiCache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
};

const loadWithCache = async <T>(
  key: string,
  ttl: number,
  loader: () => Promise<T | null>,
): Promise<T | null> => {
  const fresh = getFreshCachedValue<T>(key);
  if (fresh !== null) {
    logUmami("cache hit", { key });
    return fresh;
  }

  const existing = inflightRequests.get(key);
  if (existing) {
    logUmami("inflight hit", { key });
    const value = await existing;
    return (value as T | null) ?? getStaleCachedValue<T>(key);
  }

  const request = (async () => {
    logUmami("cache miss", { key, ttl });
    const value = await loader();
    if (value !== null) {
      setCachedValue(key, value, ttl);
      logUmami("cache set", { key, ttl });
    }
    return value;
  })().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, request);

  const value = await request;
  return value ?? getStaleCachedValue<T>(key);
};

const buildApiUrl = (
  pathname: string,
  params?: Record<string, string | number | undefined>,
) => {
  const url = new URL(
    `${apiEndpoint}/${pathname.replace(/^\/+/, "")}`,
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url;
};

const requestUmami = async <T>(
  pathname: string,
  params?: Record<string, string | number | undefined>,
): Promise<T | null> => {
  if (!apiKey) {
    warnMissingKey();
    return null;
  }

  const url = buildApiUrl(pathname, params);
  const startedAt = Date.now();

  logUmami("request start", {
    pathname,
    search: url.search,
  });

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "x-umami-api-key": apiKey,
    },
  });

  logUmami("request end", {
    pathname,
    status: response.status,
    durationMs: Date.now() - startedAt,
  });

  if (!response.ok) {
    console.error("Umami: request failed", response.status, pathname);
    return null;
  }

  return (await response.json()) as T;
};

const normalizePath = (path?: string) => {
  if (!path) return undefined;
  const sanitized = path.split(/[?#]/, 1)[0] || path;
  const normalized = sanitized.startsWith("/") ? sanitized : `/${sanitized}`;
  return normalized.replace(/\/+$/, "");
};

const buildPathCandidates = (path?: string) => {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return [];

  const candidates = [normalizedPath.endsWith("/") ? normalizedPath : `${normalizedPath}/`];

  if (normalizedPath.startsWith("/blogs/")) {
    candidates.push(`/blog/${normalizedPath.slice("/blogs/".length)}/`);
  } else if (normalizedPath.startsWith("/blog/")) {
    candidates.push(`/blogs/${normalizedPath.slice("/blog/".length)}/`);
  }

  return [...new Set(candidates)];
};

const fetchVisitorStats = async (path?: string): Promise<VisitorStats | null> => {
  const cacheKey = `stats:${path || "__all__"}`;
  return loadWithCache(cacheKey, VISITOR_STATS_CACHE_TTL, async () => {
    try {
      const data = await requestUmami<UmamiStatsResponse>(
        `websites/${websiteId}/stats`,
        {
          startAt: 0,
          endAt: Date.now(),
          ...(path
            ? {
                path,
                url: path,
              }
            : {}),
        },
      );

      if (!data) return null;

      return {
        totalPageviews: data.pageviews ?? 0,
        totalSessions: data.visits ?? 0,
        totalVisitors: data.visitors ?? 0,
      };
    } catch (error) {
      console.error("Umami: failed to fetch visitor stats", error);
      return null;
    }
  });
};

const fetchVisitorMetrics = async () => {
  return loadWithCache("metrics:url", VISITOR_STATS_CACHE_TTL, async () => {
    try {
      const data = await requestUmami<UmamiMetricResponse>(
        `websites/${websiteId}/metrics`,
        {
          startAt: 0,
          endAt: Date.now(),
          type: "url",
        },
      );

      if (!data) return null;

      const metrics = new Map<string, number>();

      data.forEach((item) => {
        const normalizedPath = normalizePath(item.x);
        if (!normalizedPath) return;

        const value = item.y ?? 0;
        const current = metrics.get(normalizedPath) ?? 0;
        if (value > current) {
          metrics.set(normalizedPath, value);
        }
      });

      return metrics;
    } catch (error) {
      console.error("Umami: failed to fetch visitor metrics", error);
      return null;
    }
  });
};

export const umami = {
  async getActiveVisitors(): Promise<number> {
    const value = await loadWithCache("active", ACTIVE_VISITORS_CACHE_TTL, async () => {
      try {
        const data = await requestUmami<UmamiActiveResponse>(
          `websites/${websiteId}/active`,
        );
        if (!data) return null;
        if (Array.isArray(data)) return data[0]?.x ?? 0;

        return data.visitors ?? 0;
      } catch (error) {
        console.error("Umami: failed to fetch active visitors", error);
        return null;
      }
    });

    return value ?? 0;
  },

  async getVisitors(path?: string): Promise<VisitorStats> {
    const candidates = buildPathCandidates(path);
    if (!candidates.length) return (await fetchVisitorStats()) ?? zeroStats();

    let best: VisitorStats | null = null;

    for (const candidate of candidates) {
      const stats = await fetchVisitorStats(candidate);
      if (!stats) continue;

      if (!best || scoreStats(stats) > scoreStats(best)) {
        best = stats;
      }
    }

    return best ?? zeroStats();
  },

  async getVisitorsBatch(paths: string[]) {
    const metrics = await fetchVisitorMetrics();
    // Umami Cloud 限速 50 次 / 15 秒，metrics 失败时不要再逐篇回退请求
    if (!metrics) {
      return paths.map((path) => ({ path, ...zeroStats() }));
    }

    return paths.map((path) => {
      const candidates = buildPathCandidates(path);
      // metrics?type=url 的 y 是 pageviews，不是 visitors
      const totalPageviews = candidates.reduce((best, candidate) => {
        const normalizedCandidate = normalizePath(candidate);
        if (!normalizedCandidate) return best;
        return Math.max(best, metrics.get(normalizedCandidate) ?? 0);
      }, 0);

      return {
        path,
        totalPageviews,
        totalSessions: 0,
        totalVisitors: 0,
      };
    });
  },
};
