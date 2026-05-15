// Center column — header + decision toolbar + markdown summary
function SummaryPanel({ patent, decision, setDecision, variant }) {
  const summary = window.getSummary(patent);
  return (
    <main className="dp-center">
      <div className="dp-cnt-header">
        <div className="row">
          <h1 className="h1">{patent.fileTitle}</h1>
          <a href={patent.sourceUrl} target="_blank" rel="noreferrer"
             className="pr-btn pr-btn-default pr-btn-sm" style={{ flexShrink: 0 }}>
            <PRIcon name="ExternalLink" size={13}/>원문 보기
          </a>
        </div>
        <div className="row" style={{ gap: 16 }}>
          <span className="id">{patent.wipsonKey}</span>
          <FlagBadge country={patent.country}/>
          <span className="pr-tag">{patent.classifier}</span>
          <span style={{ fontSize: 12, color: "var(--pr-fg-muted)", fontWeight: 500 }}>IPC <span style={{color:"var(--pr-fg)",fontFamily:"var(--font-family-mono)",fontWeight:600}}>{patent.ipc}</span></span>

          <div style={{ flex: 1 }} />
          <div className="dp-decisions">
            <button className={`${decision === "relevant" ? "on relevant" : ""}`} onClick={() => setDecision("relevant")}>
              <PRIcon name="CheckCircle" size={13} color={decision === "relevant" ? "#0066FF" : "currentColor"}/>관련
            </button>
            <button className={`${decision === "maybe" ? "on maybe" : ""}`} onClick={() => setDecision("maybe")}>
              <PRIcon name="HelpCircle" size={13} color={decision === "maybe" ? "#FF9200" : "currentColor"}/>보류
            </button>
            <button className={`${decision === "irrelevant" ? "on irrelevant" : ""}`} onClick={() => setDecision("irrelevant")}>
              <PRIcon name="XCircle" size={13} color={decision === "irrelevant" ? "#46474C" : "currentColor"}/>무관
            </button>
          </div>
        </div>
        <div className="meta-row">
          <span><span className="lbl">출원인</span><span className="val">{patent.applicant}</span></span>
          <span><span className="lbl">발명자</span><span className="val">{patent.inventor}</span></span>
          <span><span className="lbl">출원일</span><span className="val mono">{patent.appDate}</span></span>
          <span><span className="lbl">공개일</span><span className="val mono">{patent.pubDate}</span></span>
        </div>
      </div>

      <div className="dp-body">
        <div className="dp-body-inner">
          <div className="dp-ai-note">
            <PRIcon name="Sparkles" size={12} color="#0066FF"/>
            AI가 명세서 원문에서 추출한 요약 · Claude Haiku 4.5 · 생성일 2025-11-04
          </div>
          <div className="md">
            {window.renderMarkdown(summary)}
          </div>
          <div style={{
            marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--pr-divider)",
            display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
          }}>
            <button className="pr-btn pr-btn-default pr-btn-sm">
              <PRIcon name="RefreshCw" size={13}/>요약 다시 생성
            </button>
            <button className="pr-btn pr-btn-default pr-btn-sm">
              <PRIcon name="Copy" size={13}/>요약 복사
            </button>
            <a href={patent.sourceUrl} target="_blank" rel="noreferrer"
               className="pr-btn pr-btn-default pr-btn-sm">
              <PRIcon name="ExternalLink" size={13}/>KIPRIS / 원문
            </a>
            <span style={{ flex: 1 }}/>
            <span style={{ fontSize: 11, color: "var(--pr-fg-faint)" }}>
              AI 요약은 보조용입니다. 결정 전에 원문을 확인하세요.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
window.SummaryPanel = SummaryPanel;
