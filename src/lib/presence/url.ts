export function presenceRoomFromPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

/** 未单独配置时走同域 `/presence`，Astro 7 的自定义 Worker 会转给 Durable Object。 */
export function presenceSocketUrl(room: string): string {
  const url = new URL("/presence", presenceOrigin());
  url.searchParams.set("room", room);
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
