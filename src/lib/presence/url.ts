/** 全站共用一个 Durable Object 房间，人数是合计。 */
export const PRESENCE_SITE_ROOM = "site";

/** 规范化 pathname，用于「同页才画光标」。 */
export function presencePathFromLocation(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

/** @deprecated 旧按页分房 API；保留给文档页展示当前 path。 */
export function presenceRoomFromPath(pathname: string): string {
  return presencePathFromLocation(pathname);
}

/** 未单独配置时走同域 `/presence`，Astro 7 的自定义 Worker 会转给 Durable Object。 */
export function presenceSocketUrl(room: string, path: string): string {
  const url = new URL("/presence", presenceOrigin());
  url.searchParams.set("room", room);
  url.searchParams.set("path", path);
  return url.toString();
}

function presenceOrigin(): string {
  const explicit = import.meta.env.PUBLIC_PRESENCE_URL;
  if (typeof explicit === "string" && explicit.length > 0) {
    return toWsOrigin(explicit);
  }
  if (typeof location === "undefined") return "ws://localhost:4321";
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
}

function toWsOrigin(value: string): string {
  return value.replace(/\/$/, "").replace(/^http/, "ws");
}
