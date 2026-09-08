import { useEffect, useState, type CSSProperties } from "react";
import { useUiSound } from "@/hooks/use-ui-sound";
import {
  readPresenceOptIn,
  usePresence,
  writePresenceOptIn,
} from "@/hooks/use-presence";
import { docToViewport } from "@/lib/presence/coords";
import "./PresenceLayer.css";

type Props = {
  room: string;
};

export function PresenceLayer({ room }: Props) {
  const { play } = useUiSound();
  const [enabled, setEnabled] = useState(false);
  const [tick, setTick] = useState(0);
  const { status, count, selfColor, peers } = usePresence(room, enabled);

  useEffect(() => {
    setEnabled(readPresenceOptIn());
  }, []);

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

  const label =
    status === "live"
      ? `${count} 人在场`
      : status === "connecting"
        ? "连接中…"
        : status === "error"
          ? "重连中"
          : "在场";

  return (
    <div className="presence-layer g-not" data-tick={tick}>
      <div className="presence-dock g-not">
        <button
          type="button"
          className="presence-toggle g-not"
          data-on={enabled ? "true" : "false"}
          aria-pressed={enabled}
          aria-label={enabled ? `关闭在场，${label}` : "打开在场，显示同页光标"}
          title={
            enabled
              ? "关闭后不再出现在别人的屏幕上"
              : "打开后，同页打开开关的人能看见彼此光标"
          }
          style={
            selfColor
              ? ({ "--presence-self": selfColor } as CSSProperties)
              : undefined
          }
          onClick={() => {
            const next = !enabled;
            play(next ? "toggle-on" : "toggle-off");
            writePresenceOptIn(next);
            setEnabled(next);
          }}
        >
          <span className="presence-dot" aria-hidden="true" />
          <span>{label}</span>
        </button>
      </div>

      {enabled &&
        peers.map((peer) => {
          if (peer.x === null || peer.y === null) return null;
          const point = docToViewport(peer.x, peer.y);
          const hidden =
            point.left < -32 ||
            point.top < -32 ||
            point.left > window.innerWidth + 32 ||
            point.top > window.innerHeight + 32;
          return (
            <div
              key={peer.id}
              className="presence-cursor"
              data-hidden={hidden ? "true" : "false"}
              style={{
                transform: `translate(${point.left}px, ${point.top}px)`,
                ["--presence-color" as string]: peer.color,
              }}
            />
          );
        })}
    </div>
  );
}
