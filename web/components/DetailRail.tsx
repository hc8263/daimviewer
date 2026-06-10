"use client";
import React from "react";
import Link from "next/link";
import { FlagBadge, StatusPill, PRIcon } from "./icons";
import type { PatentView } from "@/lib/patents";

const PAGE_SIZE = 20;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function DetailRail({ active, patents, width = 260 }: {
  active: PatentView;
  patents: PatentView[];
  width?: number;
}) {
  const [filter, setFilter] = React.useState<"all" | "unreviewed" | "relevant" | "maybe" | "irrelevant">("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const listRef = React.useRef<HTMLDivElement>(null);
  const prevActiveKeyRef = React.useRef(active.wipsonKey);

  const list = React.useMemo(() => {
    let next = patents;
    if (filter === "unreviewed") next = patents.filter((p) => !p.reviewStatus);
    else if (filter !== "all") next = patents.filter((p) => p.reviewStatus === filter);

    const q = query.trim().toLowerCase();
    if (q) {
      next = next.filter((p) =>
        (p.fileTitle || "").toLowerCase().includes(q) ||
        (p.titleKo || "").toLowerCase().includes(q) ||
        (p.wipsonKey || "").toLowerCase().includes(q) ||
        (p.pdfFilename || "").toLowerCase().includes(q),
      );
    }

    return next;
  }, [patents, filter, query]);

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = clamp(page, 1, pageCount);
  const start = list.length ? (safePage - 1) * PAGE_SIZE : 0;
  const end = Math.min(start + PAGE_SIZE, list.length);
  const pageItems = list.slice(start, end);
  const reviewed = patents.filter((p) => p.reviewStatus).length;

  const pageWindow = React.useMemo(() => {
    const pages: Array<number | "ellipsis"> = [];
    const windowStart = Math.max(1, safePage - 2);
    const windowEnd = Math.min(pageCount, safePage + 2);

    if (windowStart > 1) {
      pages.push(1);
      if (windowStart > 2) pages.push("ellipsis");
    }
    for (let p = windowStart; p <= windowEnd; p += 1) pages.push(p);
    if (windowEnd < pageCount) {
      if (windowEnd < pageCount - 1) pages.push("ellipsis");
      pages.push(pageCount);
    }

    return pages;
  }, [pageCount, safePage]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(`.dp-rail-item[data-key="${CSS.escape(active.wipsonKey)}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: "auto" });
  }, [active.wipsonKey, safePage]);

  React.useEffect(() => {
    setPage((current) => clamp(current, 1, pageCount));
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [pageCount, filter, query]);

  React.useEffect(() => {
    if (prevActiveKeyRef.current === active.wipsonKey) return;
    prevActiveKeyRef.current = active.wipsonKey;
    const activeIndex = list.findIndex((p) => p.wipsonKey === active.wipsonKey);
    if (activeIndex < 0) return;
    const activePage = Math.floor(activeIndex / PAGE_SIZE) + 1;
    setPage(activePage);
  }, [active.wipsonKey, list]);

  const resetFilter = (next: typeof filter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <aside className="dp-rail" style={{ width }} suppressHydrationWarning>
      <div className="dp-rail-h">
        <div className="title">
          <span>검토 중 · {patents.length}건</span>
        </div>
        <div className="meta">
          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--pr-fg-strong)" }}>{reviewed}/{patents.length}</span>
          <div className="progress"><div style={{ width: `${patents.length ? (reviewed / patents.length) * 100 : 0}%` }} /></div>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{patents.length ? Math.round((reviewed / patents.length) * 100) : 0}%</span>
        </div>
      </div>
      <div className="dp-rail-search">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="제목 · 파일명으로 검색…"
          aria-label="특허 제목 검색"
        />
        {query && (
          <button type="button" className="dp-rail-search-clear" onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>
        )}
      </div>
      <div className="dp-rail-filters">
        {(["all", "unreviewed", "relevant", "maybe", "irrelevant"] as const).map((k) => (
          <button key={k} className={`f ${filter === k ? "on" : ""}`} onClick={() => resetFilter(k)}>
            {{ all: "전체", unreviewed: "미검토", relevant: "S등급", maybe: "A등급", irrelevant: "B등급" }[k]}
          </button>
        ))}
      </div>
      <div className="dp-rail-list" ref={listRef}>
        {pageItems.length === 0 && (
          <div className="dp-rail-empty">검색 결과 없음</div>
        )}
        {pageItems.map((p) => (
          <Link
            key={p.wipsonKey}
            href={`/patents/${encodeURIComponent(p.wipsonKey)}`}
            prefetch={true}
            data-key={p.wipsonKey}
            className={`dp-rail-item ${active.wipsonKey === p.wipsonKey ? "active" : ""}`}
          >
            <div className="top">
              {typeof p.index === "number" && (
                <span className="dp-rail-num">#{p.index}</span>
              )}
              <FlagBadge country={p.country} />
              <span>{p.wipsonKey}</span>
            </div>
            <div className="ttl">{p.fileTitle}</div>
            <div className="bot">
              <StatusPill status={p.reviewStatus} />
              {p.reviewer && <span style={{ color: "var(--pr-fg-faint)" }}>· {p.reviewer}</span>}
            </div>
          </Link>
        ))}
      </div>
      <div className="dp-rail-pagination">
        <div className="dp-rail-pageinfo">
          <span className="current">{safePage}</span>
          <span className="sep">/</span>
          <span>{pageCount}</span>
          <span className="range">{list.length ? `${start + 1}-${end}` : "0"}</span>
        </div>
        <div className="dp-rail-pagecontrols">
          <button
            type="button"
            className="dp-rail-pagebtn"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage <= 1}
            aria-label="이전 페이지"
          >
            <PRIcon name="ChevronLeft" size={14} />
          </button>
          {pageWindow.map((item, idx) => (
            item === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="dp-rail-pagespacer">…</span>
            ) : (
              <button
                key={item}
                type="button"
                className={`dp-rail-pagebtn ${item === safePage ? "on" : ""}`}
                onClick={() => setPage(item)}
                aria-current={item === safePage ? "page" : undefined}
              >
                {item}
              </button>
            )
          ))}
          <button
            type="button"
            className="dp-rail-pagebtn"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={safePage >= pageCount}
            aria-label="다음 페이지"
          >
            <PRIcon name="ChevronRight" size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
