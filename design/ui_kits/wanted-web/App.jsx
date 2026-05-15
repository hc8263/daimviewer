// App — top-level glue
function App() {
  const [route, setRoute] = React.useState("home");
  const [signedIn, setSignedIn] = React.useState(true);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [activeJob, setActiveJob] = React.useState(null);
  const [saved, setSaved] = React.useState([1, 5]);
  const [category, setCategory] = React.useState("전체");

  const toggleSave = (idx) => {
    setSaved(s => s.includes(idx) ? s.filter(i => i !== idx) : [...s, idx]);
  };

  const openDetail = (job) => {
    setActiveJob(job);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="app">
      <TopNav
        route={activeJob ? "detail" : route}
        setRoute={(r) => { setActiveJob(null); setRoute(r); }}
        signedIn={signedIn}
        setSignedIn={setSignedIn}
        onOpenProfile={() => setProfileOpen(true)}
      />
      {!activeJob && (
        <React.Fragment>
          <Hero category={category} setCategory={setCategory} />
          <JobGrid onOpen={openDetail} saved={saved} toggleSave={toggleSave} category={category} />
        </React.Fragment>
      )}
      {activeJob && (
        <JobDetail
          job={activeJob}
          onBack={() => setActiveJob(null)}
          saved={saved.includes(activeJob.idx)}
          onToggleSave={() => toggleSave(activeJob.idx)}
        />
      )}
      <ProfileMenu
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSignOut={() => setSignedIn(false)}
      />
      <footer style={{
        background: "#171719",
        color: "rgba(255,255,255,0.61)",
        fontSize: 12,
        padding: "40px 0",
        marginTop: 40,
      }}>
        <div className="wide-container">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, color: "#fff" }}>
            <WantedLogo width={86} />
          </div>
          <div>(주)원티드랩 · 대표: 이복기 · 사업자등록번호 219-86-00077</div>
          <div style={{ marginTop: 6 }}>서울특별시 강남구 강남대로 374 (역삼동, 케이스퀘어강남2) · © Wanted Lab Inc.</div>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
