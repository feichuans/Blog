import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Ban,
  Grab,
  HandGrab,
  MousePointer2,
  MousePointerClick,
  Move,
  Pointer,
  TextCursor,
  type LucideIcon,
} from "lucide-react";
import { useUiSound } from "@/hooks/use-ui-sound";
import {
  readPresenceOptIn,
  usePresence,
  writePresenceOptIn,
} from "@/hooks/use-presence";
import { docToViewport } from "@/lib/presence/coords";
import {
  isPresenceCursorState,
  type PresenceCursorState,
} from "@/lib/presence/protocol";
import "./PresenceLayer.css";
import "./PresenceCursor.css";

type Props = {
  room: string;
  path: string;
  placement?: "nav" | "fixed";
};

const cursorIcons: Record<PresenceCursorState, LucideIcon> = {
  default: MousePointer2,
  pointer: Pointer,
  text: TextCursor,
  select: TextCursor,
  move: Move,
  grab: Grab,
  grabbing: HandGrab,
  click: MousePointerClick,
  blocked: Ban,
};

export function PresenceLayer({
  room,
  path,
  placement = "fixed",
}: Props) {
  const { play } = useUiSound();
  const [enabled, setEnabled] = useState(false);
  const [navHost, setNavHost] = useState<HTMLElement | null>(null);
  const [tick, setTick] = useState(0);
  const { status, count, peers } = usePresence(room, path, enabled);

  useEffect(() => {
    setEnabled(readPresenceOptIn());
    if (placement === "nav") {
      setNavHost(document.querySelector<HTMLElement>("[data-presence-host]"));
    }
  }, [placement]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const bump = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setTick((n) => n + 1);
      });
    };
    window.addEventListener("lenis-scroll", bump);
    window.addEventListener("scroll", bump, { passive: true });
    window.addEventListener("resize", bump);
    return () => {
      window.removeEventListener("lenis-scroll", bump);
      window.removeEventListener("scroll", bump);
      window.removeEventListener("resize", bump);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);

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
    <div className="presence-layer g-not" data-tick={tick}>
      {placement === "nav" ? navHost && createPortal(toggle, navHost) : toggle}

      {enabled &&
        peers.map((peer) => {
          if (peer.path !== path) return null;
          if (peer.x === null || peer.y === null) return null;
          const point = docToViewport(peer.x, peer.y);
          const hidden =
            point.left < -32 ||
            point.top < -32 ||
            point.left > window.innerWidth + 32 ||
            point.top > window.innerHeight + 32;
          const cursor = isPresenceCursorState(peer.cursor)
            ? peer.cursor
            : "default";
          const CursorIcon = cursorIcons[cursor];
          return (
            <div
              key={peer.id}
              className="presence-cursor"
              data-cursor={cursor}
              data-hidden={hidden ? "true" : "false"}
              style={{
                transform: `translate(${point.left}px, ${point.top}px)`,
                ["--presence-color" as string]: peer.color,
              }}
            >
              <span className="presence-cursor-glyph">
                <CursorIcon aria-hidden="true" />
              </span>
            </div>
          );
        })}
    </div>
  );
}
