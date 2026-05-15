// DetailPage — the 3-pane review screen.
// Variant: "v1" (right-fixed chatbot, draggable splitters), "v2" (bottom drawer), "v3" (modal).
//
// V1 has draggable column splitters; widths persist to localStorage.

const LEFT_DEFAULT = 260;
const RIGHT_DEFAULT = 380;
const LEFT_MIN = 200;
const LEFT_MAX = 420;
const RIGHT_MIN = 320;
const RIGHT_MAX = 600;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function DetailPage() {
  const variant = window.__VARIANT__ || "v1";
  const params = new URLSearchParams(location.search);
  const initialId = params.get("id") || window.PATENTS[0].wipsonKey;

  const [activeId, setActiveId] = React.useState(initialId);
  const [decision, setDecision] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);

  // Resizable column widths (V1 only)
  const [leftW, setLeftW] = React.useState(() => {
    const v = parseInt(localStorage.getItem("pr.leftW") || "", 10);
    return Number.isFinite(v) ? clamp(v, LEFT_MIN, LEFT_MAX) : LEFT_DEFAULT;
  });
  const [rightW, setRightW] = React.useState(() => {
    const v = parseInt(localStorage.getItem("pr.rightW") || "", 10);
    return Number.isFinite(v) ? clamp(v, RIGHT_MIN, RIGHT_MAX) : RIGHT_DEFAULT;
  });

  const onResizeLeft = React.useCallback((delta) => {
    if (delta === "reset") { setLeftW(LEFT_DEFAULT); localStorage.removeItem("pr.leftW"); return; }
    setLeftW(w => {
      const next = clamp(w + delta, LEFT_MIN, LEFT_MAX);
      localStorage.setItem("pr.leftW", String(next));
      return next;
    });
  }, []);
  const onResizeRight = React.useCallback((delta) => {
    if (delta === "reset") { setRightW(RIGHT_DEFAULT); localStorage.removeItem("pr.rightW"); return; }
    // Right panel grows when the splitter moves LEFT (negative delta)
    setRightW(w => {
      const next = clamp(w - delta, RIGHT_MIN, RIGHT_MAX);
      localStorage.setItem("pr.rightW", String(next));
      return next;
    });
  }, []);

  const patent = window.PATENTS.find(p => p.wipsonKey === activeId) || window.PATENTS[0];

  React.useEffect(() => {
    setDecision(patent.reviewStatus || null);
  }, [activeId]);

  const variantBadge = {
    v1: "v1 · 우측 고정 채팅",
    v2: "v2 · 하단 드로어 채팅",
    v3: "v3 · 전체화면 모달 채팅",
  }[variant];

  // Variant switcher in the topbar
  const topbarRight = (
    <div style={{ display: "flex", gap: 4, alignItems: "center", marginRight: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--pr-fg-faint)", letterSpacing: "0.04em", textTransform: "uppercase" }}>변형</span>
      <a className={`pr-btn pr-btn-sm ${variant === "v1" ? "pr-btn-default" : "pr-btn-ghost"}`}
         href={`detail-v1.html?id=${encodeURIComponent(activeId)}`}>v1</a>
      <a className={`pr-btn pr-btn-sm ${variant === "v2" ? "pr-btn-default" : "pr-btn-ghost"}`}
         href={`detail-v2.html?id=${encodeURIComponent(activeId)}`}>v2</a>
      <a className={`pr-btn pr-btn-sm ${variant === "v3" ? "pr-btn-default" : "pr-btn-ghost"}`}
         href={`detail-v3.html?id=${encodeURIComponent(activeId)}`}>v3</a>
    </div>
  );

  return (
    <div className="pr-app">
      <TopBar
        crumbs={["프로젝트", "2026 신규 개발 검토", patent.wipsonKey]}
        rightExtra={topbarRight}
      />

      <div className="dp-shell">
        <DetailRail active={patent} onPick={setActiveId} variant={variant}
                    width={variant === "v1" ? leftW : 260} />

        {variant === "v1" && <Splitter onResize={onResizeLeft} />}

        <SummaryPanel patent={patent} decision={decision} setDecision={setDecision} variant={variant} />

        {variant === "v1" && <Splitter onResize={onResizeRight} />}

        {variant === "v1" && (
          <div className="dp-chat-right" style={{ width: rightW }}>
            <ChatPanel patent={patent} />
          </div>
        )}
      </div>

      {variant === "v2" && (
        <React.Fragment>
          {!drawerOpen && (
            <button className="dp-chat-drawer-trigger" onClick={() => setDrawerOpen(true)}>
              <PRIcon name="Bot" size={18} color="#fff"/>AI에게 묻기
            </button>
          )}
          {drawerOpen && (
            <div className="dp-chat-drawer">
              <div className="dp-chat-drawer-header">
                <PRIcon name="Bot" size={14} color="#0066FF"/>
                AI 검토 도우미
                <span style={{ background: "var(--pr-fg-strong)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>BETA</span>
                <div className="actions">
                  <button className="pr-iconbtn" title="최소화" onClick={() => setDrawerOpen(false)}>
                    <PRIcon name="Minimize" size={14}/>
                  </button>
                  <button className="pr-iconbtn" title="닫기" onClick={() => setDrawerOpen(false)}>
                    <PRIcon name="X" size={14}/>
                  </button>
                </div>
              </div>
              <ChatPanel patent={patent} showHeader={false} />
            </div>
          )}
        </React.Fragment>
      )}

      {variant === "v3" && (
        <React.Fragment>
          <button className="dp-chat-drawer-trigger" onClick={() => setModalOpen(true)}>
            <PRIcon name="Bot" size={18} color="#fff"/>AI에게 묻기
          </button>
          {modalOpen && (
            <div className="dp-chat-modal-bg" onClick={() => setModalOpen(false)}>
              <div className="dp-chat-modal" onClick={(e) => e.stopPropagation()}>
                <aside className="dp-chat-modal-side">
                  <div>
                    <div className="ctx-h">검토 중인 특허</div>
                    <div className="ctx-id" style={{ marginTop: 6 }}>{patent.wipsonKey}</div>
                  </div>
                  <div className="ctx-title">{patent.fileTitle}</div>
                  <div className="ctx-tags">
                    <FlagBadge country={patent.country}/>
                    <span className="pr-tag">{patent.classifier}</span>
                    <span className="pr-tag">IPC {patent.ipc}</span>
                  </div>
                  <div className="ctx-meta">
                    <div><span style={{ color: "var(--pr-fg-faint)" }}>출원인 </span>{patent.applicant}</div>
                    <div style={{ marginTop: 4 }}><span style={{ color: "var(--pr-fg-faint)" }}>발명자 </span>{patent.inventor}</div>
                    <div style={{ marginTop: 4 }}><span style={{ color: "var(--pr-fg-faint)" }}>출원일 </span><span className="mono">{patent.appDate}</span></div>
                  </div>
                  <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--pr-divider)" }}>
                    <div className="ctx-h" style={{ marginBottom: 8 }}>컨텍스트</div>
                    <div style={{ fontSize: 11, color: "var(--pr-fg-muted)", lineHeight: 1.5 }}>
                      • 명세서 전문 (약 12,000자)<br/>
                      • AI 요약 (7개 섹션)<br/>
                      • 청구항 본문
                    </div>
                  </div>
                </aside>
                <div style={{ position: "relative" }}>
                  <button className="dp-chat-modal-close" onClick={() => setModalOpen(false)}>
                    <PRIcon name="X" size={14}/>
                  </button>
                  <ChatPanel patent={patent} />
                </div>
              </div>
            </div>
          )}
        </React.Fragment>
      )}

      <div style={{
        position: "fixed", left: 20, bottom: 16,
        fontSize: 11, fontWeight: 600,
        color: "var(--pr-fg-faint)",
        background: "rgba(255,255,255,0.9)",
        padding: "4px 10px", borderRadius: 9999,
        border: "1px solid var(--pr-border)",
        zIndex: 10,
      }}>{variantBadge}{variant === "v1" && ` · 좌 ${leftW}px · 우 ${rightW}px`}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<DetailPage />);
