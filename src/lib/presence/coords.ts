/**
 * 文档相对坐标。Lenis 把滚动做在 .smooth-content 的 transform 上，
 * getBoundingClientRect() 已经含位移，用它换算才能让两个人对上同一段文字。
 * 没有 Lenis 容器时退回 window 滚动。
 */

const CONTENT_SELECTOR = ".smooth-content";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function contentBox(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const width = Math.max(el.scrollWidth, el.offsetWidth, 1);
  const height = Math.max(el.scrollHeight, el.offsetHeight, 1);
  return { rect, width, height };
}

export function pointerToDoc(e: PointerEvent | MouseEvent): {
  x: number;
  y: number;
} {
  const el = document.querySelector<HTMLElement>(CONTENT_SELECTOR);
  if (el) {
    const { rect, width, height } = contentBox(el);
    return {
      x: clamp01((e.clientX - rect.left) / width),
      y: clamp01((e.clientY - rect.top) / height),
    };
  }

  const width = Math.max(document.documentElement.scrollWidth, 1);
  const height = Math.max(document.documentElement.scrollHeight, 1);
  return {
    x: clamp01((e.clientX + window.scrollX) / width),
    y: clamp01((e.clientY + window.scrollY) / height),
  };
}

export function docToViewport(
  x: number,
  y: number,
): { left: number; top: number } {
  const el = document.querySelector<HTMLElement>(CONTENT_SELECTOR);
  if (el) {
    const { rect, width, height } = contentBox(el);
    return {
      left: rect.left + x * width,
      top: rect.top + y * height,
    };
  }

  return {
    left: x * Math.max(document.documentElement.scrollWidth, 1) - window.scrollX,
    top: y * Math.max(document.documentElement.scrollHeight, 1) - window.scrollY,
  };
}

/** 只要有精细指针就广播；触控笔电上 fine+coarse 常同时为真，不能把 coarse 当成否决。 */
export function prefersFinePointer(): boolean {
  return (
    typeof matchMedia !== "function" || matchMedia("(pointer: fine)").matches
  );
}
