"use client";
import React from "react";
import { PRIcon } from "./icons";
import type { PatentView } from "@/lib/patents";

type Msg = { role: "user" | "assistant"; text: string };

const storageKey = (wipsonKey: string) => `chat:${wipsonKey}`;

function loadMessages(wipsonKey: string): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(wipsonKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(wipsonKey: string, messages: Msg[]) {
  if (typeof window === "undefined") return;
  try {
    if (messages.length === 0) localStorage.removeItem(storageKey(wipsonKey));
    else localStorage.setItem(storageKey(wipsonKey), JSON.stringify(messages));
  } catch {
    // quota or serialization error — non-fatal
  }
}

function escapeAndFormat(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p style='margin:6px 0 0 0'>")
    .replace(/\n/g, "<br/>");
}

export function ChatPanel({ patent, showHeader = true }: { patent: PatentView; showHeader?: boolean }) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [draft, setDraft] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const msgsRef = React.useRef<HTMLDivElement>(null);

  // Load persisted conversation when the active patent changes.
  React.useEffect(() => {
    setMessages(loadMessages(patent.wipsonKey));
  }, [patent.wipsonKey]);

  // Persist on every change. Skips when the assistant placeholder is still
  // streaming (empty text) to avoid thrashing.
  React.useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && last.text === "") return;
    saveMessages(patent.wipsonKey, messages);
  }, [messages, patent.wipsonKey]);

  React.useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages]);

  const clearContext = () => {
    if (messages.length > 0 && !confirm("이 특허에 대한 대화를 모두 지웁니다. 진행할까요?")) return;
    setMessages([]);
    saveMessages(patent.wipsonKey, []);
  };

  const suggestions = [
    "청구항 1의 핵심 한정 사항은?",
    "선행 특허와의 차별점은?",
    "회피 설계 방법을 알려줘",
    "당사 기술과 충돌하는 부분?",
  ];

  const send = async (text: string) => {
    if (!text.trim() || pending) return;
    const userMsg: Msg = { role: "user", text };
    const history = [...messages, userMsg];
    setMessages(history);
    setDraft("");
    setPending(true);

    // Append an empty assistant placeholder that we'll stream into
    setMessages((m) => [...m, { role: "assistant", text: "" }]);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wipsonKey: patent.wipsonKey,
          messages: history.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", text: errText || "(응답 실패)" };
          return copy;
        });
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", text: acc };
          return copy;
        });
      }
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", text: `(오류) ${(err as Error).message}` };
        return copy;
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="chat-shell">
      {showHeader && (
        <div className="chat-header">
          <PRIcon name="Bot" size={16} color="#0066FF" />
          AI 검토 도우미
          <span className="badge">BETA</span>
          <span className="model">claude-haiku-4-5</span>
          <button
            className="pr-btn pr-btn-default pr-btn-sm"
            title="이 특허의 대화 기록을 모두 지웁니다"
            onClick={clearContext}
            disabled={messages.length === 0 || pending}
          >
            <PRIcon name="RefreshCw" size={12} />
            대화 지우기
          </button>
        </div>
      )}

      <div className="chat-msgs" ref={msgsRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="glyph"><PRIcon name="Sparkles" size={18} /></span>
            <h3>이 특허에 대해 무엇이든 물어보세요</h3>
            <p>명세서 전문을 근거로 답변합니다.<br />근거가 없는 내용은 답변하지 않습니다.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-row ${m.role === "user" ? "user" : "ai"}`}>
            <span className={`chat-avatar ${m.role === "user" ? "user" : "ai"}`}>
              {m.role === "user" ? "박" : <PRIcon name="Bot" size={14} color="#fff" />}
            </span>
            <div>
              <div
                className="chat-bubble"
                dangerouslySetInnerHTML={{ __html: m.text ? `<p style='margin:0'>${escapeAndFormat(m.text)}</p>` : "<p style='margin:0;opacity:0.6'>…</p>" }}
              />
            </div>
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="chat-suggestions">
          {suggestions.map((s) => (
            <button key={s} className="chat-suggestion" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <div className="chat-input-wrap">
          <textarea
            rows={1}
            placeholder="이 특허에 대해 질문하기… (Shift+Enter 줄바꿈)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
          <button className="send" disabled={!draft.trim() || pending} onClick={() => send(draft)}>
            <PRIcon name="ArrowUp" size={14} color={draft.trim() && !pending ? "#fff" : "currentColor"} />
          </button>
        </div>
        <div className="chat-input-tips">
          <span>Enter 전송 · Shift+Enter 줄바꿈</span>
          <span style={{ marginLeft: "auto" }}>컨텍스트: 명세서 전문</span>
        </div>
      </div>
    </div>
  );
}
