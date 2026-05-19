// Lucide-style inline icons — ported from design/patent_review/icons.jsx.
import React from "react";

const icPaths: Record<string, string[]> = {
  Search:      ["M21 21l-4.3-4.3", "M19 11a8 8 0 11-16 0 8 8 0 0116 0z"],
  ChevronDown: ["M6 9l6 6 6-6"],
  ChevronRight:["M9 6l6 6-6 6"],
  ChevronLeft: ["M15 6l-6 6 6 6"],
  ChevronUp:   ["M18 15l-6-6-6 6"],
  X:           ["M18 6L6 18", "M6 6l12 12"],
  Plus:        ["M12 5v14", "M5 12h14"],
  Filter:      ["M22 3H2l8 9.5V19l4 2v-8.5L22 3z"],
  ExternalLink:["M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6", "M15 3h6v6", "M10 14L21 3"],
  Send:        ["M22 2L11 13", "M22 2l-7 20-4-9-9-4 20-7z"],
  Sparkles:    ["M12 3l1.9 4.7L19 9.6l-4.7 1.9L12 16l-2.3-4.5L5 9.6l5.1-1.9L12 3z", "M5 17l1 2.5 2.5 1-2.5 1L5 24l-1-2.5L1.5 20.5l2.5-1L5 17z"],
  Bot:         ["M12 8V4H8", "M16 4h-4", "M20 8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 012-2h16z", "M9 13v.01", "M15 13v.01"],
  Check:       ["M20 6L9 17l-5-5"],
  CheckCircle: ["M22 11.08V12a10 10 0 11-5.93-9.14", "M22 4L12 14.01l-3-3"],
  HelpCircle:  ["M12 22a10 10 0 100-20 10 10 0 000 20z", "M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3", "M12 17h.01"],
  XCircle:     ["M12 22a10 10 0 100-20 10 10 0 000 20z", "M15 9l-6 6", "M9 9l6 6"],
  Circle:      ["M12 22a10 10 0 100-20 10 10 0 000 20z"],
  More:        ["M12 13a1 1 0 100-2 1 1 0 000 2z", "M19 13a1 1 0 100-2 1 1 0 000 2z", "M5 13a1 1 0 100-2 1 1 0 000 2z"],
  Copy:        ["M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z", "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"],
  RefreshCw:   ["M23 4v6h-6", "M1 20v-6h6", "M3.51 9a9 9 0 0114.85-3.36L23 10", "M1 14l4.64 4.36A9 9 0 0020.49 15"],
  Maximize:    ["M3 9V3h6", "M15 3h6v6", "M21 15v6h-6", "M9 21H3v-6"],
  Minimize:    ["M9 3v6H3", "M21 9h-6V3", "M3 15h6v6", "M15 21v-6h6"],
  ArrowUp:     ["M12 19V5", "M5 12l7-7 7 7"],
  Bookmark:    ["M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"],
  Settings:    [
    "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
    "M12 15a3 3 0 100-6 3 3 0 000 6z",
  ],
  Star:        ["M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"],
  MessageSquare: ["M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"],
  Info:        ["M12 22a10 10 0 100-20 10 10 0 000 20z", "M12 16v-4", "M12 8h.01"],
  Trash:       ["M3 6h18", "M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2", "M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"],
  Upload:      ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
  Lock:        ["M5 11h14v10H5z", "M8 11V7a4 4 0 018 0v4"],
};

export function PRIcon({ name, size = 16, color = "currentColor", strokeWidth = 1.7, style }: {
  name: string; size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties;
}) {
  const paths = icPaths[name] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round"
         style={{ display: "block", flexShrink: 0, ...(style || {}) }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export function FlagBadge({ country }: { country: string }) {
  const map: Record<string, { bg: string; border: string; text: string; label: string }> = {
    KR: { bg: "#fff", border: "#C2C4C8", text: "#000", label: "KR" },
    US: { bg: "#fff", border: "#C2C4C8", text: "#000", label: "US" },
    JP: { bg: "#fff", border: "#C2C4C8", text: "#000", label: "JP" },
    CN: { bg: "#fff", border: "#C2C4C8", text: "#000", label: "CN" },
    DE: { bg: "#fff", border: "#C2C4C8", text: "#000", label: "DE" },
    EP: { bg: "#fff", border: "#C2C4C8", text: "#000", label: "EP" },
  };
  const s = map[country] || { ...map.KR, label: country || "??" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 22, height: 16, borderRadius: 3,
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 9, fontWeight: 700, color: s.text,
      letterSpacing: "0.02em",
      fontFamily: "var(--font-family-mono)",
    }}>{s.label}</span>
  );
}

export function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) {
    return (
      <span className="pr-pill" style={{
        background: "transparent",
        color: "var(--pr-fg-faint)",
        border: "1px dashed var(--pr-border)",
      }}>
        <span className="dot" style={{ background: "var(--pr-fg-faint)", opacity: 0.5 }} />미검토
      </span>
    );
  }
  const map: Record<string, { fg: string; bg: string; dot: string; label: string }> = {
    relevant:   { fg: "#005EEB", bg: "#EAF2FE", dot: "#0066FF", label: "관련" },
    maybe:      { fg: "#9C5800", bg: "#FEF4E6", dot: "#FF9200", label: "보류" },
    irrelevant: { fg: "#5A5C63", bg: "#EAEBEC", dot: "#878A93", label: "무관" },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className="pr-pill" style={{ background: s.bg, color: s.fg }}>
      <span className="dot" style={{ background: s.dot }} />{s.label}
    </span>
  );
}

export function WantedMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1272 869" fill="currentColor" style={{ display: "block" }}>
      <path d="M 442 869 C 477 869 508 841 508 797 L 508 457 L 413 457 L 413 716 C 413 724 406 726 401 721 L 147 470 C 141 463 144 457 153 457 L 781 457 L 781 362 L 73 362 C 28 362 0 393 0 429 C 0 446 7 464 24 481 L 389 846 C 405 863 424 869 442 869 Z M 1026 853 C 1161 853 1272 742 1272 607 C 1272 472 1161 362 1026 362 L 876 362 L 876 457 L 1026 457 C 1107 457 1177 523 1177 607 C 1177 691 1108 758 1026 758 C 944 758 876 689 876 607 L 876 82 C 876 35 840 0 794 0 L 496 0 C 448 0 413 36 413 83 L 413 362 L 508 362 L 508 106 C 508 100 512 95 518 95 L 770 95 C 776 95 781 100 781 106 L 781 607 C 781 742 891 853 1026 853 Z" />
    </svg>
  );
}
