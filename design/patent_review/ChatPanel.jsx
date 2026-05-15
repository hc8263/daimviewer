// Chat panel — shared by all 3 variants
function ChatPanel({ patent, showHeader = true }) {
  const SAMPLE_CONVOS = {
    "KR-10-2023-0089421": [
      { role: "user", text: "청구항 1의 핵심 한정 사항은 무엇인가요?" },
      { role: "ai", text: "청구항 1은 **B4C 보호층의 두께(8~12nm)** 와 **다층 그래핀 코어(3~5층, 1.5~2.5nm)** 를 동시에 한정하고 있습니다.\n\n주요 한정 요소:\n1. 보호층 재료가 보론 카바이드(B4C)로 특정됨\n2. 두께 범위 8~12nm가 좁게 한정됨\n3. 그래핀 적층 수와 두께 범위가 함께 한정됨\n\n회피 설계 시 위 세 요소 중 하나를 다르게 구성하는 접근이 필요합니다." },
      { role: "user", text: "B4C 대신 다른 보호층을 쓰면 회피 가능한가요?" },
      { role: "ai", text: "**부분적으로 가능**하지만 주의가 필요합니다.\n\n청구항 1은 B4C를 명시하지만, 명세서 본문(15페이지)에는 \"B4C는 일례이며 SiC, BN 등으로 대체 가능\"이라는 언급이 있습니다. 이는 균등론(doctrine of equivalents) 침해 주장 시 근거가 될 수 있습니다.\n\n안전한 회피를 위해서는:\n- 보호층 재료를 명세서에 언급되지 않은 신규 화합물(예: TiAlN, AlON)로 변경\n- 두께 범위도 함께 변경 (5nm 이하 또는 15nm 이상)\n- 그래핀 적층 수도 차별화\n\n자세한 검토는 변리사 상담을 권합니다." },
    ],
    "US-2024-0118233-A1": [
      { role: "user", text: "어닐링 관련해서 청구항의 핵심 한정 사항은 뭔가요?" },
      { role: "ai", text: "청구항 1은 **400℃ 이하, N₂ 분위기, 5분간 후속 어닐링** 단계를 한정하고 있습니다.\n\n이 한정은 매우 중요한데:\n- 일반적인 HfO₂ 어닐링은 500~600℃를 요구함\n- 저온 한정 사항이 **BEOL(back-end-of-line) 호환성**을 확보하는 핵심\n- 표현이 광범위해서 — N₂ 분위기에서 400℃ 이하·약 5분이면 침해 가능성이 있음\n\n**권장:** 400℃ 초과로 어닐링하거나, N₂가 아닌 다른 분위기(예: forming gas, 진공)를 사용하면 회피 설계 경로가 열립니다." },
      { role: "user", text: "ALD 사이클 비율 1:8 한정은 얼마나 좁게 해석되나요?" },
      { role: "ai", text: "청구항 1에서 **HfO₂:Al₂O₃ = 1:8** 나노라미네이트 비율은 비교적 좁은 한정입니다.\n\n명세서 본문(8페이지)에는 \"1:5 ~ 1:10 범위에서 비정질 안정성이 관찰되었으나, 1:8이 최적\"이라고 기재되어 있습니다. 따라서:\n\n- **회피 가능 범위**: 1:3 이하 또는 1:12 이상 비율은 명세서가 \"비정질 안정성이 관찰되지 않은 영역\"으로 분류 → 비교적 안전\n- **균등론 위험 영역**: 1:5 ~ 1:10 — 비율을 미세 조정해도 균등 침해 주장 가능\n- 어닐링 온도 한정과 함께 두 요소를 동시에 다르게 가져가는 설계가 가장 안전합니다." },
    ],
  };

  const initialMessages = SAMPLE_CONVOS[patent.wipsonKey] || [];
  const [messages, setMessages] = React.useState(initialMessages);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    setMessages(SAMPLE_CONVOS[patent.wipsonKey] || []);
  }, [patent.wipsonKey]);

  const suggestions = [
    "청구항 1의 핵심 한정 사항은?",
    "선행 특허와의 차별점은?",
    "회피 설계 방법을 알려줘",
    "당사 기술과 충돌하는 부분?",
  ];

  const send = (text) => {
    if (!text.trim()) return;
    setMessages(m => [
      ...m,
      { role: "user", text },
      { role: "ai", text: "(이 프로토타입에서는 실제 응답이 없습니다.\n실제 환경에서는 Claude Haiku 4.5가 명세서 전문을 컨텍스트로 답변합니다.)" },
    ]);
    setDraft("");
  };

  return (
    <div className="chat-shell">
      {showHeader && (
        <div className="chat-header">
          <PRIcon name="Bot" size={16} color="#0066FF"/>
          AI 검토 도우미
          <span className="badge">BETA</span>
          <span className="model">claude-haiku-4-5</span>
          <button className="pr-iconbtn" title="대화 새로 시작"><PRIcon name="RefreshCw" size={13}/></button>
        </div>
      )}

      <div className="chat-msgs">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="glyph"><PRIcon name="Sparkles" size={18}/></span>
            <h3>이 특허에 대해 무엇이든 물어보세요</h3>
            <p>명세서 전문과 요약을 근거로 답변합니다.<br/>근거가 없는 내용은 답변하지 않습니다.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-row ${m.role}`}>
            <span className={`chat-avatar ${m.role}`}>
              {m.role === "user" ? "박" : <PRIcon name="Bot" size={14} color="#fff"/>}
            </span>
            <div>
              <div className="chat-bubble" dangerouslySetInnerHTML={{
                __html: m.text
                  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
                  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n\n/g, "</p><p style='margin:6px 0 0 0'>")
                  .replace(/\n/g, "<br/>")
              }} />
            </div>
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="chat-suggestions">
          {suggestions.map(s => (
            <button key={s} className="chat-suggestion" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <div className="chat-input-wrap">
          <textarea
            rows={1}
            placeholder="이 특허에 대해 질문하기… (Shift+Enter 줄바꿈)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); }
            }}
          />
          <button className="send" disabled={!draft.trim()} onClick={() => send(draft)}>
            <PRIcon name="ArrowUp" size={14} color={draft.trim() ? "#fff" : "currentColor"}/>
          </button>
        </div>
        <div className="chat-input-tips">
          <span>Enter 전송 · Shift+Enter 줄바꿈</span>
          <span style={{ marginLeft: "auto" }}>컨텍스트: 명세서 전문 + 요약</span>
        </div>
      </div>
    </div>
  );
}
window.ChatPanel = ChatPanel;
