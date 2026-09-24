/**
 * 邮票数据 —— 友链版。
 *
 * 从 quickDemos/stamp-impasto 移植：布局/纹理结构原样保留，
 * 数据换成朋友与常读站点。票面默认是 5 种抽象画法（kind 决定）；
 * 有 image 时改铺站点图作票面底。两者共用同一套票面宽高与齿孔。
 */

export type FriendItem = {
  name: string
  url: string
  desc: string
  kind?: '互链' | '常读'
  /** 站点图，铺成邮票票面底。浏览器能画进 canvas 的位图即可。 */
  image?: string
}

export type StampId = string

export type StampDef = {
  id: StampId
  /** 悬停 pill / 灯箱里显示的名字 */
  label: string
  /** 友链地址 */
  url: string
  /** 一句话简介 */
  desc: string
  /** Rest position as % of the tall field (x,y from top-left) */
  x: number
  y: number
  /** 0-based viewport band；第 0 屏与旧撒点一致 */
  band: number
  /** Degrees */
  rotation: number
  /** Relative size multiplier */
  scale: number
  /** Base z order at rest */
  z: number
  /** Portrait aspect: width / height of face art */
  aspect: number
  kind: 'new-craft' | 'kensho' | 'specimen' | 'gaoling' | 'motou'
  /** 有值时票面铺这张图，不再走抽象画法 */
  image?: string
}

/** 5 种票面画法按序循环 */
const KINDS: StampDef['kind'][] = ['new-craft', 'kensho', 'specimen', 'gaoling', 'motou']
const ASPECTS = [0.78, 0.82, 0.76, 0.8, 0.78]

/**
 * 一屏俯视撒开的 11 个位置（票心 %，相对该屏）。
 * 超过 11 张时按屏往下接，不叠在同一点上。
 * x 收在 22–84、y 收在 16–84；rot/scale/z 交错，z 大的在上。
 */
const SCATTER = [
  { x: 50, y: 20, rotation: 6, scale: 1.06, z: 5 },
  { x: 72, y: 16, rotation: -8, scale: 1.0, z: 2 },
  { x: 84, y: 34, rotation: 10, scale: 1.08, z: 4 },
  { x: 28, y: 38, rotation: -6, scale: 1.0, z: 3 },
  { x: 54, y: 44, rotation: 5, scale: 1.1, z: 6 },
  { x: 74, y: 50, rotation: -9, scale: 0.98, z: 1 },
  { x: 22, y: 62, rotation: 11, scale: 0.97, z: 3 },
  { x: 44, y: 68, rotation: -7, scale: 1.0, z: 5 },
  { x: 66, y: 66, rotation: 8, scale: 0.96, z: 2 },
  { x: 82, y: 74, rotation: -4, scale: 0.95, z: 4 },
  { x: 36, y: 84, rotation: 3, scale: 0.92, z: 1 },
]

export const STAMPS_PER_BAND = SCATTER.length

export function stampFieldBands(count: number) {
  return Math.max(1, Math.ceil(count / STAMPS_PER_BAND))
}

/**
 * 由友链数据生成邮票定义。id 用 URL 保证稳定（纹理缓存按 id 存）。
 * y 是整张长桌的百分比：第 0 屏坐标与旧版相同，多出来的票落到下一屏。
 */
export function buildStamps(items: FriendItem[]): StampDef[] {
  const bands = stampFieldBands(items.length)
  return items.map((item, i) => {
    const slot = SCATTER[i % STAMPS_PER_BAND]
    const band = Math.floor(i / STAMPS_PER_BAND)
    return {
      id: item.url,
      label: item.name,
      url: item.url,
      desc: item.desc,
      x: slot.x,
      y: (band * 100 + slot.y) / bands,
      band,
      rotation: slot.rotation,
      scale: slot.scale,
      z: slot.z,
      aspect: ASPECTS[i % ASPECTS.length],
      kind: KINDS[i % KINDS.length],
      image: item.image,
    }
  })
}
