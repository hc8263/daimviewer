function PatentList() {
  const [filter, setFilter] = React.useState({ status: null, classifier: null, reviewer: null, country: null });
  const [selected, setSelected] = React.useState(new Set());
  const [sort, setSort] = React.useState({ col: "appDate", dir: "desc" });

  const all = window.PATENTS;
  const total = all.length;
  const reviewed = all.filter(p => p.reviewStatus).length;
  const stats = {
    relevant: all.filter(p => p.reviewStatus === "relevant").length,
    maybe: all.filter(p => p.reviewStatus === "maybe").length,
    irrelevant: all.filter(p => p.reviewStatus === "irrelevant").length,
    unreviewed: all.filter(p => !p.reviewStatus).length,
  };

  let rows = all;
  if (filter.status === "unreviewed") rows = rows.filter(p => !p.reviewStatus);
  else if (filter.status) rows = rows.filter(p => p.reviewStatus === filter.status);
  if (filter.classifier) rows = rows.filter(p => p.classifier === filter.classifier);
  if (filter.reviewer) rows = rows.filter(p => p.reviewer === filter.reviewer);
  if (filter.country) rows = rows.filter(p => p.country === filter.country);

  // Sort
  rows = [...rows].sort((a, b) => {
    const va = a[sort.col] ?? "";
    const vb = b[sort.col] ?? "";
    if (va < vb) return sort.dir === "asc" ? -1 : 1;
    if (va > vb) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const setStatus = (s) => setFilter(f => ({ ...f, status: f.status === s ? null : s }));

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.wipsonKey)));
  };
  const toggleOne = (k, e) => {
    e.stopPropagation();
    const next = new Set(selected);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelected(next);
  };

  const goDetail = (key, variant) => {
    const v = variant || (new URLSearchParams(location.search).get("v")) || "v1";
    location.href = `detail-${v}.html?id=${encodeURIComponent(key)}`;
  };

  // Pick a default variant for navigation (the URL preserves it across pages)
  const currentVariant = new URLSearchParams(location.search).get("v") || "v1";

  return (
    <div className="pr-app">
      <TopBar crumbs={["프로젝트", "2026 신규 개발 검토", "특허 729건"]} />

      <div className="lp-shell">
        <aside className="lp-rail">
          <div className="section">
            <div className="section-h">검토 상태</div>
            <div className={`nav-item ${filter.status === null ? "active" : ""}`} onClick={() => setFilter(f => ({...f, status: null}))}>
              <PRIcon name="Circle" size={14} color="var(--pr-fg-muted)" />전체
              <span className="count">{total}</span>
            </div>
            <div className={`nav-item ${filter.status === "unreviewed" ? "active" : ""}`} onClick={() => setStatus("unreviewed")}>
              <PRIcon name="Circle" size={14} color="var(--pr-fg-faint)" />미검토
              <span className="count">{stats.unreviewed}</span>
            </div>
            <div className={`nav-item ${filter.status === "relevant" ? "active" : ""}`} onClick={() => setStatus("relevant")}>
              <PRIcon name="CheckCircle" size={14} color="#0066FF" />관련
              <span className="count">{stats.relevant}</span>
            </div>
            <div className={`nav-item ${filter.status === "maybe" ? "active" : ""}`} onClick={() => setStatus("maybe")}>
              <PRIcon name="HelpCircle" size={14} color="#FF9200" />보류
              <span className="count">{stats.maybe}</span>
            </div>
            <div className={`nav-item ${filter.status === "irrelevant" ? "active" : ""}`} onClick={() => setStatus("irrelevant")}>
              <PRIcon name="XCircle" size={14} color="#878A93" />무관
              <span className="count">{stats.irrelevant}</span>
            </div>
          </div>

          <div className="section">
            <div className="section-h">분류</div>
            {window.CLASSIFIERS.map(c => (
              <div key={c} className={`nav-item ${filter.classifier === c ? "active" : ""}`}
                   onClick={() => setFilter(f => ({...f, classifier: f.classifier === c ? null : c}))}>
                {c}
                <span className="count">{all.filter(p => p.classifier === c).length}</span>
              </div>
            ))}
          </div>

          <div className="section">
            <div className="section-h">내가 검토한 것</div>
            <div className="nav-item">
              <PRIcon name="Bookmark" size={14} color="var(--pr-fg-muted)" />최근 검토
              <span className="count">12</span>
            </div>
            <div className="nav-item">
              <PRIcon name="Star" size={14} color="var(--pr-fg-muted)" />중요 표시
              <span className="count">3</span>
            </div>
          </div>
        </aside>

        <main className="lp-main">
          <div className="lp-toolbar">
            <span className="title">특허 목록</span>
            <span className="subtitle">{rows.length}건 / 총 {total}건</span>
            <div className="progress">
              <span className="progress-text">{reviewed}/{total}</span>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${(reviewed/total)*100}%` }} /></div>
              <span className="progress-text" style={{ color: "var(--pr-fg)" }}>{Math.round((reviewed/total)*100)}%</span>
            </div>
            <div style={{ flex: 1 }} />
            <button className="pr-btn pr-btn-default pr-btn-sm">
              <PRIcon name="ExternalLink" size={13}/>CSV 내보내기
            </button>
            <button className="pr-btn pr-btn-primary pr-btn-sm">
              <PRIcon name="Plus" size={13}/>특허 추가
            </button>
          </div>

          <div className="lp-filterbar">
            <button className="lp-chip"><PRIcon name="Filter" size={13}/>필터</button>
            <span style={{ width: 1, height: 20, background: "var(--pr-divider)", margin: "0 4px" }}/>
            <button className={`lp-chip ${filter.country === "KR" ? "has-value" : ""}`}
                    onClick={() => setFilter(f => ({...f, country: f.country === "KR" ? null : "KR"}))}>
              국가 <span className="val">{filter.country || "전체"}</span><PRIcon name="ChevronDown" size={12}/>
            </button>
            <button className="lp-chip">
              출원인 <PRIcon name="ChevronDown" size={12}/>
            </button>
            <button className="lp-chip">
              출원일 <PRIcon name="ChevronDown" size={12}/>
            </button>
            <button className={`lp-chip ${filter.reviewer === "박경민" ? "has-value" : ""}`}
                    onClick={() => setFilter(f => ({...f, reviewer: f.reviewer === "박경민" ? null : "박경민"}))}>
              검토자 <span className="val">{filter.reviewer || "전체"}</span><PRIcon name="ChevronDown" size={12}/>
            </button>
            <div style={{ flex: 1 }}/>
            <span style={{ fontSize: 12, color: "var(--pr-fg-muted)" }}>정렬:</span>
            <button className="lp-chip" onClick={() => setSort(s => ({ col: "appDate", dir: s.dir === "desc" ? "asc" : "desc" }))}>
              출원일 {sort.dir === "desc" ? "↓" : "↑"}
            </button>
          </div>

          <div className="lp-table">
            <table>
              <colgroup>
                <col style={{ width: 36 }} />
                <col style={{ width: 36 }} />
                <col style={{ width: 175 }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 95 }} />
                <col style={{ width: 95 }} />
                <col style={{ width: 95 }} />
                <col style={{ width: 36 }} />
              </colgroup>
              <thead>
                <tr>
                  <th><span className={`lp-checkbox ${selected.size === rows.length && rows.length > 0 ? "checked" : ""}`}
                            onClick={toggleAll}>
                    {selected.size === rows.length && rows.length > 0 && <PRIcon name="Check" size={11} color="#fff"/>}
                  </span></th>
                  <th></th>
                  <th>WIPSONKEY</th>
                  <th>제목 · 출원인</th>
                  <th>분류</th>
                  <th><span className="sortable">출원일 <PRIcon name="ChevronDown" size={10}/></span></th>
                  <th>공개일</th>
                  <th>검토자</th>
                  <th>상태</th>
                  <th>검토일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.wipsonKey} className={selected.has(p.wipsonKey) ? "selected" : ""} onClick={() => goDetail(p.wipsonKey)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <span className={`lp-checkbox ${selected.has(p.wipsonKey) ? "checked" : ""}`}
                            onClick={(e) => toggleOne(p.wipsonKey, e)}>
                        {selected.has(p.wipsonKey) && <PRIcon name="Check" size={11} color="#fff"/>}
                      </span>
                    </td>
                    <td><FlagBadge country={p.country}/></td>
                    <td className="id-cell">{p.wipsonKey}</td>
                    <td className="title-cell">
                      {p.fileTitle}
                      <span className="applicant">{p.applicant} · {p.inventor}</span>
                    </td>
                    <td><span className="pr-tag">{p.classifier}</span></td>
                    <td className="mono" style={{ color: "var(--pr-fg-muted)" }}>{p.appDate}</td>
                    <td className="mono" style={{ color: "var(--pr-fg-muted)" }}>{p.pubDate}</td>
                    <td>{p.reviewer || <span style={{ color: "var(--pr-fg-faint)" }}>—</span>}</td>
                    <td><StatusPill status={p.reviewStatus}/></td>
                    <td className="mono" style={{ color: "var(--pr-fg-muted)" }}>{p.reviewDate || <span style={{ color: "var(--pr-fg-faint)" }}>—</span>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="pr-iconbtn" title="더보기"><PRIcon name="More" size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lp-footer">
            <span>{rows.length}건 표시 · 총 {total}건</span>
            <span>변형 선택:
              <a href="?v=v1" style={{ marginLeft: 8, color: currentVariant === "v1" ? "var(--pr-action)" : "var(--pr-fg-muted)", fontWeight: 600 }}>v1 우측 고정</a>
              <a href="?v=v2" style={{ marginLeft: 8, color: currentVariant === "v2" ? "var(--pr-action)" : "var(--pr-fg-muted)", fontWeight: 600 }}>v2 하단 드로어</a>
              <a href="?v=v3" style={{ marginLeft: 8, color: currentVariant === "v3" ? "var(--pr-action)" : "var(--pr-fg-muted)", fontWeight: 600 }}>v3 모달</a>
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<PatentList />);
