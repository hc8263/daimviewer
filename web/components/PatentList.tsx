"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "./TopBar";
import { PRIcon, FlagBadge, StatusPill } from "./icons";
import type { PatentView } from "@/lib/patents";

export function PatentList({ patents, classifiers }: { patents: PatentView[]; classifiers: string[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState<PatentView[]>(patents);
  React.useEffect(() => setItems(patents), [patents]);

  const [filter, setFilter] = React.useState<{ status: string | null; classifier: string | null; reviewer: string | null; country: string | null; excluded: boolean }>({
    status: null, classifier: null, reviewer: null, country: null, excluded: false,
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [sort, setSort] = React.useState({ col: "appDate" as keyof PatentView, dir: "desc" as "asc" | "desc" });
  const [query, setQuery] = React.useState("");

  // Visible pool: by default, exclude deleted; if "삭제됨" tab, show only excluded
  const pool = items.filter((p) => filter.excluded ? p.excluded : !p.excluded);
  const total = pool.length;
  const reviewed = pool.filter((p) => p.reviewStatus).length;
  const stats = {
    relevant: pool.filter((p) => p.reviewStatus === "relevant").length,
    maybe: pool.filter((p) => p.reviewStatus === "maybe").length,
    irrelevant: pool.filter((p) => p.reviewStatus === "irrelevant").length,
    unreviewed: pool.filter((p) => !p.reviewStatus).length,
  };
  const excludedCount = items.filter((p) => p.excluded).length;

  let rows = pool;
  if (filter.status === "unreviewed") rows = rows.filter((p) => !p.reviewStatus);
  else if (filter.status) rows = rows.filter((p) => p.reviewStatus === filter.status);
  if (filter.classifier) rows = rows.filter((p) => p.classifier === filter.classifier);
  if (filter.reviewer) rows = rows.filter((p) => p.reviewer === filter.reviewer);
  if (filter.country) rows = rows.filter((p) => p.country === filter.country);
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    rows = rows.filter((p) => {
      const composite = `${p.country || ""}_${p.publicationNo || ""}`.toLowerCase();
      const hay = [
        p.wipsonKey,
        p.fileTitle,
        p.titleKo,
        p.applicant,
        p.inventor,
        p.publicationNo,
        p.applicationNo,
        p.registrationNo,
        composite,
      ].filter(Boolean).join(" ").toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }

  rows = [...rows].sort((a, b) => {
    const va = (a[sort.col] ?? "") as string;
    const vb = (b[sort.col] ?? "") as string;
    if (va < vb) return sort.dir === "asc" ? -1 : 1;
    if (va > vb) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const setStatus = (s: string) => setFilter((f) => ({ ...f, status: f.status === s ? null : s }));

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.wipsonKey)));
  };
  const toggleOne = (k: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selected);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelected(next);
  };

  const goDetail = (key: string) => router.push(`/patents/${encodeURIComponent(key)}`);

  const bulkExclude = async (excluded: boolean) => {
    if (selected.size === 0) return;
    const keys = Array.from(selected);
    const label = excluded ? `${keys.length}건을 분석 대상에서 제외할까요?` : `${keys.length}건을 복원할까요?`;
    if (!confirm(label)) return;
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wipsonKeys: keys, excluded, reviewer: "USER" }),
      });
    } catch {
      /* offline — ignore */
    }
    setItems((prev) => prev.map((p) => keys.includes(p.wipsonKey) ? { ...p, excluded } : p));
    setSelected(new Set());
  };

  const onExport = async () => {
    const keys = Array.from(selected);
    if (keys.length === 0) {
      window.location.href = "/api/export";
      return;
    }
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wipsonKeys: keys }),
    });
    if (!res.ok) {
      alert("CSV 내보내기 실패");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 10);
    a.download = `daimviewer-export-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pr-app">
      <TopBar crumbs={["프로젝트", "2026 신규 개발 검토", `특허 ${total}건`]} />
      <div className="lp-shell">
        <aside className="lp-rail">
          <div className="section">
            <div className="section-h">검토 상태</div>
            <div className={`nav-item ${!filter.excluded && filter.status === null ? "active" : ""}`} onClick={() => setFilter((f) => ({ ...f, status: null, excluded: false }))}>
              <PRIcon name="Circle" size={14} color="var(--pr-fg-muted)" />전체<span className="count">{total}</span>
            </div>
            <div className={`nav-item ${!filter.excluded && filter.status === "unreviewed" ? "active" : ""}`} onClick={() => { setFilter((f) => ({ ...f, excluded: false })); setStatus("unreviewed"); }}>
              <PRIcon name="Circle" size={14} color="var(--pr-fg-faint)" />미검토<span className="count">{stats.unreviewed}</span>
            </div>
            <div className={`nav-item ${!filter.excluded && filter.status === "relevant" ? "active" : ""}`} onClick={() => { setFilter((f) => ({ ...f, excluded: false })); setStatus("relevant"); }}>
              <PRIcon name="CheckCircle" size={14} color="#0066FF" />관련<span className="count">{stats.relevant}</span>
            </div>
            <div className={`nav-item ${!filter.excluded && filter.status === "maybe" ? "active" : ""}`} onClick={() => { setFilter((f) => ({ ...f, excluded: false })); setStatus("maybe"); }}>
              <PRIcon name="HelpCircle" size={14} color="#FF9200" />보류<span className="count">{stats.maybe}</span>
            </div>
            <div className={`nav-item ${!filter.excluded && filter.status === "irrelevant" ? "active" : ""}`} onClick={() => { setFilter((f) => ({ ...f, excluded: false })); setStatus("irrelevant"); }}>
              <PRIcon name="XCircle" size={14} color="#878A93" />무관<span className="count">{stats.irrelevant}</span>
            </div>
            <div className={`nav-item ${filter.excluded ? "active" : ""}`} onClick={() => setFilter((f) => ({ ...f, excluded: !f.excluded, status: null }))}>
              <PRIcon name="Trash" size={14} color="var(--pr-fg-faint)" />삭제됨<span className="count">{excludedCount}</span>
            </div>
          </div>
          <div className="section">
            <div className="section-h">분류</div>
            {classifiers.map((c) => (
              <div key={c} className={`nav-item ${filter.classifier === c ? "active" : ""}`}
                   onClick={() => setFilter((f) => ({ ...f, classifier: f.classifier === c ? null : c }))}>
                {c}<span className="count">{pool.filter((p) => p.classifier === c).length}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="lp-main">
          <div className="lp-toolbar">
            <span className="title">{filter.excluded ? "삭제된 특허" : "특허 목록"}</span>
            <span className="subtitle">{rows.length}건 / 총 {total}건</span>
            <div className="progress">
              <span className="progress-text">{reviewed}/{total}</span>
              <div className="progress-bar"><div className="progress-fill" style={{ width: total ? `${(reviewed / total) * 100}%` : "0%" }} /></div>
              <span className="progress-text" style={{ color: "var(--pr-fg)" }}>{total ? Math.round((reviewed / total) * 100) : 0}%</span>
            </div>
            <div style={{ flex: 1 }} />
            {selected.size > 0 && !filter.excluded && (
              <button className="pr-btn pr-btn-default pr-btn-sm" onClick={() => bulkExclude(true)}>
                <PRIcon name="Trash" size={13} />삭제 ({selected.size})
              </button>
            )}
            {selected.size > 0 && filter.excluded && (
              <button className="pr-btn pr-btn-default pr-btn-sm" onClick={() => bulkExclude(false)}>
                <PRIcon name="RefreshCw" size={13} />복원 ({selected.size})
              </button>
            )}
            <button className="pr-btn pr-btn-default pr-btn-sm" onClick={onExport}>
              <PRIcon name="ExternalLink" size={13} />
              CSV 내보내기{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>

          <div className="lp-filterbar">
            <button className="lp-chip"><PRIcon name="Filter" size={13} />필터</button>
            <span style={{ width: 1, height: 20, background: "var(--pr-divider)", margin: "0 4px" }} />
            <button className={`lp-chip ${filter.country === "KR" ? "has-value" : ""}`}
                    onClick={() => setFilter((f) => ({ ...f, country: f.country === "KR" ? null : "KR" }))}>
              국가 <span className="val">{filter.country || "전체"}</span><PRIcon name="ChevronDown" size={12} />
            </button>
            <span style={{ width: 1, height: 20, background: "var(--pr-divider)", margin: "0 4px" }} />
            <div className="lp-search">
              <PRIcon name="Search" size={13} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색: CN_115991160, 제목, 출원인…"
              />
              {query && (
                <button type="button" className="lp-search-clear" onClick={() => setQuery("")} aria-label="검색어 지우기">
                  <PRIcon name="X" size={12} />
                </button>
              )}
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: "var(--pr-fg-muted)" }}>정렬:</span>
            <button className="lp-chip" onClick={() => setSort((s) => ({ col: "appDate", dir: s.dir === "desc" ? "asc" : "desc" }))}>
              출원일 {sort.dir === "desc" ? "↓" : "↑"}
            </button>
          </div>

          <div className="lp-table">
            <table>
              <colgroup>
                <col style={{ width: 36 }} />
                <col style={{ width: 44 }} />
                <col style={{ width: 36 }} />
                <col style={{ width: 175 }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 95 }} />
                <col style={{ width: 95 }} />
                <col style={{ width: 95 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <span className={`lp-checkbox ${selected.size === rows.length && rows.length > 0 ? "checked" : ""}`} onClick={toggleAll}>
                      {selected.size === rows.length && rows.length > 0 && <PRIcon name="Check" size={11} color="#fff" />}
                    </span>
                  </th>
                  <th>#</th>
                  <th></th>
                  <th>WIPSONKEY</th>
                  <th>제목 · 출원인</th>
                  <th>분류</th>
                  <th><span className="sortable">출원일 <PRIcon name="ChevronDown" size={10} /></span></th>
                  <th>공개번호</th>
                  <th>검토자</th>
                  <th>상태</th>
                  <th>검토일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.wipsonKey} className={selected.has(p.wipsonKey) ? "selected" : ""} onClick={() => goDetail(p.wipsonKey)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <span className={`lp-checkbox ${selected.has(p.wipsonKey) ? "checked" : ""}`}
                            onClick={(e) => toggleOne(p.wipsonKey, e)}>
                        {selected.has(p.wipsonKey) && <PRIcon name="Check" size={11} color="#fff" />}
                      </span>
                    </td>
                    <td className="mono" style={{ color: "var(--pr-fg-muted)", fontVariantNumeric: "tabular-nums" }}>{p.index ?? ""}</td>
                    <td><FlagBadge country={p.country} /></td>
                    <td className="id-cell">{p.wipsonKey}</td>
                    <td className="title-cell">
                      {p.fileTitle}
                      <span className="applicant">{p.applicant} · {p.inventor}</span>
                    </td>
                    <td><span className="pr-tag">{p.classifier}</span></td>
                    <td className="mono" style={{ color: "var(--pr-fg-muted)" }}>{p.appDate}</td>
                    <td className="mono" style={{ color: "var(--pr-fg-muted)" }}>{p.pubDate}</td>
                    <td>{p.reviewer || <span style={{ color: "var(--pr-fg-faint)" }}>—</span>}</td>
                    <td><StatusPill status={p.reviewStatus} /></td>
                    <td className="mono" style={{ color: "var(--pr-fg-muted)" }}>{p.reviewDate || <span style={{ color: "var(--pr-fg-faint)" }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lp-footer">
            <span>{rows.length}건 표시 · 총 {total}건</span>
          </div>
        </main>
      </div>
    </div>
  );
}
