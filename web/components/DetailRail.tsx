"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlagBadge, StatusPill } from "./icons";
import type { PatentView } from "@/lib/patents";

export function DetailRail({ active, patents, width = 260 }: {
  active: PatentView;
  patents: PatentView[];
  width?: number;
}) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<"all" | "unreviewed" | "relevant" | "maybe" | "irrelevant">("all");
  const [query, setQuery] = React.useState("");

  let list = patents;
  if (filter === "unreviewed") list = patents.filter((p) => !p.reviewStatus);
  else if (filter !== "all") list = patents.filter((p) => p.reviewStatus === filter);
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((p) =>
      (p.fileTitle || "").toLowerCase().includes(q) ||
      (p.titleKo || "").toLowerCase().includes(q) ||
      (p.wipsonKey || "").toLowerCase().includes(q)
    );
  }
  const reviewed = patents.filter((p) => p.reviewStatus).length;

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(`.dp-rail-item[data-key="${CSS.escape(active.wipsonKey)}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: "auto" });
  }, [active.wipsonKey]);

  return (
    <aside className="dp-rail" style={{ width }}>
      <div className="dp-rail-h">
        <div className="title">
          <span>특허 {patents.length}건</span>
          <Link href="/" style={{ fontSize: 11, color: "var(--pr-fg-muted)", fontWeight: 600 }}>전체 목록 ↗</Link>
        </div>
        <div className="meta">
          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--pr-fg-strong)" }}>{reviewed}/{patents.length}</span>
          <div className="progress"><div style={{ width: `${(reviewed / patents.length) * 100}%` }} /></div>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{patents.length ? Math.round((reviewed / patents.length) * 100) : 0}%</span>
        </div>
      </div>
      <div className="dp-rail-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목으로 검색…"
          aria-label="특허 제목 검색"
        />
        {query && (
          <button type="button" className="dp-rail-search-clear" onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>
        )}
      </div>
      <div className="dp-rail-filters">
        {(["all", "unreviewed", "relevant", "maybe", "irrelevant"] as const).map((k) => (
          <button key={k} className={`f ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>
            {{ all: "전체", unreviewed: "미검토", relevant: "관련", maybe: "보류", irrelevant: "무관" }[k]}
          </button>
        ))}
      </div>
      <div className="dp-rail-list">
        {list.length === 0 && (
          <div className="dp-rail-empty">검색 결과 없음</div>
        )}
        {list.map((p) => (
          <div
            key={p.wipsonKey}
            data-key={p.wipsonKey}
            className={`dp-rail-item ${active.wipsonKey === p.wipsonKey ? "active" : ""}`}
            onClick={() => router.push(`/patents/${encodeURIComponent(p.wipsonKey)}`)}
          >
            <div className="top">
              <FlagBadge country={p.country} />
              <span>{p.wipsonKey}</span>
            </div>
            <div className="ttl">{p.fileTitle}</div>
            <div className="bot">
              <StatusPill status={p.reviewStatus} />
              {p.reviewer && <span style={{ color: "var(--pr-fg-faint)" }}>· {p.reviewer}</span>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
