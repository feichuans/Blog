import type { StampDef } from './stamps'

const SIZE = 512

/** Classic postage perforation silhouette (scalloped edge path). */
function drawPerforationMask(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const tooth = 13
  const r = tooth * 0.48
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'
  ctx.beginPath()

  // Walk perimeter with semicircle scallops pointing outward
  // Top edge left → right
  ctx.moveTo(r, 0)
  for (let x = tooth; x < w - r; x += tooth) {
    ctx.lineTo(x - r, 0)
    ctx.arc(x, 0, r, Math.PI, 0, true)
  }
  ctx.lineTo(w - r, 0)

  // Right edge top → bottom
  for (let y = tooth; y < h - r; y += tooth) {
    ctx.lineTo(w, y - r)
    ctx.arc(w, y, r, -Math.PI / 2, Math.PI / 2, true)
  }
  ctx.lineTo(w, h - r)

  // Bottom edge right → left
  for (let x = w - tooth; x > r; x -= tooth) {
    ctx.lineTo(x + r, h)
    ctx.arc(x, h, r, 0, Math.PI, true)
  }
  ctx.lineTo(r, h)

  // Left edge bottom → top
  for (let y = h - tooth; y > r; y -= tooth) {
    ctx.lineTo(0, y + r)
    ctx.arc(0, y, r, Math.PI / 2, -Math.PI / 2, true)
  }
  ctx.lineTo(0, r)
  ctx.closePath()
  ctx.fill()
}

function paperGrain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.06) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha
    d[i] = Math.min(255, Math.max(0, d[i] + n))
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n))
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
}

function watercolorBlobs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const x = w * (0.2 + Math.random() * 0.6)
    const y = h * (0.25 + Math.random() * 0.5)
    const r = Math.min(w, h) * (0.08 + Math.random() * 0.18)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, r * (0.8 + Math.random() * 0.5), r, Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawNewCraft(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pad = 28
  // mint field
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#d8efd5')
  bg.addColorStop(0.5, '#9fd49a')
  bg.addColorStop(1, '#cfe9c8')
  ctx.fillStyle = bg
  ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2)

  watercolorBlobs(ctx, w, h, 'rgba(255,255,255,0.45)', 6)
  watercolorBlobs(ctx, w, h, 'rgba(120,180,110,0.35)', 4)

  ctx.fillStyle = 'rgba(45,80,50,0.55)'
  ctx.font = `500 ${Math.floor(w * 0.048)}px "IBM Plex Sans", sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('NEW CRAFT', pad + 18, pad + 42)
  ctx.fillText('SOCIETY.', pad + 18, pad + 68)

  ctx.font = `400 ${Math.floor(w * 0.04)}px "IBM Plex Mono", monospace`
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(45,80,50,0.5)'
  ctx.fillText('01/2025', w - pad - 16, h - pad - 20)
}

function drawKensho(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pad = 28
  ctx.fillStyle = '#f7f4ef'
  ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2)

  ctx.fillStyle = '#1a1a1a'
  ctx.font = `600 ${Math.floor(w * 0.052)}px "IBM Plex Sans", sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('KENSHO', pad + 22, pad + 56)
  ctx.fillText('TECHNOLOGIES', pad + 22, pad + 88)

  ctx.font = `500 ${Math.floor(w * 0.07)}px "IBM Plex Mono", monospace`
  ctx.fillText('05', pad + 22, pad + 160)
  ctx.fillText('08', pad + 22, h - pad - 40)

  ctx.font = `500 ${Math.floor(w * 0.08)}px "IBM Plex Mono", monospace`
  ctx.textAlign = 'right'
  ctx.fillText('2026', w - pad - 22, pad + 160)

  // thick open ring mark
  ctx.strokeStyle = '#111'
  ctx.lineWidth = Math.floor(w * 0.08)
  ctx.beginPath()
  ctx.arc(w * 0.62, h * 0.62, w * 0.16, 0.35, Math.PI * 1.65)
  ctx.stroke()
}

