"use client";
import React from "react";
import { Splitter } from "./Splitter";
import { SummaryPanel } from "./SummaryPanel";
import { ChatPanel } from "./ChatPanel";
import { usePatents } from "./PatentsContext";
import type { PatentView } from "@/lib/patents";

const RIGHT_DEFAULT = 380;
const RIGHT_MIN = 320;
const RIGHT_MAX = 600;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function readStored(key: string, fallback: number, min: number, max: number) {
  if (typeof window === "undefined") return fallback;
  const v = parseInt(window.localStorage.getItem(key) || "", 10);
  if (!Number.isFinite(v)) return fallback;
  return clamp(v, min, max);
}

export function PatentDetailContent({ patent, summaryMd, easySummaryMd }: { patent: PatentView; summaryMd: string; easySummaryMd?: string | null }) {
  const { items, updateLocal } = usePatents();

  // Merge lightweight metadata from the shared list with the heavy fields
  // (description, summary_md) loaded for this specific patent.
  const activePatent = React.useMemo(() => {
    const fromList = items.find((p) => p.wipsonKey === patent.wipsonKey);
    if (!fromList) return patent;
    return {
      ...fromList,
      description: patent.description,
      descriptionKo: patent.descriptionKo,
      summaryMd: patent.summaryMd ?? fromList.summaryMd,
    };
  }, [items, patent]);

  const [decision, setDecisionState] = React.useState<string | null>(patent.reviewStatus);
  React.useEffect(() => {
    setDecisionState(patent.reviewStatus);
  }, [patent.wipsonKey, patent.reviewStatus]);

  const setDecision = React.useCallback((d: string | null) => {
    setDecisionState(d);
    updateLocal(patent.wipsonKey, {
      reviewStatus: d,
      reviewer: d ? (activePatent.reviewer || "USER") : null,
      reviewDate: d ? (activePatent.reviewDate || new Date().toISOString().slice(0, 10)) : null,
    });
  }, [patent.wipsonKey, activePatent.reviewer, activePatent.reviewDate, updateLocal]);

  const [rightW, setRightW] = React.useState(() => readStored("pr.rightW", RIGHT_DEFAULT, RIGHT_MIN, RIGHT_MAX));
  const onResizeRight = React.useCallback((delta: number | "reset") => {
    if (delta === "reset") {
      setRightW(RIGHT_DEFAULT);
      try { localStorage.removeItem("pr.rightW"); } catch {}
      return;
    }
    setRightW((w) => {
      const next = clamp(w - delta, RIGHT_MIN, RIGHT_MAX);
      try { localStorage.setItem("pr.rightW", String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <>
      <SummaryPanel patent={activePatent} summaryMd={summaryMd} easySummaryMd={easySummaryMd ?? null} decision={decision} setDecision={setDecision} />
      <Splitter onResize={onResizeRight} />
      <div className="dp-chat-right" style={{ width: rightW }} suppressHydrationWarning>
        <ChatPanel patent={activePatent} />
      </div>
    </>
  );
}
