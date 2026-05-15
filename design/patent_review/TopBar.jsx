// Top bar — shared across all pages
function TopBar({ crumbs = [], rightExtra = null }) {
  return (
    <header className="pr-topbar">
      <a href="index.html" className="brand" style={{ marginRight: 4 }}>
        <span className="brand-mark"><WantedMark size={14}/></span>
        특허 검토
      </a>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep"><PRIcon name="ChevronRight" size={12}/></span>}
            <span className={i === crumbs.length - 1 ? "cur" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="spacer" />
      <div className="pr-search">
        <PRIcon name="Search" size={14}/>
        <input type="text" placeholder="WIPSONKEY, 제목, 출원인…" />
        <kbd>⌘K</kbd>
      </div>
      {rightExtra}
      <button className="pr-iconbtn" title="설정"><PRIcon name="Settings" size={16}/></button>
      <span className="pr-userchip">
        <span className="av">박</span>
        박경민
      </span>
    </header>
  );
}
window.TopBar = TopBar;
