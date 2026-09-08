import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useChat } from "@/hooks/use-chat";
import {
  CHAT_MESSAGE_MAX,
  CHAT_NAME_MAX,
} from "@/lib/chat/protocol";
import "./ChatDock.css";

const CHAT_NAME_KEY = "fc-chat-name";

type Props = {
  placement?: "nav" | "fixed";
};

function readName(): string {
  try {
    return localStorage.getItem(CHAT_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(CHAT_NAME_KEY, name);
  } catch {}
}

function messageTime(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}

export function ChatDock({ placement = "fixed" }: Props) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [navHost, setNavHost] = useState<HTMLElement | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [formError, setFormError] = useState("");
  const { status, messages, error, sendMessage } = useChat(open);

  useEffect(() => {
    setName(readName());
    if (placement === "nav") {
      setNavHost(document.querySelector<HTMLElement>("[data-chat-host]"));
    }
  }, [placement]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      const hasSavedName = Boolean(nameRef.current?.value.trim());
      (hasSavedName ? messageRef.current : nameRef.current)?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    const closeForMenu = () => setOpen(false);
    window.addEventListener("site-menu-open", closeForMenu);
    return () => window.removeEventListener("site-menu-open", closeForMenu);
  }, []);

  useEffect(() => {
    if (!open || messages.length === 0) return;
    messageEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextName = name.trim();
    const nextText = text.trim();
    if (!nextName || !nextText) {
      setFormError("请填写昵称和留言");
      (!nextName ? nameRef.current : messageRef.current)?.focus();
      return;
    }
    const accepted = sendMessage(nextName, nextText, () => setText(""));
    if (!accepted) return;
    saveName(nextName);
    setName(nextName);
    setFormError("");
  };

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className="chat-trigger g-not"
      aria-label={open ? "关闭实时留言" : "打开实时留言"}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen((value) => !value)}
    >
      <MessageCircle aria-hidden="true" />
    </button>
  );

  return (
    <div className="chat-layer g-not" data-placement={placement}>
      {placement === "nav" ? navHost && createPortal(trigger, navHost) : trigger}

      {open && (
        <section
          id={panelId}
          className="chat-panel g-not"
          aria-label="实时留言"
        >
          <header className="chat-panel-header">
            <div>
              <h2>此刻留言</h2>
              <p>在线实时出现，不保存历史</p>
            </div>
            <button type="button" className="chat-close" aria-label="关闭实时留言" onClick={close}>
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="chat-status" role="status" aria-live="polite">
            {formError || error || (status === "connecting" ? "正在连接…" : status === "error" ? "正在重连…" : "")}
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <p className="chat-empty">这里还没有留言。</p>
            ) : (
              <ol>
                {messages.map((message) => (
                  <li key={message.id}>
                    <div className="chat-message-meta">
                      <strong>{message.name}</strong>
                      <time dateTime={new Date(message.createdAt).toISOString()}>
                        {messageTime(message.createdAt)}
                      </time>
                    </div>
                    <p>{message.text}</p>
                  </li>
                ))}
              </ol>
            )}
            <div ref={messageEndRef} />
          </div>

          <form className="chat-form" onSubmit={submit}>
            <label htmlFor={`${panelId}-name`}>昵称</label>
            <input
              ref={nameRef}
              id={`${panelId}-name`}
              name="chat-name"
              type="text"
              autoComplete="nickname"
              maxLength={CHAT_NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <label htmlFor={`${panelId}-message`}>留言</label>
            <div className="chat-compose">
              <input
                ref={messageRef}
                id={`${panelId}-message`}
                name="chat-message"
                type="text"
                autoComplete="off"
                maxLength={CHAT_MESSAGE_MAX}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="写点什么…"
              />
              <button type="submit" aria-label="发送留言" disabled={status !== "live"}>
                <Send aria-hidden="true" />
              </button>
            </div>
            <span className="chat-character-count" aria-hidden="true">
              {text.length}/{CHAT_MESSAGE_MAX}
            </span>
          </form>
        </section>
      )}
    </div>
  );
}
