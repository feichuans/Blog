import { useEffect, useRef, useState } from "react";
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
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { docToViewport } from "@/lib/presence/coords";
import type { PresenceCursorState } from "@/lib/presence/protocol";

type Props = {
  /** 文档相对坐标（0–1），和发送端同一套换算。 */
  x: number;
  y: number;
  color: string;
  cursor: PresenceCursorState;
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

/**
 * 临界阻尼弹簧（damping = 2√(k·m) = 2√420 ≈ 41）：插入两次更新之间的空档，
 * 但不过冲。远端每 70ms 才推一个点，补间只需要在这 70ms 内走完大部分路程，
 * 剩下的尾巴留到下一个点，看起来就是连续运动。跟踪一条匀速直线时稳态滞后
 * 约 2v/ω，快速甩动也在 1px 量级，所以不会「飘」。
 */
const CURSOR_SPRING = {
  stiffness: 420,
  damping: 42,
  mass: 1,
  restDelta: 0.05,
  restSpeed: 0.05,
};

/** 帧间隔超过这么久说明 rAF 被挂起了（切标签页、系统睡眠），回来时直接落位。 */
const FRAME_GAP_MS = 500;

/** 目标移动超过这么多像素才重设，静止时一帧也不动弹簧。 */
const REPROJECT_EPSILON = 0.5;

/** 离视口这么远才算离屏（光标本体只有 1.5rem，48px 足够完全看不见）。 */
const HIDDEN_MARGIN = 48;

function isOffscreen(left: number, top: number): boolean {
  return (
    left < -HIDDEN_MARGIN ||
    top < -HIDDEN_MARGIN ||
    left > window.innerWidth + HIDDEN_MARGIN ||
    top > window.innerHeight + HIDDEN_MARGIN
  );
}

export function PresenceCursor({ x, y, color, cursor }: Props) {
  const reduced = useReducedMotion();
  // 首帧就对：外观在视口外时先量一次，不能从 (0,0) 滑进来。
  const [start] = useState(() => docToViewport(x, y));
  const sourceX = useMotionValue(start.left);
  const sourceY = useMotionValue(start.top);
  const left = useSpring(sourceX, CURSOR_SPRING);
  const top = useSpring(sourceY, CURSOR_SPRING);
  const [hidden, setHidden] = useState(() => isOffscreen(start.left, start.top));

  const docRef = useRef({ x, y });
  const lastTargetRef = useRef(start);
  const lastFrameAtRef = useRef(0);
  const hiddenRef = useRef(hidden);
  // 刚挂载的第一帧不补间：外观可能是在一个已经滚过的视口里被创建的。
  const settledRef = useRef(false);

  /** 把两个 MotionValue 直接按到目标上：没有补间，用于断档和减少动效。 */
  const snap = (point: { left: number; top: number }) => {
    sourceX.jump(point.left);
    sourceY.jump(point.top);
    left.jump(point.left);
    top.jump(point.top);
  };

  // 收到新点时，把文档坐标换算成当前视口坐标再喂给弹簧。发送端每 70ms 推一次，
  // 弹簧负责把中间的空档补成连续运动；暂停后重新移动也照补，不跳。
  useEffect(() => {
    docRef.current = { x, y };
    const point = docToViewport(x, y);
    lastTargetRef.current = point;
    if (reduced) {
      snap(point);
      return;
    }
    sourceX.set(point.left);
    sourceY.set(point.top);
  }, [x, y, reduced, sourceX, sourceY, left, top]);

  // 视口自己在动（滚动、resize）时，目标要跟着重算，否则光标会漂在错的字上。
  useAnimationFrame((t) => {
    const prevFrameAt = lastFrameAtRef.current;
    lastFrameAtRef.current = t;
    // rAF 被挂起过（标签页切回、合盖唤醒）：此刻弹簧已经落后很多，只能落位。
    const stalled = prevFrameAt > 0 && t - prevFrameAt > FRAME_GAP_MS;

    const point = docToViewport(docRef.current.x, docRef.current.y);
    const last = lastTargetRef.current;
    const moved =
      Math.abs(point.left - last.left) > REPROJECT_EPSILON ||
      Math.abs(point.top - last.top) > REPROJECT_EPSILON;
    const snapped =
      stalled || reduced || hiddenRef.current || !settledRef.current;

    if (moved) {
      lastTargetRef.current = point;
      // 视口外没人看，直接贴上，省掉不被看见的补间。
      if (snapped) {
        snap(point);
      } else {
        sourceX.set(point.left);
        sourceY.set(point.top);
      }
    } else if (stalled || !settledRef.current) {
      // 目标没变也可能停在半路（刚挂载 / 挂起时弹簧正飞着），按到目标上。
      left.jump(sourceX.get());
      top.jump(sourceY.get());
    }
    settledRef.current = true;

    const nextHidden = isOffscreen(left.get(), top.get());
    if (hiddenRef.current !== nextHidden) {
      hiddenRef.current = nextHidden;
      setHidden(nextHidden);
    }
  });

  const CursorIcon = cursorIcons[cursor];

  return (
    <motion.div
      className="presence-cursor"
      data-cursor={cursor}
      data-hidden={hidden ? "true" : "false"}
      style={{
        x: left,
        y: top,
        ["--presence-color" as string]: color,
      }}
    >
      <span className="presence-cursor-glyph">
        <CursorIcon aria-hidden="true" />
      </span>
    </motion.div>
  );
}
