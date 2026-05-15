// JobCard — the core product cell. Mirrors Wanted's standard listing card: thumbnail,
// title (job position), company name, location, channel (reward amount in KRW).

const JobCardStyles = {
  card: {
    background: "#fff",
    borderRadius: 12,
    cursor: "pointer",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    transition: "transform .15s ease, box-shadow .15s ease",
  },
  thumb: {
    height: 200,
    background: "#EAEBEC",
    position: "relative",
    overflow: "hidden",
  },
  bookmark: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "rgba(0,0,0,0.45)",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
  },
  body: {
    padding: "14px 4px 0 4px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#000",
    letterSpacing: "-0.005em",
    lineHeight: 1.4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    minHeight: 42,
  },
  co: {
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(46,47,51,0.88)",
  },
  meta: {
    fontSize: 12,
    fontWeight: 500,
    color: "rgba(55,56,60,0.61)",
  },
  reward: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid var(--color-line-normal-normal)",
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(46,47,51,0.61)",
    display: "flex",
    justifyContent: "space-between",
  },
  rewardVal: {
    color: "#005EEB",
  },
};

const gradients = [
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

function JobCard({ job, onClick, saved, onToggleSave }) {
  const grad = gradients[job.idx % gradients.length];
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{...JobCardStyles.card,
                 transform: hover ? "translateY(-2px)" : "none",
                 boxShadow: hover ? "0 10px 15px -3px rgba(23,23,23,0.07),0 4px 6px -2px rgba(0,0,0,0.07)" : "none"}}
         onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
         onClick={onClick}>
      <div style={{...JobCardStyles.thumb, background: grad}}>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0.9, color: "#fff",
        }}>
          <div style={{
            fontSize: 56, fontWeight: 900, letterSpacing: "-0.04em",
            opacity: 0.18, transform: "translateY(-6px)",
            fontFamily: "var(--font-family-base)",
          }}>{job.company.slice(0, 2)}</div>
        </div>
        <button style={JobCardStyles.bookmark} onClick={(e) => { e.stopPropagation(); onToggleSave?.(); }}>
          {saved ? <IC.BookmarkFill size={16} color="#fff"/> : <IC.Bookmark size={16} color="#fff"/>}
        </button>
        {job.badge && (
          <div style={{
            position: "absolute", top: 12, left: 12,
            background: "#fff", color: "#000",
            padding: "4px 8px", borderRadius: 6,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", whiteSpace: "nowrap",
          }}>{job.badge}</div>
        )}
      </div>
      <div style={JobCardStyles.body}>
        <div style={JobCardStyles.title}>{job.title}</div>
        <div style={JobCardStyles.co}>{job.company}</div>
        <div style={JobCardStyles.meta}>{job.location} · {job.career}</div>
        <div style={JobCardStyles.reward}>
          <span>채용보상금</span>
          <span style={JobCardStyles.rewardVal}>{job.reward.toLocaleString()}만원</span>
        </div>
      </div>
    </div>
  );
}

window.JobCard = JobCard;
