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

export function SummaryPanel({ patent, summaryMd, decision, setDecision }: {
  patent: PatentView;
  summaryMd: string;
  decision: string | null;
  setDecision: (d: string) => void;
}) {
  const save = async (d: string) => {
    setDecision(d);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wipsonKey: patent.wipsonKey, decision: d, reviewer: "박경민" }),
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
          {patent.pubDate && <span><span className="lbl">공개일</span><span className="val mono">{patent.pubDate}</span></span>}
        </div>
      </div>

      <div className="dp-body">
        <div className="dp-body-inner">
          <div className="dp-ai-note">
            <PRIcon name="Sparkles" size={12} color="#0066FF" />
            {patent.summaryMd
              ? "AI가 명세서 원문에서 추출한 요약 · Claude Haiku 4.5"
              : "요약 준비 중 — 명세서 기반 요약이 채워지면 이 영역에 표시됩니다"}
          </div>
          <div className="md">{renderMarkdown(summaryMd)}</div>
          <TranslationSection descriptionKo={patent.descriptionKo} hasOriginal={!!patent.description} />
        </div>
      </div>
    </main>
  );
}
