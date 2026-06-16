"use client";
import React from "react";
import { PRIcon, FlagBadge } from "./icons";
import { renderMarkdown } from "./markdown";
import type { PatentView } from "@/lib/patents";
import { DECISION_DESCRIPTION, REVIEW_CATEGORIES } from "@/lib/review";

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

function CommentBox({ wipsonKey, reviewer, initial, onSaved }: { wipsonKey: string; reviewer: string; initial: string | null; onSaved: (note: string) => void }) {
  const [value, setValue] = React.useState(initial ?? "");
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = React.useRef<string>(initial ?? "");
  const focused = React.useRef(false);
  const prevKey = React.useRef(wipsonKey);

  React.useEffect(() => {
    const samePatent = prevKey.current === wipsonKey;
    prevKey.current = wipsonKey;
    if (focused.current && samePatent) return;
    setValue(initial ?? "");
    lastSaved.current = initial ?? "";
    setStatus("idle");
  }, [wipsonKey, initial]);

  const persist = React.useCallback(async (next: string) => {
    if (next === lastSaved.current) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wipsonKey, reviewer, note: next }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      lastSaved.current = next;
      setStatus("saved");
      // Keep the shared client cache in sync so navigating away and back
      // shows the saved comment instead of the stale list value.
      onSaved(next);
    } catch {
      setStatus("error");
    }
  }, [wipsonKey, reviewer, onSaved]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(v), 700);
  };

  const onBlur = () => {
    focused.current = false;
    if (timer.current) clearTimeout(timer.current);
    persist(value);
  };

  return (
    <div className="dp-comment">
      <div className="dp-comment-h">
        <PRIcon name="MessageSquare" size={13} />
        <span>코멘트</span>
        <span className="dp-comment-status">
          {status === "saving" ? "저장 중..." : status === "saved" ? "저장됨" : status === "error" ? "저장 실패" : ""}
        </span>
      </div>
      <textarea
        className="dp-comment-input"
        placeholder="이 특허에 대한 코멘트를 남겨주세요"
        value={value}
        onChange={onChange}
        onFocus={() => { focused.current = true; }}
        onBlur={onBlur}
        rows={2}
      />
    </div>
  );
}

function splitClaimText(claimText: string): string[] {
  const parts = claimText
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .flatMap((line) => {
      const chunks = line.split(/([:;,：；，])/);
      const out: string[] = [];
      for (let i = 0; i < chunks.length; i += 2) {
        const body = (chunks[i] || "").trim();
        const delimiter = chunks[i + 1] || "";
        if (body) out.push(`${body}${delimiter}`.trim());
      }
      return out;
    })
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [claimText.trim()];
}

function ClaimSection({ claimText }: { claimText?: string | null }) {
  if (!claimText?.trim()) return null;
  const paragraphs = splitClaimText(claimText);
  return (
    <section className="dp-claims" aria-label="청구항">
      <h2>청구항</h2>
      <div className="dp-claim-body">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export function SummaryPanel({ patent, summaryMd, easySummaryMd, reviewer, decision, reviewCategory, setDecision, setReviewCategory, setComment }: {
  patent: PatentView;
  summaryMd: string;
  easySummaryMd?: string | null;
  reviewer: string;
  decision: string | null;
  reviewCategory: string | null;
  setDecision: (d: string | null) => void;
  setReviewCategory: (category: string | null) => void;
  setComment: (note: string) => void;
}) {
  const [viewMode, setViewMode] = React.useState<"easy" | "spec">("easy");

  const save = async (d: string) => {
    const next = decision === d ? null : d;
    setDecision(next);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wipsonKey: patent.wipsonKey, decision: next, reviewer }),
      });
    } catch {
      /* offline / no DB — ignore */
    }
  };

  const saveCategory = async (category: string) => {
    const next = reviewCategory === category ? null : category;
    setReviewCategory(next);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wipsonKey: patent.wipsonKey, reviewCategory: next, reviewer }),
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
          <div className="dp-review-categories" aria-label="1차 분류">
            <span className="dp-control-label">1차</span>
            {REVIEW_CATEGORIES.map((category) => (
              <button key={category} className={reviewCategory === category ? "on" : ""} onClick={() => saveCategory(category)}>
                {category}
              </button>
            ))}
            {!reviewCategory && <span className="dp-unclassified">미분류</span>}
          </div>
          <div className="dp-decisions">
            <button className={`${decision === "relevant" ? "on relevant" : ""}`} onClick={() => save("relevant")} title={DECISION_DESCRIPTION.relevant}>
              <PRIcon name="CheckCircle" size={13} color={decision === "relevant" ? "#0066FF" : "currentColor"} />S등급
            </button>
            <button className={`${decision === "maybe" ? "on maybe" : ""}`} onClick={() => save("maybe")} title={DECISION_DESCRIPTION.maybe}>
              <PRIcon name="HelpCircle" size={13} color={decision === "maybe" ? "#FF9200" : "currentColor"} />A등급
            </button>
            <button className={`${decision === "irrelevant" ? "on irrelevant" : ""}`} onClick={() => save("irrelevant")} title={DECISION_DESCRIPTION.irrelevant}>
              <PRIcon name="XCircle" size={13} color={decision === "irrelevant" ? "#46474C" : "currentColor"} />B등급
            </button>
          </div>
        </div>
        <div className="meta-row">
          {patent.applicant && <span><span className="lbl">출원인</span><span className="val">{patent.applicant}</span></span>}
          {patent.inventor && <span><span className="lbl">발명자</span><span className="val">{patent.inventor}</span></span>}
          {patent.appDate && <span><span className="lbl">출원일</span><span className="val mono">{patent.appDate}</span></span>}
          {patent.pubDate && <span><span className="lbl">공개번호</span><span className="val mono">{patent.pubDate}</span></span>}
          {patent.majorCategory && <span><span className="lbl">대분류</span><span className="val">{patent.majorCategory}</span></span>}
          {patent.middleCategory && <span><span className="lbl">중분류</span><span className="val">{patent.middleCategory}</span></span>}
        </div>
      </div>

      <div className="dp-body">
        <div className="dp-body-inner">
          <CommentBox wipsonKey={patent.wipsonKey} reviewer={reviewer} initial={patent.comment} onSaved={setComment} />
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
              <ClaimSection claimText={patent.claimText} />
              <div className="dp-ai-note">
                <PRIcon name="Info" size={12} color="#0066FF" />
                관리자 메모 — 변리사가 직접 작성한 검토 요약입니다
              </div>
              <div className="md">{renderMarkdown(patent.adminNote)}</div>
            </>
          ) : (
            <>
              <ClaimSection claimText={patent.claimText} />
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
