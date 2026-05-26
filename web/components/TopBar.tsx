"use client";
import React from "react";
import Link from "next/link";
import { PRIcon } from "./icons";

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
      <span className="pr-userchip">
        USER
      </span>
      <Link href="/admin" className="pr-iconbtn" title="관리자 모드" aria-label="관리자 모드">
        <PRIcon name="Settings" size={16} />
      </Link>
    </header>
  );
}
