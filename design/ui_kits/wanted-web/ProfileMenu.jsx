// ProfileMenu — dropdown when "signed in"
const PMStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "transparent",
    zIndex: 100,
  },
  menu: {
    position: "fixed",
    top: 56,
    right: 24,
    width: 280,
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0px 16px 24px -6px rgba(23,23,23,0.08),0px 6px 10px -4px rgba(23,23,23,0.08)",
    border: "1px solid var(--color-line-normal-normal)",
    padding: 8,
    zIndex: 101,
  },
  header: {
    padding: "12px 12px 16px 12px",
    borderBottom: "1px solid var(--color-line-normal-alternative)",
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 700,
    color: "#000",
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
    fontWeight: 500,
    color: "rgba(55,56,60,0.61)",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 40,
    padding: "0 12px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(46,47,51,0.88)",
    cursor: "pointer",
  },
  badge: {
    marginLeft: "auto",
    background: "#0066FF",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 9999,
  },
  divider: {
    height: 1,
    background: "var(--color-line-normal-alternative)",
    margin: "8px 0",
  },
};

function PMItem({ icon: Icon, label, badge, danger, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{
      ...PMStyles.item,
      background: hover ? "rgba(112,115,124,0.05)" : "transparent",
      color: danger ? "#FF4242" : PMStyles.item.color,
    }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Icon size={18} color={danger ? "#FF4242" : "rgba(46,47,51,0.88)"} />
      {label}
      {badge && <span style={PMStyles.badge}>{badge}</span>}
    </div>
  );
}

function ProfileMenu({ open, onClose, onSignOut }) {
  if (!open) return null;
  return (
    <React.Fragment>
      <div style={PMStyles.overlay} onClick={onClose} />
      <div style={PMStyles.menu}>
        <div style={PMStyles.header}>
          <div style={PMStyles.name}>길형진 (Hyungjin Kil)</div>
          <div style={PMStyles.email}>hyungjin@wanted.co.kr</div>
        </div>
        <PMItem icon={IC.User} label="이력서 관리" />
        <PMItem icon={IC.Briefcase} label="지원한 공고" badge="3" />
        <PMItem icon={IC.Bookmark} label="저장한 공고" />
        <PMItem icon={IC.MessageSquare} label="받은 제안" badge="17" />
        <PMItem icon={IC.Sparkles} label="Wanted Agent" />
        <div style={PMStyles.divider} />
        <PMItem icon={IC.Settings} label="환경 설정" />
        <PMItem icon={IC.LogOut} label="로그아웃" danger onClick={() => { onSignOut(); onClose(); }} />
      </div>
    </React.Fragment>
  );
}

window.ProfileMenu = ProfileMenu;