function drawSpecimen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pad = 28
  ctx.fillStyle = '#d8d4cc'
  ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2)

  // faux halftone figure
  const cx = w * 0.5
  const cy = h * 0.48
  ctx.fillStyle = '#8a8680'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 20, w * 0.12, h * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx, cy + 50, w * 0.18, h * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  // chair-ish
  ctx.fillStyle = '#6e6a64'
  ctx.fillRect(cx - w * 0.22, cy + 10, w * 0.08, h * 0.28)
  ctx.fillRect(cx + w * 0.14, cy + 30, w * 0.08, h * 0.22)

  // grain overlay
  paperGrain(ctx, w, h, 0.12)

  ctx.fillStyle = 'rgba(30,28,24,0.75)'
  ctx.font = `italic 500 ${Math.floor(w * 0.055)}px "IBM Plex Sans", sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('Specimen.', pad + 22, h - pad - 28)
}

function drawGaoling(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pad = 28
  ctx.fillStyle = '#faf8f4'
  ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2)

  // left dark photo block
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(pad, h * 0.55, w * 0.28, h * 0.32)

  // big Chinese-style block type
  ctx.fillStyle = '#111'
  ctx.font = `700 ${Math.floor(w * 0.2)}px "IBM Plex Sans", "PingFang SC", sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('高', pad + w * 0.3, pad + h * 0.28)
  ctx.fillText('晗', pad + w * 0.3, pad + h * 0.48)

  ctx.font = `600 ${Math.floor(w * 0.06)}px "IBM Plex Mono", sans-serif`
  ctx.fillText('GAO', pad + w * 0.3, pad + h * 0.58)
  ctx.fillText('HAN', pad + w * 0.3, pad + h * 0.66)

  ctx.font = `400 ${Math.floor(w * 0.035)}px "IBM Plex Mono", monospace`
  ctx.fillStyle = '#444'
  ctx.fillText('DESIGN HERO', pad + w * 0.3, h - pad - 24)

  // icons column
  ctx.strokeStyle = '#111'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(w * 0.82, h * 0.28, 18, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(w * 0.76, h * 0.42)
  ctx.lineTo(w * 0.88, h * 0.42)
  ctx.lineTo(w * 0.82, h * 0.52)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(w * 0.82, h * 0.64, 14, 0.2, Math.PI * 1.2)
  ctx.stroke()
}

function drawMotou(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pad = 28
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#e8f6ef')
  bg.addColorStop(1, '#c5e8d6')
  ctx.fillStyle = bg
  ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2)

  watercolorBlobs(ctx, w, h, 'rgba(255,255,255,0.5)', 7)
  watercolorBlobs(ctx, w, h, 'rgba(90,170,140,0.3)', 5)

  ctx.fillStyle = 'rgba(40,90,70,0.55)'
  ctx.font = `italic 500 ${Math.floor(w * 0.1)}px "IBM Plex Sans", cursive`
  ctx.textAlign = 'center'
  ctx.fillText('motou', w * 0.5, h * 0.58)
}

function paintFace(kind: StampDef['kind'], ctx: CanvasRenderingContext2D, w: number, h: number) {
  switch (kind) {
    case 'new-craft':
      drawNewCraft(ctx, w, h)
      break
    case 'kensho':
      drawKensho(ctx, w, h)
      break
    case 'specimen':
      drawSpecimen(ctx, w, h)
      break
    case 'gaoling':
      drawGaoling(ctx, w, h)
      break
    case 'motou':
      drawMotou(ctx, w, h)
      break
  }
}

function loadStampImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`stamp image failed: ${src}`))
    img.src = src
  })
}

