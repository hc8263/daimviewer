"use client";
import React from "react";
import { PRIcon, FlagBadge } from "./icons";
import { renderMarkdown } from "./markdown";
import type { PatentView } from "@/lib/patents";

function TranslationSection({ descriptionKo, hasOriginal }: { descriptionKo: string | null; hasOriginal: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="dp-translation">
      <button
        type="button"
        className="dp-translation-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <PRIcon name={open ? "ChevronDown" : "ChevronRight"} size={14} />
        원문 한글 번역
        {!descriptionKo && (
          <span className="dp-translation-pending">
            {hasOriginal ? "번역 준비 중" : "원문 없음"}
          </span>
        )}
      </button>
      {open && (
        <div className="dp-translation-body">
          {descriptionKo ? (
            <pre>{descriptionKo}</pre>
          ) : (
            <p className="dp-translation-empty">
              {hasOriginal
                ? "이 특허의 한글 번역이 아직 생성되지 않았습니다. 번역 파이프라인이 완료되면 이 영역에 표시됩니다."
                : "원문이 적재되지 않아 번역할 수 없습니다."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CommentBox({ wipsonKey, initial }: { wipsonKey: string; initial: string | null }) {
  const [value, setValue] = React.useState(initial ?? "");
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = React.useRef<string>(initial ?? "");

  React.useEffect(() => {
    setValue(initial ?? "");
    lastSaved.current = initial ?? "";
    setStatus("idle");
  }, [wipsonKey, initial]);

  const persist = React.useCallback(async (next: string) => {
    if (next === lastSaved.current) return;
    setStatus("saving");
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wipsonKey, reviewer: "USER", note: next }),
      });
      lastSaved.current = next;
      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  }, [wipsonKey]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(v), 700);
  };

  const onBlur = () => {
    if (timer.current) clearTimeout(timer.current);
    persist(value);
  };

  return (
    <div className="dp-comment">
      <div className="dp-comment-h">
        <PRIcon name="MessageSquare" size={13} />
        <span>코멘트</span>
        <span className="dp-comment-status">
          {status === "saving" ? "저장 중…" : status === "saved" ? "저장됨" : ""}
        </span>
      </div>
      <textarea
        className="dp-comment-input"
        placeholder="이 특허에 대한 코멘트를 남겨주세요"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        rows={2}
      />
    </div>
  );
}

export function SummaryPanel({ patent, summaryMd, easySummaryMd, decision, setDecision }: {
  patent: PatentView;
  summaryMd: string;
  easySummaryMd?: string | null;
  decision: string | null;
  setDecision: (d: string | null) => void;
}) {
  const [viewMode, setViewMode] = React.useState<"easy" | "spec">("easy");

  const save = async (d: string) => {
    const next = decision === d ? null : d;
    setDecision(next);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wipsonKey: patent.wipsonKey, decision: next, reviewer: "USER" }),
      });
    } catch {
      /* offline / no DB — ignore */
    }
  };

  return (
    <main className="dp-center">
      <div className="dp-cnt-header">
        <div className="row">
          <h1 className="h1">{patent.fileTitle}</h1>
          <div className="dp-view-toggle" role="tablist" aria-label="요약 보기 방식">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "easy"}
              className={viewMode === "easy" ? "on" : ""}
              onClick={() => setViewMode("easy")}
            >
              이해하기 쉬운 ver
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "spec"}
              className={viewMode === "spec" ? "on" : ""}
              onClick={() => setViewMode("spec")}
            >
              명세서 중심의 요약
            </button>
          </div>
          <a href={patent.sourceUrl} target="_blank" rel="noreferrer" className="pr-btn pr-btn-default pr-btn-sm" style={{ flexShrink: 0 }}>
            <PRIcon name="ExternalLink" size={13} />원문 보기
          </a>
        </div>
        <div className="row" style={{ gap: 16 }}>
          <span className="id">{patent.wipsonKey}</span>
          <FlagBadge country={patent.country} />
          {patent.classifier && <span className="pr-tag">{patent.classifier}</span>}
          {patent.ipc && (
            <span style={{ fontSize: 12, color: "var(--pr-fg-muted)", fontWeight: 500 }}>
              IPC <span style={{ color: "var(--pr-fg)", fontFamily: "var(--font-family-mono)", fontWeight: 600 }}>{patent.ipc}</span>
            </span>
          )}
          <div style={{ flex: 1 }} />
          <div className="dp-decisions">
            <button className={`${decision === "relevant" ? "on relevant" : ""}`} onClick={() => save("relevant")}>
              <PRIcon name="CheckCircle" size={13} color={decision === "relevant" ? "#0066FF" : "currentColor"} />관련
            </button>
            <button className={`${decision === "maybe" ? "on maybe" : ""}`} onClick={() => save("maybe")}>
              <PRIcon name="HelpCircle" size={13} color={decision === "maybe" ? "#FF9200" : "currentColor"} />보류
            </button>
            <button className={`${decision === "irrelevant" ? "on irrelevant" : ""}`} onClick={() => save("irrelevant")}>
              <PRIcon name="XCircle" size={13} color={decision === "irrelevant" ? "#46474C" : "currentColor"} />무관
            </button>
          </div>
        </div>
        <div className="meta-row">
          {patent.applicant && <span><span className="lbl">출원인</span><span className="val">{patent.applicant}</span></span>}
          {patent.inventor && <span><span className="lbl">발명자</span><span className="val">{patent.inventor}</span></span>}
          {patent.appDate && <span><span className="lbl">출원일</span><span className="val mono">{patent.appDate}</span></span>}
          {patent.pubDate && <span><span className="lbl">공개번호</span><span className="val mono">{patent.pubDate}</span></span>}
        </div>
      </div>

      <div className="dp-body">
        <div className="dp-body-inner">
          <CommentBox wipsonKey={patent.wipsonKey} initial={patent.comment} />
          {viewMode === "easy" ? (
            easySummaryMd ? (
              <>
                <div className="dp-ai-note">
                  <PRIcon name="Sparkles" size={12} color="#0066FF" />
                  이해하기 쉬운 ver
                </div>
                <div className="md">{renderMarkdown(easySummaryMd)}</div>
              </>
            ) : (
              <div className="dp-ai-note">
                <PRIcon name="Sparkles" size={12} color="#0066FF" />
                이해하기 쉬운 ver — 아직 생성되지 않았습니다
              </div>
            )
          ) : patent.adminNote ? (
            <>
              <div className="dp-ai-note">
                <PRIcon name="Info" size={12} color="#0066FF" />
                관리자 메모 — 변리사가 직접 작성한 검토 요약입니다
              </div>
              <div className="md">{renderMarkdown(patent.adminNote)}</div>
            </>
          ) : (
            <>
              {!patent.summaryMd && (
                <div className="dp-ai-note">
                  <PRIcon name="Sparkles" size={12} color="#0066FF" />
                  요약 준비 중 — 명세서 기반 요약이 채워지면 이 영역에 표시됩니다
                </div>
              )}
              <div className="md">{renderMarkdown(summaryMd)}</div>
            </>
          )}
          <TranslationSection descriptionKo={patent.descriptionKo} hasOriginal={!!patent.description} />
        </div>
      </div>
    </main>
  );
}
