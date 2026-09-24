import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import './friend-form-dock.css'

/** Critically damped — Apple response ~0.35s, no overshoot. */
const spring = { type: 'spring' as const, bounce: 0, duration: 0.35 }
const fade = { duration: 0.2, ease: [0.2, 0, 0, 1] as const }
const press = { duration: 0.1, ease: 'easeOut' as const }
const OPEN_MAX = 360
const OPEN_PAD = 18
const GUTTER = 40

function openWidth() {
  const gutter = window.innerWidth <= 480 ? 32 : GUTTER
  return Math.min(OPEN_MAX, window.innerWidth - gutter)
}

/**
 * 右下角友链入口。卡始终按打开后的尺寸排，从右下角按 X/Y 独立弹簧缩放。
 * 中途再点会从当前值折返；不播 width/height，避免整页重排闪到 WebGL。
 */
export function FriendFormDock() {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const faceRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const wasOpenRef = useRef(false)
  const [closed, setClosed] = useState({ w: 128, h: 42 })
  const [openW, setOpenW] = useState(OPEN_MAX)
  const [faceH, setFaceH] = useState(320)
  const timing = reduce ? { duration: 0 } : spring
  const fadeTiming = reduce ? { duration: 0 } : fade

  useLayoutEffect(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const sync = () => {
      setClosed({ w: trigger.offsetWidth, h: trigger.offsetHeight })
      setOpenW(openWidth())
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(trigger)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [])

  useLayoutEffect(() => {
    const face = faceRef.current
    if (!face) return
    const sync = () => setFaceH(face.scrollHeight)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(face)
    return () => ro.disconnect()
  }, [openW])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), reduce ? 0 : 220)
    return () => window.clearTimeout(id)
  }, [open, reduce])

  useEffect(() => {
    if (wasOpenRef.current && !open) triggerRef.current?.focus()
    wasOpenRef.current = open
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setOpen(false)
    }
    const onPointerDown = (e: PointerEvent) => {
      const node = e.target as Node
      if (triggerRef.current?.contains(node)) return
      if (cardRef.current && !cardRef.current.contains(node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const maxCardH = typeof window === 'undefined' ? 720 : window.innerHeight - GUTTER
  const openH = Math.min(faceH + OPEN_PAD * 2, maxCardH)
  const scaleX = open || reduce ? 1 : closed.w / Math.max(openW, 1)
  const scaleY = open || reduce ? 1 : closed.h / Math.max(openH, 1)

  return (
    <div className="friend-dock">
      <motion.div
        ref={cardRef}
        className={`friend-dock-card${open ? ' is-open' : ''}`}
        initial={false}
        animate={{
          scaleX,
          scaleY,
          borderRadius: open ? 20 : 999,
          opacity: reduce && !open ? 0 : 1,
        }}
        transition={timing}
        style={{
          width: openW,
          height: openH,
          transformOrigin: 'bottom right',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <motion.div
          ref={faceRef}
          className="friend-dock-face"
          role="dialog"
          aria-labelledby="friend-form-title"
          aria-modal={open}
          aria-hidden={!open}
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={fadeTiming}
          style={{ pointerEvents: open ? 'auto' : 'none' }}
        >
          <FriendForm firstFieldRef={firstFieldRef} onClose={() => setOpen(false)} reduce={!!reduce} />
        </motion.div>
      </motion.div>

      <motion.button
        ref={triggerRef}
        type="button"
        className="friend-dock-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        tabIndex={open ? -1 : 0}
        initial={false}
        animate={{ opacity: open ? 0 : 1 }}
        transition={{ opacity: fadeTiming, scale: press }}
        style={{ pointerEvents: open ? 'none' : 'auto' }}
        whileTap={reduce || open ? undefined : { scale: 0.97 }}
        onClick={() => setOpen(true)}
      >
        也想贴一张
      </motion.button>
    </div>
  )
}

function FriendForm({
  firstFieldRef,
  onClose,
  reduce,
}: {
  firstFieldRef: RefObject<HTMLInputElement | null>
  onClose: () => void
  reduce: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [mailto, setMailto] = useState('#')
  const [copied, setCopied] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const form = formRef.current
    if (!form) return

    const fd = new FormData(form)
    const name = clean(String(fd.get('name') ?? ''))
    const url = toUrl(String(fd.get('url') ?? ''))
    const desc = clean(String(fd.get('desc') ?? ''))
    const email = clean(String(fd.get('email') ?? ''))

    const errors: string[] = []
    if (!name) errors.push('站名不能为空')
    if (!url) errors.push('网址不能为空')
    else if (!isHttpUrl(url)) errors.push('网址需是完整的 http(s) 地址')
    if (!desc) errors.push('一句话不能为空')

    if (errors.length > 0) {
      setResult('')
      setError(errors.join('；'))
      return
    }

    const lines = [
      `name   ${name}`,
      `url    ${url}`,
      `desc   ${desc}`,
      email ? `email  ${email}` : '',
    ].filter(Boolean)
    const text = lines.join('\n')
    setError('')
    setResult(text)
    setMailto(
      `mailto:feichuan05@gmail.com?subject=${encodeURIComponent(`友链申请：${name}`)}&body=${encodeURIComponent(text)}`,
    )
  }

  const onCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = result
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <form ref={formRef} className="friend-form" noValidate onSubmit={onSubmit}>
      <header className="friend-form-head">
        <div>
          <h2 id="friend-form-title">也想贴一张？</h2>
          <p>填好站名、地址和一句话，生成后复制或发邮件。</p>
        </div>
        <motion.button
          type="button"
          className="friend-form-close"
          aria-label="关闭"
          onClick={onClose}
          whileTap={reduce ? undefined : { scale: 0.96 }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </motion.button>
      </header>

      <div className="form-grid">
        <label className="form-field">
          <span className="form-label">
            站名 <em className="req">必填</em>
          </span>
          <input
            ref={firstFieldRef}
            type="text"
            name="name"
            required
            maxLength={30}
            placeholder="如：Feichuan"
            autoComplete="off"
          />
        </label>
        <label className="form-field">
          <span className="form-label">
            网址 <em className="req">必填</em>
          </span>
          <input type="url" name="url" required placeholder="https://example.com" inputMode="url" />
        </label>
        <label className="form-field form-field-wide">
          <span className="form-label">
            一句话 <em className="req">必填</em>
          </span>
          <input type="text" name="desc" required maxLength={60} placeholder="用一句话介绍你的站点" />
        </label>
        <label className="form-field form-field-wide">
          <span className="form-label">邮箱（选填，用于回信）</span>
          <input type="email" name="email" placeholder="you@example.com" autoComplete="email" />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <motion.button
          type="submit"
          className="form-submit"
          whileTap={reduce ? undefined : { scale: 0.96 }}
        >
          生成友链信息
        </motion.button>
        <span className="form-hint">只在你浏览器里，不经过服务器</span>
      </div>

      <AnimatePresence>
        {result ? (
          <motion.div
            className="form-result"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          >
            <pre className="form-result-code">{result}</pre>
            <div className="form-result-actions">
              <button type="button" onClick={onCopy}>
                {copied ? '已复制 ✓' : '复制'}
              </button>
              <a href={mailto}>用邮件发送</a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </form>
  )
}

const clean = (v: string) => v.trim().replace(/\s+/g, ' ')
const toUrl = (v: string) => {
  const t = clean(v)
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}
const isHttpUrl = (v: string) => /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v)
