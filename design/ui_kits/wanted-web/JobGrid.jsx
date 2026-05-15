// JobGrid — the homepage listing
const JOBS = [
  { idx: 0, title: "프로덕트 디자이너 (Senior)", company: "원티드랩", location: "서울 · 강남구", career: "5년+", reward: 1000, badge: "신규" },
  { idx: 1, title: "시니어 프론트엔드 엔지니어", company: "토스", location: "서울 · 강남구", career: "5년+", reward: 1500, badge: "MD's PICK" },
  { idx: 2, title: "백엔드 개발자 (Kotlin)", company: "당근마켓", location: "서울 · 서초구", career: "3년+", reward: 800 },
  { idx: 3, title: "데이터 엔지니어", company: "쿠팡", location: "서울 · 송파구", career: "3년+", reward: 1200, badge: "응답률 90%" },
  { idx: 4, title: "UX 리서처", company: "우아한형제들", location: "서울 · 송파구", career: "신입~3년", reward: 500 },
  { idx: 5, title: "Product Manager · AI", company: "Wanted Lab", location: "서울 · 강남구", career: "5년+", reward: 1300, badge: "Hot" },
  { idx: 6, title: "iOS 개발자 (Swift)", company: "네이버페이", location: "성남 · 분당구", career: "3년+", reward: 700 },
  { idx: 7, title: "그로스 마케터", company: "리디", location: "서울 · 강남구", career: "3년+", reward: 600 },
  { idx: 8, title: "DevOps 엔지니어", company: "라인페이", location: "서울 · 마포구", career: "5년+", reward: 1100 },
  { idx: 9, title: "콘텐츠 디자이너", company: "29CM", location: "서울 · 성수동", career: "신입~3년", reward: 400 },
  { idx: 10, title: "AI/ML 엔지니어", company: "스캐터랩", location: "서울 · 강남구", career: "3년+", reward: 1400, badge: "신규" },
  { idx: 11, title: "기술 PM (Tech PM)", company: "야놀자", location: "서울 · 강남구", career: "5년+", reward: 950 },
];

const GridStyles = {
  wrap: { padding: "32px 0 80px 0" },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  h: {
    fontSize: 22,
    fontWeight: 700,
    color: "#000",
    letterSpacing: "-0.019em",
    whiteSpace: "nowrap",
  },
  count: {
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(55,56,60,0.61)",
    marginLeft: 8,
    whiteSpace: "nowrap",
  },
  filterRow: {
    display: "flex",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  filter: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "#fff",
    border: "1px solid var(--color-line-normal-normal)",
    color: "rgba(46,47,51,0.88)",
    fontSize: 13,
    fontWeight: 600,
    height: 36,
    padding: "0 14px",
    borderRadius: 9999,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20,
    rowGap: 32,
  },
};

function JobGrid({ onOpen, saved, toggleSave, category }) {
  const filtered = category === "전체" || !category ? JOBS : JOBS.filter(j => /* simple heuristic */ true);
  return (
    <div style={GridStyles.wrap}>
      <div className="wide-container">
        <div style={GridStyles.header}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
            <span style={GridStyles.h}>이런 포지션은 어때요?</span>
            <span style={GridStyles.count}>채용 중 {filtered.length}개</span>
          </div>
          <button style={GridStyles.filter}>
            <IC.Filter size={14}/> 필터 <IC.ChevronDown size={14}/>
          </button>
        </div>
        <div style={GridStyles.filterRow}>
          <button style={GridStyles.filter}>경력 <IC.ChevronDown size={14}/></button>
          <button style={GridStyles.filter}>지역 <IC.ChevronDown size={14}/></button>
          <button style={GridStyles.filter}>연봉 <IC.ChevronDown size={14}/></button>
          <button style={GridStyles.filter}>회사규모 <IC.ChevronDown size={14}/></button>
          <button style={{...GridStyles.filter, color:"#0066FF", borderColor:"#0066FF"}}>
            <IC.Sparkles size={14} color="#0066FF"/> AI 추천 켜기
          </button>
        </div>
        <div style={GridStyles.grid}>
          {filtered.map(j => (
            <JobCard key={j.idx} job={j} onClick={() => onOpen(j)}
                     saved={saved.includes(j.idx)}
                     onToggleSave={() => toggleSave(j.idx)} />
          ))}
        </div>
      </div>
    </div>
  );
}

window.JobGrid = JobGrid;
window.JOBS = JOBS;
