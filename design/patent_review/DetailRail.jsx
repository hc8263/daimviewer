// Left rail — the 729 patents collapsed into a scrollable list, shown on detail page
function DetailRail({ active, onPick, variant, width = 260 }) {
  const [filter, setFilter] = React.useState("all");
  const all = window.PATENTS;
  const reviewed = all.filter(p => p.reviewStatus).length;

  let list = all;
  if (filter === "unreviewed") list = all.filter(p => !p.reviewStatus);
  else if (filter !== "all") list = all.filter(p => p.reviewStatus === filter);

  React.useEffect(() => {
    // scroll active into view
    const el = document.querySelector(`.dp-rail-item[data-key="${CSS.escape(active.wipsonKey)}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: "auto" });
  }, [active.wipsonKey]);

  return (
    <aside className="dp-rail" style={{ width }}>
      <div className="dp-rail-h">
        <div className="title">
          <span>특허 729건</span>
          <a href={`index.html?v=${variant}`} style={{ fontSize: 11, color: "var(--pr-fg-muted)", fontWeight: 600 }}>전체 목록 ↗</a>
        </div>
        <div className="meta">
          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--pr-fg-strong)" }}>{reviewed}/{all.length}</span>
          <div className="progress"><div style={{ width: `${(reviewed/all.length)*100}%` }} /></div>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round((reviewed/all.length)*100)}%</span>
        </div>
      </div>
      <div className="dp-rail-filters">
        <button className={`f ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>전체</button>
        <button className={`f ${filter === "unreviewed" ? "on" : ""}`} onClick={() => setFilter("unreviewed")}>미검토</button>
        <button className={`f ${filter === "relevant" ? "on" : ""}`} onClick={() => setFilter("relevant")}>관련</button>
        <button className={`f ${filter === "maybe" ? "on" : ""}`} onClick={() => setFilter("maybe")}>보류</button>
        <button className={`f ${filter === "irrelevant" ? "on" : ""}`} onClick={() => setFilter("irrelevant")}>무관</button>
      </div>
      <div className="dp-rail-list">
        {list.map(p => (
          <div key={p.wipsonKey} data-key={p.wipsonKey}
               className={`dp-rail-item ${active.wipsonKey === p.wipsonKey ? "active" : ""}`}
               onClick={() => onPick(p.wipsonKey)}>
            <div className="top">
              <FlagBadge country={p.country}/>
              <span>{p.wipsonKey}</span>
            </div>
            <div className="ttl">{p.fileTitle}</div>
            <div className="bot">
              <StatusPill status={p.reviewStatus}/>
              {p.reviewer && <span style={{ color: "var(--pr-fg-faint)" }}>· {p.reviewer}</span>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
window.DetailRail = DetailRail;