/** Contain-fit 站点图进票心，四周留纸边，对齐抽象票面的内框。 */
function paintPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const pad = 52
  const boxW = w - pad * 2
  const boxH = h - pad * 2
  const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  const dx = pad + (boxW - dw) / 2
  const dy = pad + (boxH - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

/** Fine sand-grit microheight — not oil ridges. */
function createSandGritHeight(
  w: number,
  h: number,
  mask: HTMLCanvasElement,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // mid-gray base (flat foil laminate)
  ctx.fillStyle = '#7a7a7a'
  ctx.fillRect(0, 0, w, h)

  // dense grit pixels — sandblast / frosted film
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    // Delicate multi-scale grit: restrained fine noise, very rare soft flakes.
    const fine = (Math.random() - 0.5) * 34
    const flake = Math.random() > 0.997 ? (Math.random() - 0.5) * 54 : 0
    const v = 122 + fine + flake
    const c = Math.max(0, Math.min(255, v))
    d[i] = c
    d[i + 1] = c
    d[i + 2] = c
    d[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)

  // very soft large-scale undulation so light can walk a little
  ctx.globalCompositeOperation = 'soft-light'
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = 40 + Math.random() * 120
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const bright = Math.random() > 0.5
    g.addColorStop(0, bright ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.09)')
    g.addColorStop(1, 'rgba(128,128,128,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'

  // Smaller, denser micro-dots: read as satin sand, not individual flakes.
  ctx.fillStyle = 'rgba(255,255,255,0.42)'
  for (let i = 0; i < 1450; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const s = Math.random() > 0.92 ? 1.1 : 0.58
    ctx.fillRect(x, y, s, s)
  }

  // Sub-pixel blur only to suppress harsh digital grain.
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')!
  octx.filter = 'blur(0.28px)'
  octx.drawImage(canvas, 0, 0)
  octx.filter = 'none'
  octx.globalCompositeOperation = 'destination-in'
  octx.drawImage(mask, 0, 0)
  return out
}

export type StampTextures = {
  albedoUrl: string
  albedoCanvas: HTMLCanvasElement
  heightCanvas: HTMLCanvasElement
  width: number
  height: number
}

const textureCache = new Map<StampDef['id'], StampTextures>()
const inflight = new Map<StampDef['id'], Promise<StampTextures>>()

export function getCachedStampTextures(id: StampDef['id']) {
  return textureCache.get(id)
}

function canvasPngUrl(canvas: HTMLCanvasElement) {
  return new Promise<string>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob))
        return
      }
      resolve(canvas.toDataURL('image/png'))
    }, 'image/png')
  })
}

/**
 * Build albedo (perforation alpha) + sand-grit microheight for foil/glitter lighting.
 * Cached per stamp so the source card and flying viewer share the exact surface.
 * WebGL reads the canvases directly; only the <img> face goes through a PNG blob.
 */
export async function createStampTextures(stamp: StampDef): Promise<StampTextures> {
  const cached = textureCache.get(stamp.id)
  if (cached) return cached
  const pending = inflight.get(stamp.id)
  if (pending) return pending

  const work = buildStampTextures(stamp)
  inflight.set(stamp.id, work)
  try {
    return await work
  } finally {
    inflight.delete(stamp.id)
  }
}

async function buildStampTextures(stamp: StampDef): Promise<StampTextures> {
  const w = SIZE
  const h = Math.round(SIZE / stamp.aspect)

  // --- albedo ---
  const albedo = document.createElement('canvas')
  albedo.width = w
  albedo.height = h
  const actx = albedo.getContext('2d')!
  actx.fillStyle = '#f2eee6'
  actx.fillRect(0, 0, w, h)
  if (stamp.image) {
    try {
      const photo = await loadStampImage(stamp.image)
      paintPhoto(actx, photo, w, h)
    } catch {
      paintFace(stamp.kind, actx, w, h)
    }
  } else {
    paintFace(stamp.kind, actx, w, h)
  }
  paperGrain(actx, w, h, stamp.image ? 0.03 : 0.05)

  const mask = document.createElement('canvas')
  mask.width = w
  mask.height = h
  const mctx = mask.getContext('2d')!
  drawPerforationMask(mctx, w, h)

  actx.globalCompositeOperation = 'destination-in'
  actx.drawImage(mask, 0, 0)

  const grit = createSandGritHeight(w, h, mask)
  const albedoUrl = await canvasPngUrl(albedo)

  const textures: StampTextures = {
    albedoUrl,
    albedoCanvas: albedo,
    heightCanvas: grit,
    width: w,
    height: h,
  }
  textureCache.set(stamp.id, textures)
  return textures
}
