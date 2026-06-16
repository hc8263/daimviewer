"use client";
import React from "react";
import Link from "next/link";
import { PRIcon } from "./icons";
import { REVIEWERS, isReviewer } from "@/lib/review";

export type Crumb = string | { label: string; href: string };

function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  React.useEffect(() => {
    const t = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(t);
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("pr.theme", next); } catch {}
  };
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className="pr-iconbtn"
      onClick={toggle}
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      suppressHydrationWarning
    >
      <PRIcon name={isDark ? "Sun" : "Moon"} size={16} />
    </button>
  );
}

function ReviewerSelect() {
  const [reviewer, setReviewer] = React.useState("HW");
  React.useEffect(() => {
    const stored = localStorage.getItem("pr.reviewer");
    if (isReviewer(stored)) setReviewer(stored);
  }, []);
  const applyReviewer = (next: string) => {
    if (!isReviewer(next)) return;
    setReviewer(next);
    localStorage.setItem("pr.reviewer", next);
    window.dispatchEvent(new CustomEvent("pr:reviewer", { detail: next }));
  };
  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (!isReviewer(next) || next === reviewer) return;
    const password = window.prompt(`${next} 계정 비밀번호`);
    if (password == null) {
      e.target.value = reviewer;
      return;
    }
    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewer: next, password }),
    });
    if (!res.ok) {
      alert("비밀번호가 일치하지 않습니다.");
      e.target.value = reviewer;
      return;
    }
    applyReviewer(next);
  };
  const changePassword = async () => {
    const password = window.prompt(`${reviewer} 현재 비밀번호`);
    if (password == null) return;
    const nextPassword = window.prompt(`${reviewer} 새 비밀번호`);
    if (nextPassword == null) return;
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewer, password, nextPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "비밀번호 변경 실패");
      return;
    }
    alert("비밀번호가 변경되었습니다.");
  };
  return (
    <div className="pr-reviewer-control">
      <label className="pr-reviewer-select">
        <span>계정</span>
        <select value={reviewer} onChange={onChange} aria-label="검토 계정">
          {REVIEWERS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <button type="button" className="pr-iconbtn" onClick={changePassword} title="비밀번호 변경" aria-label="비밀번호 변경">
        <PRIcon name="Lock" size={15} />
      </button>
    </div>
  );
}

export function TopBar({ crumbs = [], rightExtra = null }: {
  crumbs?: Crumb[];
  rightExtra?: React.ReactNode;
}) {
  return (
    <header className="pr-topbar">
      <Link href="/" className="brand" style={{ marginRight: 4 }}>
        <span className="brand-mark" aria-hidden>다</span>
        <span className="brand-name">
          다임<span className="brand-name-accent">뷰어</span>
        </span>
      </Link>
      <div className="crumbs">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const label = typeof c === "string" ? c : c.label;
          const href = typeof c === "string" ? null : c.href;
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="sep"><PRIcon name="ChevronRight" size={12} /></span>}
              {href && !isLast ? (
                <Link href={href} className="crumb-link">{label}</Link>
              ) : (
                <span className={isLast ? "cur" : ""}>{label}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="spacer" />
      {rightExtra}
      <ThemeToggle />
      <ReviewerSelect />
      <Link href="/admin" className="pr-iconbtn" title="관리자 모드" aria-label="관리자 모드">
        <PRIcon name="Settings" size={16} />
      </Link>
    </header>
  );
}
