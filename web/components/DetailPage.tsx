"use client";
import React from "react";
import { TopBar } from "./TopBar";
import { DetailRail } from "./DetailRail";
import { SummaryPanel } from "./SummaryPanel";
import { ChatPanel } from "./ChatPanel";
import { Splitter } from "./Splitter";
import type { PatentView } from "@/lib/patents";

const LEFT_DEFAULT = 260;
const RIGHT_DEFAULT = 380;
const LEFT_MIN = 200;
const LEFT_MAX = 420;
const RIGHT_MIN = 320;
const RIGHT_MAX = 600;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function DetailPage({ patent, patents, summaryMd }: {
  patent: PatentView;
  patents: PatentView[];
  summaryMd: string;
}) {
  const [decision, setDecision] = React.useState<string | null>(patent.reviewStatus);
  const [leftW, setLeftW] = React.useState(LEFT_DEFAULT);
  const [rightW, setRightW] = React.useState(RIGHT_DEFAULT);

  React.useEffect(() => {
    const lv = parseInt(localStorage.getItem("pr.leftW") || "", 10);
    if (Number.isFinite(lv)) setLeftW(clamp(lv, LEFT_MIN, LEFT_MAX));
    const rv = parseInt(localStorage.getItem("pr.rightW") || "", 10);
    if (Number.isFinite(rv)) setRightW(clamp(rv, RIGHT_MIN, RIGHT_MAX));
  }, []);

  React.useEffect(() => {
    setDecision(patent.reviewStatus);
  }, [patent.wipsonKey, patent.reviewStatus]);

  const onResizeLeft = React.useCallback((delta: number | "reset") => {
    if (delta === "reset") {
      setLeftW(LEFT_DEFAULT);
      localStorage.removeItem("pr.leftW");
      return;
    }
    setLeftW((w) => {
      const next = clamp(w + delta, LEFT_MIN, LEFT_MAX);
      localStorage.setItem("pr.leftW", String(next));
      return next;
    });
  }, []);
  const onResizeRight = React.useCallback((delta: number | "reset") => {
    if (delta === "reset") {
      setRightW(RIGHT_DEFAULT);
      localStorage.removeItem("pr.rightW");
      return;
    }
    setRightW((w) => {
      const next = clamp(w - delta, RIGHT_MIN, RIGHT_MAX);
      localStorage.setItem("pr.rightW", String(next));
      return next;
    });
  }, []);

  return (
    <div className="pr-app">
      <TopBar backHref="/" crumbs={["프로젝트", "2026 신규 개발 검토", patent.wipsonKey]} />
      <div className="dp-shell">
        <DetailRail active={patent} patents={patents} width={leftW} />
        <Splitter onResize={onResizeLeft} />
        <SummaryPanel patent={patent} summaryMd={summaryMd} decision={decision} setDecision={setDecision} />
        <Splitter onResize={onResizeRight} />
        <div className="dp-chat-right" style={{ width: rightW }}>
          <ChatPanel patent={patent} />
        </div>
      </div>
    </div>
  );
}
