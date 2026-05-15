// JobDetail — single posting view
const DetailStyles = {
  wrap: { padding: "32px 0 80px 0" },
  back: {
    background: "transparent",
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(55,56,60,0.61)",
    padding: "0 0 16px 0",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  hero: {
    borderRadius: 16,
    height: 320,
    marginBottom: 32,
    overflow: "hidden",
    position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  heroGlyph: {
    fontSize: 96, fontWeight: 900, color: "rgba(255,255,255,0.18)", letterSpacing: "-0.04em",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 40,
    alignItems: "start",
  },
  h1: {
    fontSize: 28,
    fontWeight: 700,
    color: "#000",
    letterSpacing: "-0.0236em",
    marginBottom: 8,
  },
  co: {
    fontSize: 16,
    fontWeight: 600,
    color: "#0066FF",
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(55,56,60,0.61)",
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionH: {
    fontSize: 18,
    fontWeight: 700,
    color: "#000",
    letterSpacing: "-0.002em",
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "rgba(46,47,51,0.88)",
    fontWeight: 500,
    whiteSpace: "pre-line",
  },
  bullet: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "rgba(46,47,51,0.88)",
    fontWeight: 500,
    paddingLeft: 14,
    position: "relative",
  },
  bulletDot: {
    position: "absolute",
    left: 0, top: "0.8em",
    width: 4, height: 4, borderRadius: "50%",
    background: "rgba(46,47,51,0.5)",
  },
  side: {
    position: "sticky",
    top: 132,
    background: "#fff",
    border: "1px solid var(--color-line-normal-normal)",
    borderRadius: 16,
    padding: 24,
    display: "flex", flexDirection: "column", gap: 12,
  },
  rewardLabel: { fontSize: 13, fontWeight: 600, color: "rgba(55,56,60,0.61)" },
  rewardVal: { fontSize: 24, fontWeight: 700, color: "#0066FF", letterSpacing: "-0.023em" },
  rewardSub: { fontSize: 12, fontWeight: 500, color: "rgba(55,56,60,0.61)" },
  apply: {
    background: "#0066FF", color: "#fff", border: "none",
    height: 52, borderRadius: 12,
    fontSize: 16, fontWeight: 700,
    marginTop: 4,
  },
  share: {
    background: "#fff", color: "rgba(46,47,51,0.88)",
    border: "1px solid var(--color-line-normal-normal)",
    height: 44, borderRadius: 12,
    fontSize: 14, fontWeight: 700,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  },
  meta2: {
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(55,56,60,0.61)",
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: "1px solid var(--color-line-normal-alternative)",
  },
  meta2v: { color: "#000", fontWeight: 600 },
};

const gradMap = [
  "linear-gradient(135deg,#0066FF,#005EEB)",
  "linear-gradient(135deg,#00BF40,#006E25)",
  "linear-gradient(135deg,#FF5E00,#943600)",
  "linear-gradient(135deg,#6541F2,#3A16C9)",
  "linear-gradient(135deg,#FF4242,#B20C0C)",
  "linear-gradient(135deg,#00BDDE,#006F82)",
  "linear-gradient(135deg,#171719,#46474C)",
  "linear-gradient(135deg,#FF9200,#9C5800)",
  "linear-gradient(135deg,#CB59FF,#580A7D)",
];

function JobDetail({ job, onBack, saved, onToggleSave }) {
  const grad = gradMap[job.idx % gradMap.length];
  return (
    <div style={DetailStyles.wrap}>
      <div className="container">
        <button style={DetailStyles.back} onClick={onBack}>
          <IC.ChevronLeft size={16}/> 채용 공고로 돌아가기
        </button>
        <div style={{...DetailStyles.hero, background: grad}}>
          <div style={DetailStyles.heroGlyph}>{job.company}</div>
        </div>
        <div style={DetailStyles.twoCol}>
          <div>
            <div style={DetailStyles.co}>{job.company}</div>
            <h1 style={DetailStyles.h1}>{job.title}</h1>
            <div style={DetailStyles.meta}>{job.location} · {job.career} · 정규직</div>

            <section style={DetailStyles.section}>
              <h2 style={DetailStyles.sectionH}>주요업무</h2>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={DetailStyles.bullet}><span style={DetailStyles.bulletDot}/>사용자 리서치 결과를 바탕으로 핵심 사용자 흐름을 설계합니다.</div>
                <div style={DetailStyles.bullet}><span style={DetailStyles.bulletDot}/>디자인 시스템에 기여하며 일관된 사용자 경험을 만들어갑니다.</div>
                <div style={DetailStyles.bullet}><span style={DetailStyles.bulletDot}/>엔지니어, PM과 긴밀하게 협업하여 빠른 출시를 만들어냅니다.</div>
                <div style={DetailStyles.bullet}><span style={DetailStyles.bulletDot}/>출시 이후 데이터 분석을 통해 가설을 검증하고 다음 시도를 정의합니다.</div>
              </div>
            </section>

            <section style={DetailStyles.section}>
              <h2 style={DetailStyles.sectionH}>자격요건</h2>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={DetailStyles.bullet}><span style={DetailStyles.bulletDot}/>{job.career} 프로덕트 디자인 또는 UX 디자인 경험이 있으신 분</div>
                <div style={DetailStyles.bullet}><span style={DetailStyles.bulletDot}/>Figma를 활용한 디자인 시스템 운영 경험</div>
                <div style={DetailStyles.bullet}><span style={DetailStyles.bulletDot}/>모바일·웹 양쪽 모두에서 production 단계의 디자인 경험</div>
              </div>
            </section>

            <section style={DetailStyles.section}>
              <h2 style={DetailStyles.sectionH}>우대사항</h2>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={DetailStyles.bullet}><span style={DetailStyles.bulletDot}/>HTML/CSS 등 프론트엔드 기본기를 보유하신 분</div>
                <div style={DetailStyles.bullet}><span style={DetailStyles.bulletDot}/>스타트업 또는 빠르게 성장하는 조직에서의 협업 경험</div>
              </div>
            </section>
          </div>

          <aside style={DetailStyles.side}>
            <div style={DetailStyles.rewardLabel}>채용보상금</div>
            <div style={{display:"flex",gap:16,alignItems:"baseline"}}>
              <div>
                <div style={DetailStyles.rewardLabel}>지원자</div>
                <div style={DetailStyles.rewardVal}>{(job.reward*0.5).toLocaleString()}만원</div>
              </div>
              <div>
                <div style={DetailStyles.rewardLabel}>추천인</div>
                <div style={DetailStyles.rewardVal}>{(job.reward*0.5).toLocaleString()}만원</div>
              </div>
            </div>
            <div style={DetailStyles.rewardSub}>합격 시 90일 이상 재직 시 지급됩니다.</div>
            <button style={DetailStyles.apply}>지원하기</button>
            <div style={{display:"flex",gap:8}}>
              <button style={{...DetailStyles.share,flex:1}} onClick={onToggleSave}>
                {saved ? <IC.BookmarkFill size={16} color="#0066FF"/> : <IC.Bookmark size={16}/>} {saved ? "저장됨" : "저장"}
              </button>
              <button style={{...DetailStyles.share,flex:1}}>
                <IC.Share size={16}/> 공유
              </button>
            </div>
            <div style={{marginTop:8}}>
              <div style={DetailStyles.meta2}><span>마감일</span><span style={DetailStyles.meta2v}>상시채용</span></div>
              <div style={DetailStyles.meta2}><span>고용 형태</span><span style={DetailStyles.meta2v}>정규직</span></div>
              <div style={DetailStyles.meta2}><span>회사 규모</span><span style={DetailStyles.meta2v}>100~500명</span></div>
              <div style={{...DetailStyles.meta2,borderBottom:"none"}}><span>응답률</span><span style={DetailStyles.meta2v}>90%</span></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

window.JobDetail = JobDetail;
