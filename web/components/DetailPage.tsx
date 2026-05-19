"use client";
import React from "react";
import { useRouter } from "next/navigation";
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

function readStored(key: string, fallback: number, min: number, max: number) {
  if (typeof window === "undefined") return fallback;
  const v = parseInt(window.localStorage.getItem(key) || "", 10);
  if (!Number.isFinite(v)) return fallback;
  return clamp(v, min, max);
}

export function DetailPage({ patent, patents, summaryMd }: {
  patent: PatentView;
  patents: PatentView[];
  summaryMd: string;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState<PatentView[]>(patents);
  React.useEffect(() => setItems(patents), [patents]);
  const activePatent = items.find((p) => p.wipsonKey === patent.wipsonKey) ?? patent;
  const [decision, setDecisionState] = React.useState<string | null>(patent.reviewStatus);
  const [leftW, setLeftW] = React.useState(() => readStored("pr.leftW", LEFT_DEFAULT, LEFT_MIN, LEFT_MAX));
  const [rightW, setRightW] = React.useState(() => readStored("pr.rightW", RIGHT_DEFAULT, RIGHT_MIN, RIGHT_MAX));

  const setDecision = React.useCallback((d: string | null) => {
    setDecisionState(d);
    setItems((prev) => prev.map((p) => p.wipsonKey === patent.wipsonKey
      ? {
          ...p,
          reviewStatus: d,
          reviewer: d ? (p.reviewer || "USER") : null,
          reviewDate: d ? (p.reviewDate || new Date().toISOString().slice(0, 10)) : null,
        }
      : p));
  }, [patent.wipsonKey]);

  // ↑/↓ prev/next 이동, ←/→ 본문 스크롤
  React.useEffect(() => {
    const navList = items.filter((p) => !p.excluded);
    const idx = navList.findIndex((p) => p.wipsonKey === patent.wipsonKey);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        const n = navList[idx + 1];
        if (n) { e.preventDefault(); router.push(`/patents/${encodeURIComponent(n.wipsonKey)}`); }
      } else if (e.key === "ArrowUp" || e.key === "k") {
        const n = navList[idx - 1];
        if (n) { e.preventDefault(); router.push(`/patents/${encodeURIComponent(n.wipsonKey)}`); }
      } else if (e.key === "ArrowLeft") {
        const body = document.querySelector(".dp-body");
        if (body) { e.preventDefault(); body.scrollBy({ top: -120, behavior: "smooth" }); }
      } else if (e.key === "ArrowRight") {
        const body = document.querySelector(".dp-body");
        if (body) { e.preventDefault(); body.scrollBy({ top: 120, behavior: "smooth" }); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [patent.wipsonKey, items, router]);

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
      <TopBar crumbs={[{ label: "프로젝트", href: "/" }, { label: "2026 신규 개발 검토", href: "/" }, patent.wipsonKey]} />
      <div className="dp-shell">
        <DetailRail active={activePatent} patents={items} width={leftW} />
        <Splitter onResize={onResizeLeft} />
        <SummaryPanel patent={activePatent} summaryMd={summaryMd} decision={decision} setDecision={setDecision} />
        <Splitter onResize={onResizeRight} />
        <div className="dp-chat-right" style={{ width: rightW }} suppressHydrationWarning>
          <ChatPanel patent={activePatent} />
        </div>
      </div>
    </div>
  );
}
