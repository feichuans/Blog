export function chatSocketUrl(): string {
  if (typeof location === "undefined") return "ws://localhost:4321/chat";
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/chat`;
}
