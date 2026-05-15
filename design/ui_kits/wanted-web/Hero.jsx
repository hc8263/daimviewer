// Hero — top section of the homepage. Wanted's actual hero is a giant carousel of brand
// gradients with category chips below; we render the chips strip + a single feature card.

const HeroStyles = {
  catBar: {
    background: "#fff",
    borderBottom: "1px solid var(--color-line-normal-normal)",
    position: "sticky",
    top: 50,
    zIndex: 40,
  },
  catInner: {
    display: "flex",
    gap: 4,
    height: 56,
    alignItems: "center",
    overflowX: "auto",
  },
  cat: {
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(46,47,51,0.88)",
    padding: "0 14px",
    height: 36,
    borderRadius: 9999,
    display: "inline-flex",
    alignItems: "center",
    background: "transparent",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  },
  catActive: {
    color: "#fff",
    background: "#000",
  },
  banner: {
    background: "linear-gradient(135deg,#0066FF 0%,#005EEB 50%,#003E9C 100%)",
    color: "#fff",
    borderRadius: 24,
    padding: "40px 48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
    margin: "24px 0",
  },
  bannerEyebrow: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "rgba(255,255,255,0.74)",
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: "-0.022em",
    marginBottom: 8,
  },
  bannerSub: {
    fontSize: 15,
    fontWeight: 500,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 1.6,
  },
  bannerBtn: {
    marginTop: 20,
    background: "#fff",
    color: "#0066FF",
    border: "none",
    fontSize: 14,
    fontWeight: 700,
    height: 40,
    padding: "0 18px",
    borderRadius: 9999,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
    width: "fit-content",
  },
  glyph: {
    position: "absolute",
    right: -40,
    top: -40,
    bottom: -40,
    width: 320,
    opacity: 0.18,
  },
};

function Hero({ category, setCategory }) {
  const cats = [
    "전체", "개발", "경영·비즈니스", "마케팅·광고", "디자인",
    "영업", "고객서비스·리테일", "미디어", "엔지니어링·설계",
    "HR", "금융", "제조·생산", "의료·제약·바이오", "교육",
  ];
  return (
    <React.Fragment>
      <div style={HeroStyles.catBar}>
        <div className="wide-container" style={HeroStyles.catInner}>
          {cats.map(c => (
            <button key={c}
              onClick={() => setCategory(c)}
              style={{...HeroStyles.cat, ...(category === c ? HeroStyles.catActive : {})}}>{c}</button>
          ))}
        </div>
      </div>
      <div className="wide-container">
        <div style={HeroStyles.banner}>
          <div style={{ maxWidth: 540, position: "relative", zIndex: 1 }}>
            <div style={HeroStyles.bannerEyebrow}>WANTED AGENT · NEW</div>
            <div style={HeroStyles.bannerTitle}>나만의 채용 에이전트가{"\n"}딱 맞는 공고를 찾아드립니다</div>
            <div style={HeroStyles.bannerSub}>이력서 한 번 등록으로, 매주 맞춤 추천 공고와 면접 인사이트를 받아보세요.</div>
            <button style={HeroStyles.bannerBtn}>지금 시작하기 <IC.ChevronRight size={16} color="#0066FF"/></button>
          </div>
          <svg viewBox="0 0 200 200" style={HeroStyles.glyph} fill="#fff">
            <circle cx="100" cy="100" r="98" fill="none" stroke="#fff" strokeWidth="1"/>
            <circle cx="100" cy="100" r="60" fill="none" stroke="#fff" strokeWidth="1"/>
            <circle cx="100" cy="100" r="22" fill="#fff"/>
          </svg>
        </div>
      </div>
    </React.Fragment>
  );
}

window.Hero = Hero;
