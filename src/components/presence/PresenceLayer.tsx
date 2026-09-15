import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useUiSound } from "@/hooks/use-ui-sound";
import {
  readPresenceOptIn,
  usePresence,
  writePresenceOptIn,
} from "@/hooks/use-presence";
import { isPresenceCursorState } from "@/lib/presence/protocol";
import { PresenceCursor } from "./PresenceCursor";
import "./PresenceLayer.css";
import "./PresenceCursor.css";

type Props = {
  room: string;
  path: string;
  placement?: "nav" | "fixed";
};

export function PresenceLayer({
  room,
  path,
  placement = "fixed",
}: Props) {
  const { play } = useUiSound();
  const [enabled, setEnabled] = useState(false);
  const [navHost, setNavHost] = useState<HTMLElement | null>(null);
  // 每个光标自己跑弹簧和重投影，这里只负责渲染列表。
  const { status, count, peers } = usePresence(room, path, enabled);

  useEffect(() => {
    setEnabled(readPresenceOptIn());
    if (placement === "nav") {
      setNavHost(document.querySelector<HTMLElement>("[data-presence-host]"));
    }
  }, [placement]);

  const countLabel = status === "live" ? String(count) : "0";
  const detailLabel =
    status === "live"
      ? "人在场"
      : status === "connecting"
        ? "连接中"
        : status === "error"
          ? "重连中"
          : "开启在场";

  const toggle = (
    <div className="presence-dock g-not" data-placement={placement}>
      <button
        type="button"
        className="presence-toggle g-not"
        data-on={enabled ? "true" : "false"}
        data-status={status}
        aria-pressed={enabled}
        aria-label={
          enabled
            ? `关闭在场，全站 ${countLabel} 人在场`
            : "打开在场，显示同页光标"
        }
        onClick={() => {
          const next = !enabled;
          play(next ? "toggle-on" : "toggle-off");
          writePresenceOptIn(next);
          setEnabled(next);
        }}
      >
        <span className="presence-dot" aria-hidden="true" />
        <span className="presence-count">{countLabel}</span>
        <span className="presence-detail" aria-hidden="true">
          {detailLabel}
        </span>
      </button>
    </div>
  );

  return (
    <div className="presence-layer g-not">
      {placement === "nav" ? navHost && createPortal(toggle, navHost) : toggle}

      {enabled &&
        peers.map((peer) => {
          if (peer.path !== path) return null;
          if (peer.x === null || peer.y === null) return null;
          const cursor = isPresenceCursorState(peer.cursor)
            ? peer.cursor
            : "default";
          return (
            <PresenceCursor
              key={peer.id}
              x={peer.x}
              y={peer.y}
              cursor={cursor}
              color={peer.color}
            />
          );
        })}
    </div>
  );
}
